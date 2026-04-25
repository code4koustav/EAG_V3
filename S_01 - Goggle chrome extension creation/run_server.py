"""Start the SummaryGo FastAPI backend (run from this project folder)."""

from __future__ import annotations

import uvicorn

from server.config import settings
from server.main import app

if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="info")
