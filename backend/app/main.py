import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ValidationError

from . import store, tutor
from .models import Catalog, Domain

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
log = logging.getLogger("netverse")

CONTENT = Path(__file__).parent / "content" / "netverse.json"
BASE = Catalog.model_validate_json(CONTENT.read_text(encoding="utf-8"))
# Kept for scripts and tests that only need the hand-written content.
by_id = {d.id: d for d in BASE.domains}


def build_catalog(extra: dict | None = None) -> Catalog:
    """Hand-written content plus every published draft (and optionally one more, to test-publish it)."""
    data = BASE.model_dump(by_alias=True)
    domains = {d["id"]: d for d in data["domains"]}
    for draft in store.published() + ([extra] if extra else []):
        res = draft["result"]
        if draft["mode"] == "extend":
            target = domains[draft["domain_id"]]
            target["modules"] += res["modules"]
            target["quiz"] += res["quiz"]
        else:
            if res["meta"]["id"] in domains:
                raise ValueError(f"A domain with id '{res['meta']['id']}' already exists")
            domains[res["meta"]["id"]] = {**res["meta"], "deep": False, "topology": res["topology"],
                                          "modules": res["modules"], "quiz": res["quiz"]}
    data["domains"] = list(domains.values())
    return Catalog.model_validate(data)


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.recover()
    yield


app = FastAPI(title="NetVerse Academy API", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/catalog", response_model=Catalog, response_model_exclude_none=True)
def get_catalog() -> Catalog:
    return build_catalog()


@app.get("/api/domains/{domain_id}", response_model=Domain, response_model_exclude_none=True)
def get_domain(domain_id: str) -> Domain:
    for d in build_catalog().domains:
        if d.id == domain_id:
            return d
    raise HTTPException(404, f"Unknown domain: {domain_id}")


# ------------------------------------------------------------------ AI content studio

class GenerateRequest(BaseModel):
    mode: Literal["extend", "new"]
    domain_id: str | None = None
    topic: str = Field("", max_length=200)
    focus: str = Field("", max_length=500)


def _run_job(draft_id: int, domain: Domain | None, topic: str, focus: str) -> None:
    try:
        from .crew.pipeline import generate  # imported lazily: CrewAI is slow to import
        result = generate(domain, topic, focus, lambda msg: store.append_log(draft_id, msg))
        store.finish(draft_id, result=result)
    except Exception as e:
        log.exception("Draft %s failed", draft_id)
        store.finish(draft_id, error=f"{type(e).__name__}: {e}"[:2000])


@app.post("/api/drafts", status_code=202)
def create_draft(req: GenerateRequest, tasks: BackgroundTasks) -> dict:
    if not os.environ.get("OPENAI_API_KEY"):
        raise HTTPException(503, "OPENAI_API_KEY is not set. Add it to the .env file in the project root and restart the API.")
    if store.any_running():
        raise HTTPException(409, "A draft is already being generated. Wait for it to finish.")
    domain = None
    if req.mode == "extend":
        domain = next((d for d in build_catalog().domains if d.id == req.domain_id), None)
        if domain is None:
            raise HTTPException(422, f"Unknown domain: {req.domain_id}")
    elif not req.topic.strip():
        raise HTTPException(422, "A topic is required to create a new domain.")
    draft = store.create(req.mode, domain.id if domain else None, req.topic.strip(), req.focus.strip())
    tasks.add_task(_run_job, draft["id"], domain, req.topic.strip(), req.focus.strip())
    return draft


@app.get("/api/drafts")
def list_drafts() -> list[dict]:
    return [{k: v for k, v in d.items() if k != "result"} for d in store.list_all()]


def _draft_or_404(draft_id: int) -> dict:
    draft = store.get(draft_id)
    if draft is None:
        raise HTTPException(404, f"Unknown draft: {draft_id}")
    return draft


@app.get("/api/drafts/{draft_id}")
def get_draft(draft_id: int) -> dict:
    return _draft_or_404(draft_id)


@app.post("/api/drafts/{draft_id}/publish")
def publish_draft(draft_id: int) -> dict:
    draft = _draft_or_404(draft_id)
    if draft["status"] != "ready":
        raise HTTPException(409, f"Only ready drafts can be published (this one is {draft['status']}).")
    try:
        build_catalog(extra=draft)
    except (ValueError, ValidationError) as e:
        raise HTTPException(422, f"Publishing would break the catalogue: {e}")
    store.set_status(draft_id, "published")
    return store.get(draft_id)


@app.post("/api/drafts/{draft_id}/reject")
def reject_draft(draft_id: int) -> dict:
    draft = _draft_or_404(draft_id)
    if draft["status"] != "ready":
        raise HTTPException(409, f"Only ready drafts can be rejected (this one is {draft['status']}).")
    store.set_status(draft_id, "rejected")
    return store.get(draft_id)


# ------------------------------------------------------------------ AI tutor

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class TutorRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    domain_id: str | None = None


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post("/api/tutor")
def ask_tutor(req: TutorRequest) -> StreamingResponse:
    if not os.environ.get("OPENAI_API_KEY"):
        raise HTTPException(503, "OPENAI_API_KEY is not set. Add it to the .env file in the project root and restart the API.")
    if req.messages[-1].role != "user":
        raise HTTPException(422, "The last message must be from the user.")
    catalog = build_catalog()
    domain = next((d for d in catalog.domains if d.id == req.domain_id), None)
    # Retrieve with the last two user turns so short follow-ups ("why?") keep their topic.
    query = " ".join(m.content for m in [m for m in req.messages if m.role == "user"][-2:])
    sources = tutor.LessonIndex(catalog).search(query, domain.id if domain else None)
    history = [m.model_dump() for m in req.messages[-10:]]
    messages = tutor.build_messages(history, sources, domain.name if domain else None)

    def events():
        yield _sse("sources", [{"n": i, "key": s["key"], "domain_id": s["domain_id"], "domain": s["domain"],
                                "module": s["module"], "title": s["title"]} for i, s in enumerate(sources, 1)])
        try:
            for delta in tutor.stream_answer(messages):
                yield _sse("delta", delta)
        except Exception as e:
            log.exception("Tutor answer failed")
            yield _sse("error", f"The tutor couldn't answer ({type(e).__name__}). Try again in a moment.")
        yield _sse("done", None)

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})
