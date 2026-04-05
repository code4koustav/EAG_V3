import re
from collections import Counter

from server.config import settings


def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n{2,}", text)
    out: list[str] = []
    for p in parts:
        s = p.strip()
        if len(s) > 25:
            out.append(s)
    return out


def summarize_text(body: str, sentences: int | None = None) -> str:
    """
    Lightweight extractive summary: score sentences by term frequency in the document,
    take the top N, then reorder to follow the original flow.
    """
    n = sentences if sentences is not None else settings.summary_sentences
    text = re.sub(r"\s+", " ", body).strip()
    if len(text) < 80:
        return text

    sents = _sentences(text)
    if not sents:
        return text[:2000]

    words = re.findall(r"[A-Za-z']{2,}", text.lower())
    stop = {
        "the",
        "and",
        "for",
        "that",
        "this",
        "with",
        "from",
        "have",
        "has",
        "was",
        "were",
        "are",
        "but",
        "not",
        "you",
        "your",
        "into",
        "about",
        "their",
        "they",
        "will",
        "would",
        "there",
        "been",
        "than",
        "also",
        "its",
        "can",
        "may",
    }
    freq = Counter(w for w in words if w not in stop)

    def score(sentence: str) -> float:
        ws = re.findall(r"[A-Za-z']{2,}", sentence.lower())
        if not ws:
            return 0.0
        return sum(freq.get(w, 0) for w in ws) / (len(ws) ** 0.5)

    ranked = sorted(range(len(sents)), key=lambda i: score(sents[i]), reverse=True)
    take = min(n, len(sents))
    chosen = set(ranked[:take])
    ordered = [sents[i] for i in range(len(sents)) if i in chosen]
    return " ".join(ordered)
