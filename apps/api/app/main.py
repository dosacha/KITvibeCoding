from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import settings
from .db import engine, init_schema
from .routers import analytics, audit, auth, domain, frontend, universities

logging.basicConfig(level=settings.log_level.upper(), format="%(message)s")
logger = logging.getLogger("unitflow.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_create_schema:
        init_schema()
    yield


app = FastAPI(title="UnitFlow AI API", version="2.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def structured_access_log(request: Request, call_next):
    started = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        logger.exception(
            json.dumps(
                {
                    "event": "http_request_failed",
                    "method": request.method,
                    "path": request.url.path,
                    "elapsed_ms": elapsed_ms,
                },
                ensure_ascii=False,
            )
        )
        raise
    elapsed_ms = round((perf_counter() - started) * 1000, 2)
    logger.info(
        json.dumps(
            {
                "event": "http_request",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "elapsed_ms": elapsed_ms,
            },
            ensure_ascii=False,
        )
    )
    return response


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "UnitFlow AI API", "environment": settings.app_env}


@app.get("/health")
def health() -> dict[str, str]:
    database_status = "ok"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        database_status = "error"
    return {
        "status": "ok" if database_status == "ok" else "degraded",
        "environment": settings.app_env,
        "database": database_status,
    }


app.include_router(auth.router)
app.include_router(frontend.router)
app.include_router(domain.router)
app.include_router(universities.router)
app.include_router(analytics.router)
app.include_router(audit.router)
