"""Admin login, studio protection, and rate limits."""
import time

import pytest
from fastapi.testclient import TestClient

from app import auth, main, store


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setenv("ADMIN_PASSWORD", "correct horse")
    monkeypatch.setattr(auth, "login_limiter", auth.RateLimiter(5, 900))
    return TestClient(main.app)


def test_studio_requires_login(client):
    assert client.get("/api/auth/me").json() == {"admin": False, "enabled": True}
    for method, path in [("get", "/api/drafts"), ("get", "/api/drafts/1"), ("post", "/api/drafts/1/publish"),
                         ("post", "/api/drafts/1/reject")]:
        assert getattr(client, method)(path).status_code == 401, path
    assert client.post("/api/drafts", json={"mode": "new", "topic": "x"}).status_code == 401
    # The public site stays public.
    assert client.get("/api/catalog").status_code == 200


def test_login_session_and_logout(client):
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    r = client.post("/api/auth/login", json={"password": "correct horse"})
    assert r.status_code == 200
    cookie = r.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=strict" in cookie and "Path=/api" in cookie
    assert client.get("/api/auth/me").json()["admin"] is True
    assert client.get("/api/drafts").status_code == 200
    client.post("/api/auth/logout")
    assert client.get("/api/drafts").status_code == 401


def test_tampered_or_expired_tokens_rejected(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "s3cret")
    token = auth.make_token()
    assert auth.valid_token(token)
    expires, sig = token.split(".")
    assert not auth.valid_token(f"{int(expires) + 999}.{sig}")          # extended expiry
    assert not auth.valid_token(f"{expires}.{'0' * len(sig)}")          # forged signature
    assert not auth.valid_token(auth.make_token(now=time.time() - auth.SESSION_TTL - 1))  # expired
    monkeypatch.setenv("SESSION_SECRET", "rotated")
    assert not auth.valid_token(token)                                   # secret rotated


def test_studio_disabled_without_password(client, monkeypatch):
    monkeypatch.delenv("ADMIN_PASSWORD")
    assert client.post("/api/auth/login", json={"password": ""}).status_code == 503
    assert client.get("/api/drafts").status_code == 503
    assert client.get("/api/auth/me").json() == {"admin": False, "enabled": False}


def test_successful_logins_do_not_count(client):
    for _ in range(8):
        assert client.post("/api/auth/login", json={"password": "correct horse"}).status_code == 200


def test_failed_logins_are_throttled(client):
    for _ in range(5):
        assert client.post("/api/auth/login", json={"password": "nope"}).status_code == 401
    r = client.post("/api/auth/login", json={"password": "correct horse"})
    assert r.status_code == 429 and int(r.headers["Retry-After"]) > 0


def test_tutor_is_rate_limited(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(main.app.state, "tutor_limiter", auth.RateLimiter(2, 600))
    monkeypatch.setattr("app.tutor.stream_answer", lambda messages: iter(["ok"]))
    body = {"messages": [{"role": "user", "content": "What is OSPF?"}]}
    assert [client.post("/api/tutor", json=body).status_code for _ in range(3)] == [200, 200, 429]


@pytest.mark.skipif(not (main.STATIC_DIR / "index.html").is_file(), reason="frontend not built")
def test_serves_built_frontend(client):
    r = client.get("/")
    assert r.status_code == 200 and "<div id=\"root\">" in r.text
    assert client.get("/third-party-licenses.md").status_code == 200
    assert client.get("/api/nope").status_code == 404
