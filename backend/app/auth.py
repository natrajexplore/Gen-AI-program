"""Single-admin login (signed session cookie) and simple per-IP rate limiting.

Settings come from the environment (.env):
  ADMIN_PASSWORD   required to use the content studio; if unset, studio endpoints are disabled
  SESSION_SECRET   signs session cookies; if unset, a random one is used and sessions end on restart
  COOKIE_SECURE    "true" to mark the cookie Secure (set this when serving over HTTPS)
"""
import hashlib
import hmac
import os
import secrets
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

COOKIE = "netverse_admin"
SESSION_TTL = 12 * 3600
_fallback_secret = secrets.token_hex(32)


def _secret() -> bytes:
    return (os.environ.get("SESSION_SECRET") or _fallback_secret).encode()


def make_token(now: float | None = None) -> str:
    expires = str(int((now or time.time()) + SESSION_TTL))
    sig = hmac.new(_secret(), b"admin:" + expires.encode(), hashlib.sha256).hexdigest()
    return f"{expires}.{sig}"


def valid_token(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    expires, sig = token.split(".", 1)
    good = hmac.new(_secret(), b"admin:" + expires.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, good) and expires.isdigit() and int(expires) > time.time()


def password_ok(candidate: str) -> bool:
    expected = os.environ.get("ADMIN_PASSWORD", "")
    return bool(expected) and hmac.compare_digest(candidate.encode(), expected.encode())


def cookie_secure() -> bool:
    return os.environ.get("COOKIE_SECURE", "").lower() in ("1", "true", "yes")


def require_admin(request: Request) -> None:
    """FastAPI dependency for studio endpoints."""
    if not os.environ.get("ADMIN_PASSWORD"):
        raise HTTPException(503, "The content studio is disabled: set ADMIN_PASSWORD in .env and restart the API.")
    if not valid_token(request.cookies.get(COOKIE)):
        raise HTTPException(401, "Log in to use the content studio.")


class RateLimiter:
    """Sliding window: at most `limit` hits per `window` seconds per key (client IP). In-memory, per process."""

    def __init__(self, limit: int, window: float):
        self.limit, self.window = limit, window
        self.hits: dict[str, deque] = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key: str, record: bool = True) -> tuple[bool, int]:
        """Returns (allowed, seconds until the next hit would be allowed); records the hit unless record=False."""
        now = time.monotonic()
        with self.lock:
            q = self.hits[key]
            while q and q[0] <= now - self.window:
                q.popleft()
            if len(q) >= self.limit:
                return False, int(q[0] + self.window - now) + 1
            if record:
                q.append(now)
            return True, 0


def client_ip(request: Request) -> str:
    # Behind a reverse proxy, run uvicorn with --proxy-headers so this is the real client address.
    return request.client.host if request.client else "unknown"


def tutor_limiter() -> RateLimiter:
    limit = int(os.environ.get("TUTOR_RATE_LIMIT", "20"))
    window = int(os.environ.get("TUTOR_RATE_WINDOW", "600"))
    return RateLimiter(limit, window)


login_limiter = RateLimiter(limit=5, window=900)  # 5 failed logins per 15 minutes per IP
