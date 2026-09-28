"""SQLite storage for AI-generated drafts. Published drafts are layered onto the base catalogue."""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "netverse.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS drafts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    mode       TEXT NOT NULL,              -- 'extend' | 'new'
    domain_id  TEXT,                       -- target domain when extending
    topic      TEXT NOT NULL DEFAULT '',
    focus      TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL,              -- running | ready | failed | published | rejected
    log        TEXT NOT NULL DEFAULT '[]', -- JSON list of step messages
    result     TEXT,                       -- JSON package from the pipeline
    error      TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(SCHEMA)
    return conn


def recover() -> None:
    with _connect() as c:
        # A server restart kills in-flight jobs; don't leave them "running" forever.
        c.execute("UPDATE drafts SET status='failed', error='Interrupted by a server restart', updated_at=? "
                  "WHERE status='running'", (_now(),))


def _row(r: sqlite3.Row | None) -> dict | None:
    if r is None:
        return None
    d = dict(r)
    d["log"] = json.loads(d["log"])
    d["result"] = json.loads(d["result"]) if d["result"] else None
    return d


def create(mode: str, domain_id: str | None, topic: str, focus: str) -> dict:
    with _connect() as c:
        cur = c.execute("INSERT INTO drafts (mode, domain_id, topic, focus, status, created_at, updated_at) "
                        "VALUES (?, ?, ?, ?, 'running', ?, ?)", (mode, domain_id, topic, focus, _now(), _now()))
    return get(cur.lastrowid)  # after the `with` block, so the insert is committed


def get(draft_id: int) -> dict | None:
    with _connect() as c:
        return _row(c.execute("SELECT * FROM drafts WHERE id=?", (draft_id,)).fetchone())


def list_all() -> list[dict]:
    with _connect() as c:
        return [_row(r) for r in c.execute("SELECT * FROM drafts ORDER BY id DESC")]


def any_running() -> bool:
    with _connect() as c:
        return c.execute("SELECT 1 FROM drafts WHERE status='running'").fetchone() is not None


def append_log(draft_id: int, message: str) -> None:
    with _connect() as c:
        log = json.loads(c.execute("SELECT log FROM drafts WHERE id=?", (draft_id,)).fetchone()[0])
        log.append(message)
        c.execute("UPDATE drafts SET log=?, updated_at=? WHERE id=?", (json.dumps(log), _now(), draft_id))


def finish(draft_id: int, result: dict | None = None, error: str | None = None) -> None:
    with _connect() as c:
        c.execute("UPDATE drafts SET status=?, result=?, error=?, updated_at=? WHERE id=?",
                  ("failed" if error else "ready", json.dumps(result) if result else None, error, _now(), draft_id))


def set_status(draft_id: int, status: str) -> None:
    with _connect() as c:
        c.execute("UPDATE drafts SET status=?, updated_at=? WHERE id=?", (status, _now(), draft_id))


def published() -> list[dict]:
    with _connect() as c:
        return [_row(r) for r in c.execute("SELECT * FROM drafts WHERE status='published' ORDER BY id")]
