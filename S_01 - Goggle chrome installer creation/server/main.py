from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.config import settings
from server.routes import register_routes

app = FastAPI(title="SummaryGo Local API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

root = APIRouter()


@root.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "summarygo"}


register_routes(root)
app.include_router(root)


def run() -> None:
    import uvicorn

    uvicorn.run("server.main:app", host=settings.host, port=settings.port, reload=False)
