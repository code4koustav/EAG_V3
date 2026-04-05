import re
from urllib.parse import quote

import httpx

from server.config import settings


async def lookup_dictionary(term: str) -> tuple[str, list[str]] | None:
    """Free Dictionary API — best for single words and short lemmas."""
    clean = term.strip()
    if not clean or len(clean) > 80:
        return None
    if re.search(r"\s", clean):
        return None

    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{quote(clean, safe='')}"
    async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
        r = await client.get(url)
    if r.status_code != 200:
        return None
    data = r.json()
    if not isinstance(data, list) or not data:
        return None
    entry = data[0]
    word = entry.get("word", clean)
    defs: list[str] = []
    for m in entry.get("meanings", []):
        part = m.get("partOfSpeech", "")
        for d in m.get("definitions", [])[:4]:
            text = d.get("definition")
            if text:
                label = f"({part}) {text}" if part else text
                defs.append(label)
            if len(defs) >= 8:
                break
        if len(defs) >= 8:
            break
    if not defs:
        return None
    return word, defs
