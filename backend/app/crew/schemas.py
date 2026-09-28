"""Structured outputs each agent must return. Validation failures are fed back to the agent once."""
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from ..models import Lesson, QuizItem


class DomainMeta(BaseModel):
    """Catalogue fields for a brand-new domain."""
    id: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=24, description="URL slug, e.g. 'bgp-deep-dive'")
    name: str = Field(max_length=48)
    short: str = Field(max_length=14, description="Label on the 3D map")
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$", description="Bright accent colour that reads well on a dark navy background")
    layers: str = Field(description="OSI layers covered, e.g. 'L3' or 'L2–L7'")
    proto: str = Field(description="Two or three key protocols, e.g. 'OSPF · BGP'")
    level: Literal["Beginner", "Intermediate", "Advanced"]
    hours: int = Field(ge=1, le=40)
    tagline: str = Field(max_length=180)


class LessonPlan(BaseModel):
    title: str
    objective: str


class ModulePlan(BaseModel):
    title: str
    lessons: list[LessonPlan] = Field(min_length=2, max_length=3)


class Outline(BaseModel):
    meta: DomainMeta | None = Field(default=None, description="Only when creating a new domain")
    modules: list[ModulePlan] = Field(min_length=2, max_length=3)


class AuthoredLesson(BaseModel):
    t: str
    body: str = Field(min_length=200, description="2-4 paragraphs of plain text, no markdown")
    points: list[str] = Field(min_length=3, max_length=6)
    cli: str | None = Field(default=None, description="Real vendor CLI or config with comments, or null")


class AuthoredModule(BaseModel):
    title: str
    lessons: list[AuthoredLesson] = Field(min_length=2, max_length=3)


class Lessons(BaseModel):
    modules: list[AuthoredModule] = Field(min_length=2, max_length=3)


class Diagram(BaseModel):
    module: int = Field(ge=0, description="0-based module index")
    lesson: int = Field(ge=0, description="0-based lesson index within the module")
    mermaid: str = Field(description="Mermaid source: flowchart, sequenceDiagram or stateDiagram-v2")


class Diagrams(BaseModel):
    diagrams: list[Diagram] = Field(min_length=2, max_length=5)


class Quiz(BaseModel):
    quiz: list[QuizItem] = Field(min_length=5, max_length=7)

    @model_validator(mode="after")
    def answers_in_range(self):
        for i, q in enumerate(self.quiz):
            if not 3 <= len(q.o) <= 4:
                raise ValueError(f"question {i} must have 3 or 4 options")
            if not 0 <= q.a < len(q.o):
                raise ValueError(f"question {i}: answer index {q.a} is out of range")
        return self


Target = Literal["lessons", "diagrams", "topology", "quiz"]


class Issue(BaseModel):
    target: Target
    location: str = Field(description="e.g. 'module 2, lesson 1' or 'question 3'")
    problem: str
    fix: str


class Review(BaseModel):
    approved: bool = Field(description="True only if there are no factual, CLI or pedagogical errors")
    summary: str
    issues: list[Issue] = Field(default_factory=list)


def merge_diagrams(lessons: Lessons, diagrams: Diagrams) -> list[dict]:
    """Final module dicts in catalogue shape, with diagrams attached to their lessons."""
    modules = [{"title": m.title, "lessons": [Lesson(**l.model_dump()).model_dump(exclude_none=True) for l in m.lessons]}
               for m in lessons.modules]
    for d in diagrams.diagrams:
        if d.module < len(modules) and d.lesson < len(modules[d.module]["lessons"]):
            modules[d.module]["lessons"][d.lesson]["diagram"] = d.mermaid
    return modules
