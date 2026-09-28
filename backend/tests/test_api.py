from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_catalog_matches_original_content():
    data = client.get("/api/catalog").json()
    assert len(data["domains"]) == 18
    assert len(data["paths"]) == 7
    lessons = sum(len(m["lessons"]) for d in data["domains"] for m in d["modules"])
    quiz = sum(len(d["quiz"]) for d in data["domains"])
    assert (lessons, quiz) == (123, 84)


def test_path_steps_reference_real_domains():
    data = client.get("/api/catalog").json()
    ids = {d["id"] for d in data["domains"]}
    for p in data["paths"]:
        assert set(p["steps"]) <= ids, p["name"]


def test_domain_lookup():
    topo = client.get("/api/domains/pki").json()["topology"]
    assert topo["nodes"][0] == {"id": "ca-1", "kind": "ca", "label": "Offline Root CA", "pos": [0, 3, 0]}
    assert {"from": "ocsp-1", "to": "ca-2", "style": "dashed"} in topo["links"]
    assert client.get("/api/domains/nope").status_code == 404
