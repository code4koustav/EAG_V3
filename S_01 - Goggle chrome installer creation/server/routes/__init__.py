from fastapi import APIRouter

from server.routes.meaning import router as meaning_router
from server.routes.summarize import router as summarize_router


def register_routes(root: APIRouter) -> None:
    root.include_router(meaning_router, prefix="/api", tags=["meaning"])
    root.include_router(summarize_router, prefix="/api", tags=["summarize"])
