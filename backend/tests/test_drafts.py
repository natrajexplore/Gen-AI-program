"""Draft lifecycle with the crew replaced by a canned result (no model calls)."""
import pytest
from fastapi.testclient import TestClient

from app import auth, main, store

LESSON = {"t": "ESI basics", "body": "x" * 200, "points": ["a", "b", "c"], "diagram": "flowchart LR\n  A --> B"}
PACKAGE = {
    "modules": [{"title": "Generated module", "lessons": [LESSON, {**LESSON, "t": "DF election"}]}],
    "quiz": [{"q": "Q?", "o": ["a", "b", "c"], "a": 1, "why": "Because."}],
    "review": {"approved": True, "summary": "Fine.", "issues": []},
}
NEW_PACKAGE = {
    **PACKAGE,
    "meta": {"id": "evpn-mh", "name": "EVPN Multihoming", "short": "EVPN-MH", "color": "#33CCAA", "layers": "L2–L3",
             "proto": "EVPN · BGP", "level": "Advanced", "hours": 6, "tagline": "All-active attachment."},
    "topology": {"nodes": [{"id": "leaf-1", "kind": "leaf", "label": "Leaf", "pos": [0, 0, 0]},
                           {"id": "server-1", "kind": "server", "label": "Server", "pos": [0, -2, 0]}],
                 "links": [{"from": "leaf-1", "to": "server-1"}]},
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def fake_job(draft_id, domain, topic, focus):
        store.append_log(draft_id, "Done")
        store.finish(draft_id, result=PACKAGE if domain else NEW_PACKAGE)

    monkeypatch.setattr(main, "_run_job", fake_job)
    monkeypatch.setenv("ADMIN_PASSWORD", "test-admin")
    monkeypatch.setattr(auth, "login_limiter", auth.RateLimiter(5, 900))
    client = TestClient(main.app)
    assert client.post("/api/auth/login", json={"password": "test-admin"}).status_code == 200
    return client


def test_missing_key_is_reported(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY")
    r = client.post("/api/drafts", json={"mode": "new", "topic": "EVPN"})
    assert r.status_code == 503 and "OPENAI_API_KEY" in r.json()["detail"]


def test_request_validation(client):
    assert client.post("/api/drafts", json={"mode": "extend", "domain_id": "nope"}).status_code == 422
    assert client.post("/api/drafts", json={"mode": "new", "topic": "  "}).status_code == 422


def test_extend_publish_appends_to_domain(client):
    before = client.get("/api/domains/routing").json()
    draft = client.post("/api/drafts", json={"mode": "extend", "domain_id": "routing", "focus": "BGP"}).json()
    got = client.get(f"/api/drafts/{draft['id']}").json()
    assert got["status"] == "ready" and got["log"] == ["Done"]
    assert client.get("/api/domains/routing").json() == before  # not visible until published

    assert client.post(f"/api/drafts/{draft['id']}/publish").json()["status"] == "published"
    after = client.get("/api/domains/routing").json()
    assert len(after["modules"]) == len(before["modules"]) + 1
    assert after["modules"][-1]["lessons"][0]["diagram"].startswith("flowchart")
    assert len(after["quiz"]) == len(before["quiz"]) + 1


def test_new_domain_publish_and_id_clash(client):
    first = client.post("/api/drafts", json={"mode": "new", "topic": "EVPN multihoming"}).json()
    assert client.post(f"/api/drafts/{first['id']}/publish").status_code == 200
    domains = client.get("/api/catalog").json()["domains"]
    assert domains[-1]["id"] == "evpn-mh" and domains[-1]["topology"]["nodes"][0]["id"] == "leaf-1"

    second = client.post("/api/drafts", json={"mode": "new", "topic": "EVPN again"}).json()
    r = client.post(f"/api/drafts/{second['id']}/publish")
    assert r.status_code == 422 and "already exists" in r.json()["detail"]


def test_reject_and_state_rules(client):
    draft = client.post("/api/drafts", json={"mode": "new", "topic": "EVPN"}).json()
    assert client.post(f"/api/drafts/{draft['id']}/reject").json()["status"] == "rejected"
    assert client.post(f"/api/drafts/{draft['id']}/publish").status_code == 409
    assert "result" not in client.get("/api/drafts").json()[0]
    assert all(d["id"] != "evpn-mh" for d in client.get("/api/catalog").json()["domains"])
