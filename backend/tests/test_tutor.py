"""Tutor retrieval and streaming, with the model call stubbed."""
import json

import pytest
from fastapi.testclient import TestClient

from app import main, store, tutor
from app.main import BASE


def test_retrieval_finds_the_right_lessons():
    ix = tutor.LessonIndex(BASE)
    assert ix.search("what is a TLOC")[0]["title"] == "TLOCs and colours"
    assert ix.search("OMP overlay management protocol")[0]["domain_id"] == "sdwan"
    assert ix.search("zzzz qqqq") == []


def test_current_domain_is_preferred():
    ix = tutor.LessonIndex(BASE)
    assert ix.search("802.1X", domain_id="wireless")[0]["domain_id"] == "wireless"
    assert ix.search("802.1X", domain_id="ise")[0]["domain_id"] == "ise"


def _events(body: str):
    out = []
    for block in body.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        out.append((lines["event"], json.loads(lines["data"])))
    return out


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    return TestClient(main.app)


def test_stream_sends_sources_then_answer(client, monkeypatch):
    seen = {}

    def fake_stream(messages):
        seen["messages"] = messages
        yield "A TLOC is "
        yield "a transport locator [1]."

    monkeypatch.setattr(tutor, "stream_answer", fake_stream)
    r = client.post("/api/tutor", json={"domain_id": "sdwan", "messages": [{"role": "user", "content": "What is a TLOC?"}]})
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
    events = _events(r.text)
    assert events[0][0] == "sources" and events[0][1][0]["title"] == "TLOCs and colours"
    assert "".join(d for e, d in events if e == "delta") == "A TLOC is a transport locator [1]."
    assert events[-1] == ("done", None)
    system = seen["messages"][0]["content"]
    assert "SD-WAN Concepts" in system and "[1] SD-WAN" in system
    assert seen["messages"][-1] == {"role": "user", "content": "What is a TLOC?"}


def test_model_failure_becomes_error_event(client, monkeypatch):
    def broken(messages):
        raise RuntimeError("boom")
        yield
    monkeypatch.setattr(tutor, "stream_answer", broken)
    events = _events(client.post("/api/tutor", json={"messages": [{"role": "user", "content": "hi"}]}).text)
    assert [e for e, _ in events] == ["sources", "error", "done"]


def test_request_rules(client, monkeypatch):
    assert client.post("/api/tutor", json={"messages": [{"role": "assistant", "content": "x"}]}).status_code == 422
    assert client.post("/api/tutor", json={"messages": []}).status_code == 422
    monkeypatch.delenv("OPENAI_API_KEY")
    assert client.post("/api/tutor", json={"messages": [{"role": "user", "content": "x"}]}).status_code == 503
