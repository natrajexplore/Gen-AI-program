"""Multi-agent content pipeline.

research -> author -> visuals -> [3D topology, new domains only] -> quiz -> review,
then up to MAX_REVISIONS rounds where the reviewer's issues are sent back to the agents that own them.
Each step is one CrewAI crew (agent + task) with a Pydantic output. Plain Python sequences the steps so
the order and the revision loop are explicit.
"""
import json
import os
import sys
from collections.abc import Callable
from typing import TypeVar

from pydantic import BaseModel, ValidationError

os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")
# CrewAI prints emoji; the default Windows console encoding can't, which crashes its event handlers.
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

from crewai import LLM, Agent, Crew, Task  # noqa: E402

from ..models import Domain, Topology  # noqa: E402
from .schemas import Diagrams, Lessons, Outline, Quiz, Review, merge_diagrams  # noqa: E402

MODEL = os.environ.get("NETVERSE_MODEL", "gpt-4o-mini")
MAX_REVISIONS = 2

M = TypeVar("M", bound=BaseModel)


def _agent(role: str, goal: str, backstory: str, temperature: float = 0.4) -> Agent:
    return Agent(role=role, goal=goal, backstory=backstory, llm=LLM(model=MODEL, temperature=temperature),
                 allow_delegation=False, verbose=False)


researcher = _agent(
    "Networking curriculum researcher",
    "Design a focused, well-sequenced module outline that fills real gaps for the learner.",
    "You design certification-grade networking courses (CCNA/CCNP/JNCIA level) and know which concepts must come first.")
author = _agent(
    "Senior network engineer and technical writer",
    "Write accurate, concrete lessons with real CLI a learner can type on real gear.",
    "You have run production networks for 15 years and write crisp, jargon-light explanations. You never invent commands.")
visual = _agent(
    "Technical diagram designer",
    "Turn the hardest ideas in the lessons into small, correct Mermaid diagrams.",
    "You draw packet flows, protocol state machines and message sequences that make one idea obvious at a glance.")
architect = _agent(
    "3D network topology architect",
    "Design a clear 3D topology scene that shows the devices and relationships the domain teaches.",
    "You lay out network diagrams in 3D space: control plane above, data plane in the middle, endpoints below.")
assessor = _agent(
    "Certification exam item writer",
    "Write multiple-choice questions that test understanding, each with one clearly correct answer.",
    "You write exam items with plausible distractors and explanations that teach why the answer is right.")
reviewer = _agent(
    "Principal network engineer, technical reviewer",
    "Catch factual errors, wrong or invented CLI, broken diagrams, bad quiz keys and confusing explanations.",
    "You review training content before it ships to thousands of engineers. You are precise and only flag real problems.",
    temperature=0)


def _run(agent: Agent, description: str, expected: str, model: type[M]) -> M:
    """Run one task; if the output fails validation, show the agent the error and retry once."""
    for attempt in range(2):
        task = Task(description=description, expected_output=expected, agent=agent, output_pydantic=model)
        out = Crew(agents=[agent], tasks=[task], verbose=False).kickoff()
        try:
            if isinstance(out.pydantic, model):
                return model.model_validate(out.pydantic.model_dump(by_alias=True))
            return model.model_validate_json(out.raw)
        except ValidationError as e:
            if attempt:
                raise
            description += (f"\n\nYour previous answer was rejected by the validator:\n{e}\n"
                            "Return corrected output that satisfies every constraint.")
    raise AssertionError("unreachable")


def _dump(m: BaseModel) -> str:
    return json.dumps(m.model_dump(by_alias=True, exclude_none=True), indent=1, ensure_ascii=False)


def _feedback(issues: list, target: str) -> str:
    mine = [i for i in issues if i.target == target]
    if not mine:
        return ""
    lines = "\n".join(f"- {i.location}: {i.problem} Fix: {i.fix}" for i in mine)
    return f"\n\nA technical reviewer found these problems in the previous version. Fix all of them:\n{lines}"


def generate(domain: Domain | None, topic: str, focus: str, log: Callable[[str], None]) -> dict:
    """Produce a draft package. `domain` set = extend that domain; None = create a new domain about `topic`."""
    if domain:
        existing = "\n".join(f"- {m.title}: " + "; ".join(l.t for l in m.lessons) for m in domain.modules)
        brief = (f"Extend the existing course '{domain.name}' ({domain.layers}, {domain.level}).\n"
                 f"It already covers these modules and lessons, which you must NOT repeat:\n{existing}")
    else:
        brief = f"Create a brand-new course about: {topic}. Also fill in `meta` for the course catalogue."
    if focus:
        brief += f"\nThe author asked to focus on: {focus}"

    log("Curriculum researcher: planning modules")
    outline = _run(researcher, f"{brief}\n\nPlan 2-3 new modules with 2-3 lessons each, in teaching order. "
                   "Each lesson gets one concrete learning objective." + ("" if domain else " `meta` is required."),
                   "A module outline" + ("" if domain else " plus catalogue metadata"), Outline)
    if not domain and outline.meta is None:
        raise ValueError("The researcher did not provide catalogue metadata for the new domain.")

    def write_lessons(extra: str = "") -> Lessons:
        return _run(author, f"{brief}\n\nWrite every lesson in this outline, keeping the module and lesson order:\n"
                    f"{_dump(outline)}\n\nFor each lesson: `t` is the lesson title, `body` is 2-4 short paragraphs of "
                    "plain text (no markdown), `points` are 3-6 key facts worth memorising, and `cli` is a real, "
                    "commented configuration or show-command example for a named platform (Cisco IOS XE, NX-OS, "
                    "Junos, Linux...) when one applies, otherwise null. Only use commands you are certain exist with that exact "
                    "syntax on that platform; if you are not certain, set `cli` to null rather than guess. "
                    "Use RFC 5737 / RFC 1918 example addresses."
                    + extra, "All lessons, grouped by module", Lessons)

    def draw_diagrams(lessons: Lessons, extra: str = "") -> Diagrams:
        return _run(visual, f"Lessons:\n{_dump(lessons)}\n\nPick the 2-5 lessons that benefit most from a diagram "
                    "and write one Mermaid diagram for each. Use `flowchart LR`, `sequenceDiagram` or "
                    "`stateDiagram-v2`. Keep each under 15 nodes or messages, use short labels, quote any label "
                    "containing punctuation, and do not use HTML, styling or click directives." + extra,
                    "Mermaid diagrams keyed by module and lesson index", Diagrams)

    def design_topology(extra: str = "") -> Topology:
        example = '{"nodes":[{"id":"ca-1","kind":"ca","label":"Offline Root CA","pos":[0,3,0]},' \
                  '{"id":"server-1","kind":"server","label":"TLS Server","pos":[-1.5,-0.6,0.4]}],' \
                  '"links":[{"from":"ca-1","to":"server-1","style":"solid"}],"effects":[]}'
        return _run(architect, f"Course: {outline.meta.name if outline.meta else topic}\nOutline:\n{_dump(outline)}\n\n"
                    "Design the 3D scene for this course with 8-20 nodes. Rules: node ids are unique slugs; `kind` "
                    "must be one of core, router, switch, spine, leaf, server, host, ap, client, dns, fw, cloud, hub, "
                    "branch, controller, ca, ocsp, psn, pan, idstore, apic, epg, ai; `pos` is [x, y, z] with x and z "
                    "between -5 and 5 and y between -3 and 3.5 (put controllers/cloud high, endpoints low, spread "
                    "nodes at least 1.2 apart); labels are at most 24 characters, and repeating a label shows it only "
                    "once; links use `solid` for physical/data links and `dashed` for control-plane or logical "
                    "relationships; `effects` may include {\"type\":\"radio\",\"nodes\":[ap ids]} for wireless and "
                    f"{{\"type\":\"shells\",\"radii\":[1.9,3.6]}} for security zones.\nExample shape:\n{example}" + extra,
                    "A topology object with nodes, links and effects", Topology)

    def write_quiz(lessons: Lessons, extra: str = "") -> Quiz:
        return _run(assessor, f"Lessons:\n{_dump(lessons)}\n\nWrite 5-7 multiple-choice questions covering these "
                    "lessons. `q` is the question, `o` has 3-4 options, `a` is the 0-based index of the single "
                    "correct option (vary its position), and `why` explains the answer in one or two sentences."
                    + extra, "A quiz", Quiz)

    log("Theory author: writing lessons")
    lessons = write_lessons()
    log("Visual designer: drawing diagrams")
    diagrams = draw_diagrams(lessons)
    topology = None
    if not domain:
        log("3D architect: designing topology")
        topology = design_topology()
    log("Assessment designer: writing quiz")
    quiz = write_quiz(lessons)

    for round_ in range(MAX_REVISIONS + 1):
        log(f"Technical reviewer: review round {round_ + 1}")
        package = {"lessons": lessons, "diagrams": diagrams, "quiz": quiz}
        if topology:
            package["topology"] = topology
        review = _run(reviewer, "Review this course draft for technical accuracy (facts, protocol behaviour, "
                      "defaults), CLI that is invalid for the named platform, Mermaid syntax errors or diagrams that "
                      "misstate the lesson, quiz items whose key is wrong or ambiguous, and topologies that misrepresent "
                      "the architecture. Do not flag style preferences. Set `approved` to true only if nothing needs "
                      "fixing.\n\n" + "\n\n".join(f"## {k}\n{_dump(v)}" for k, v in package.items()),
                      "A review verdict with specific issues", Review)
        if review.approved or not review.issues or round_ == MAX_REVISIONS:
            break
        targets = {i.target for i in review.issues}
        log(f"Revising: {', '.join(sorted(targets))}")
        if "lessons" in targets:
            lessons = write_lessons(_feedback(review.issues, "lessons"))
        if "diagrams" in targets or "lessons" in targets:
            diagrams = draw_diagrams(lessons, _feedback(review.issues, "diagrams"))
        if topology and "topology" in targets:
            topology = design_topology(_feedback(review.issues, "topology"))
        if "quiz" in targets or "lessons" in targets:
            quiz = write_quiz(lessons, _feedback(review.issues, "quiz"))

    result = {
        "modules": merge_diagrams(lessons, diagrams),
        "quiz": [q.model_dump() for q in quiz.quiz],
        "review": review.model_dump(),
    }
    if not domain:
        result["meta"] = outline.meta.model_dump()
        result["topology"] = topology.model_dump(by_alias=True)
    log("Done")
    return result
