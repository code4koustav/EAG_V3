from urllib.parse import quote

import httpx

from server.config import settings


async def lookup_wikipedia_summary(query: str) -> tuple[str, list[str]] | None:
    """Wikipedia REST summary — works well for phrases and proper nouns."""
    q = query.strip()
    if len(q) < 2 or len(q) > 300:
        return None

    underscored = "_".join(q.split())
    title = quote(underscored, safe="()%")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
    async with httpx.AsyncClient(timeout=settings.http_timeout, follow_redirects=True) as client:
        r = await client.get(url, headers={"Accept": "application/json"})
    if r.status_code != 200:
        return None
    data = r.json()
    extract = data.get("extract")
    tit = data.get("title") or q
    if not extract:
        return None
    return tit, [extract]
