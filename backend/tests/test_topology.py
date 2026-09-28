import pytest
from pydantic import ValidationError

from app.models import Topology

NODES = [
    {"id": "a", "kind": "router", "label": "R1", "pos": [0, 0, 0]},
    {"id": "b", "kind": "switch", "label": "S1", "pos": [1, 0, 0]},
]


def test_valid_topology_defaults():
    t = Topology.model_validate({"nodes": NODES, "links": [{"from": "a", "to": "b"}]})
    assert t.links[0].style == "solid"
    assert t.model_dump()["links"][0] == {"from": "a", "to": "b", "style": "solid"}


@pytest.mark.parametrize("bad, reason", [
    ({"links": [{"from": "a", "to": "zzz"}]}, "unknown node"),
    ({"links": [{"from": "a", "to": "a"}]}, "itself"),
    ({"nodes": NODES + [NODES[0]], "links": [{"from": "a", "to": "b"}]}, "unique"),
    ({"nodes": [{**NODES[0], "kind": "toaster"}, NODES[1]], "links": [{"from": "a", "to": "b"}]}, "kind"),
    ({"nodes": [{**NODES[0], "pos": [9, 0, 0]}, NODES[1]], "links": [{"from": "a", "to": "b"}]}, "pos"),
    ({"links": [{"from": "a", "to": "b"}], "effects": [{"type": "radio", "nodes": ["zzz"]}]}, "radio"),
])
def test_invalid_topology_rejected(bad, reason):
    with pytest.raises(ValidationError, match=reason):
        Topology.model_validate({"nodes": NODES, **bad})
