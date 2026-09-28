"""Course catalogue schema for app/content/netverse.json."""
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

# Device kinds the 3D renderer knows how to draw (shape + colour).
DeviceKind = Literal[
    "core", "router", "switch", "spine", "leaf", "server", "host", "ap", "client", "dns",
    "fw", "cloud", "hub", "branch", "controller", "ca", "ocsp", "psn", "pan", "idstore",
    "apic", "epg", "ai",
]

# Scene bounds (x, y, z) that keep every node inside the camera frame.
BOUNDS = ((-5, 5), (-3, 3.5), (-5, 5))


class TopoNode(BaseModel):
    id: str
    kind: DeviceKind
    label: str = Field(max_length=24)
    # A list rather than a tuple: OpenAI structured outputs reject tuple (prefixItems) schemas.
    pos: list[float] = Field(min_length=3, max_length=3, description="[x, y, z]")

    @model_validator(mode="after")
    def check_bounds(self):
        for axis, v, (lo, hi) in zip("xyz", self.pos, BOUNDS):
            if not lo <= v <= hi:
                raise ValueError(f"pos {axis}={v} of node {self.id} is outside {lo}..{hi}")
        return self


class TopoLink(BaseModel):
    from_: str = Field(alias="from")
    to: str
    style: Literal["solid", "dashed"] = "solid"

    model_config = {"populate_by_name": True, "serialize_by_alias": True}


class RadioEffect(BaseModel):
    type: Literal["radio"]
    nodes: list[str]


class ShellsEffect(BaseModel):
    type: Literal["shells"]
    radii: list[Annotated[float, Field(gt=0, le=5)]] = Field(max_length=3)


class Topology(BaseModel):
    """A domain's 3D network scene. Labels are shown once per distinct label text."""
    nodes: list[TopoNode] = Field(min_length=2, max_length=30)
    links: list[TopoLink] = Field(min_length=1, max_length=60)
    effects: list[RadioEffect | ShellsEffect] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_references(self):
        ids = [n.id for n in self.nodes]
        if len(ids) != len(set(ids)):
            raise ValueError("node ids must be unique")
        known = set(ids)
        for link in self.links:
            if link.from_ not in known or link.to not in known:
                raise ValueError(f"link {link.from_} -> {link.to} references an unknown node")
            if link.from_ == link.to:
                raise ValueError(f"link {link.from_} -> {link.to} connects a node to itself")
        for effect in self.effects:
            if isinstance(effect, RadioEffect) and not set(effect.nodes) <= known:
                raise ValueError("radio effect references an unknown node")
        return self


class Lesson(BaseModel):
    t: str
    body: str
    points: list[str] = Field(default_factory=list)
    cli: str | None = None
    diagram: str | None = None  # Mermaid source, drawn under the lesson body


class Module(BaseModel):
    title: str
    lessons: list[Lesson]


class QuizItem(BaseModel):
    q: str
    o: list[str]
    a: int
    why: str


class Domain(BaseModel):
    id: str
    name: str
    short: str
    color: str
    layers: str
    proto: str
    level: Literal["Beginner", "Intermediate", "Advanced"]
    hours: int
    topology: Topology
    tagline: str
    deep: bool = False
    modules: list[Module]
    quiz: list[QuizItem]


class Path(BaseModel):
    name: str
    note: str
    steps: list[str]


class Catalog(BaseModel):
    domains: list[Domain]
    paths: list[Path]
