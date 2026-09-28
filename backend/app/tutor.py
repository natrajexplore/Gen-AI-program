"""AI tutor: BM25 retrieval over the lessons, then a streamed answer grounded in what was retrieved."""
import math
import os
import re
from collections import Counter
from collections.abc import Iterator

from .models import Catalog

MODEL_ENV = "NETVERSE_MODEL"
TOKEN = re.compile(r"[a-z0-9][a-z0-9.\-/]*[a-z0-9]|[a-z0-9]")
STOP = set("a an and are as at be by can do does for from how i if in into is it its of on or over so than that "
           "the their then there these this to vs was what when where which while who why will with you your".split())


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN.findall(text.lower()) if t not in STOP]


class LessonIndex:
    """BM25 over every lesson (title weighted x3). Small enough to rebuild per request."""

    def __init__(self, catalog: Catalog):
        self.docs = []
        for d in catalog.domains:
            for mi, m in enumerate(d.modules):
                for li, l in enumerate(m.lessons):
                    text = " ".join([l.t] * 3 + [l.body, *l.points, l.cli or ""])
                    self.docs.append({"key": f"{d.id}:{mi}:{li}", "domain_id": d.id, "domain": d.short,
                                      "module": m.title, "title": l.t, "lesson": l, "tf": Counter(tokenize(text))})
        self.avg = sum(sum(x["tf"].values()) for x in self.docs) / max(len(self.docs), 1)
        df = Counter(t for x in self.docs for t in x["tf"])
        n = len(self.docs)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}

    def search(self, query: str, domain_id: str | None = None, k: int = 5) -> list[dict]:
        terms = tokenize(query)
        scored = []
        for x in self.docs:
            tf, length = x["tf"], sum(x["tf"].values())
            s = sum(self.idf.get(t, 0) * tf[t] * 2.2 / (tf[t] + 1.2 * (0.25 + 0.75 * length / self.avg)) for t in terms)
            if s > 0:
                scored.append((s * (1.5 if x["domain_id"] == domain_id else 1), x))
        scored.sort(key=lambda p: -p[0])
        return [x for _, x in scored[:k]]


SYSTEM = """You are the NetVerse Academy tutor, a patient senior network engineer.
Answer the learner's networking question clearly and accurately.
- Ground your answer in the numbered course excerpts below and cite them inline like [1] or [2].
- If the excerpts don't cover the question, say so briefly, then answer from general knowledge and mark that part "(not covered in the course)".
- Never invent CLI commands. Only show commands you are certain exist on the named platform.
- Keep answers focused: short paragraphs, a list when it helps, and CLI in ``` code blocks.
- Plain text apart from code blocks and **bold** for a few key terms: no markdown headings or tables."""


def build_messages(history: list[dict], sources: list[dict], domain_name: str | None) -> list[dict]:
    excerpts = "\n\n".join(
        f"[{i}] {s['domain']} › {s['module']} › {s['title']}\n{s['lesson'].body}\nKey points: {'; '.join(s['lesson'].points)}"
        + (f"\nCLI example:\n{s['lesson'].cli}" if s["lesson"].cli else "")
        for i, s in enumerate(sources, 1)) or "(no matching excerpts)"
    where = f"The learner is currently studying the '{domain_name}' domain.\n" if domain_name else ""
    return [{"role": "system", "content": f"{SYSTEM}\n\n{where}Course excerpts:\n{excerpts}"}, *history]


def stream_answer(messages: list[dict]) -> Iterator[str]:
    from openai import OpenAI
    client = OpenAI()
    stream = client.chat.completions.create(model=os.environ.get(MODEL_ENV, "gpt-4o-mini"), messages=messages,
                                            stream=True, temperature=0.3, max_tokens=800)
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
