from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_schema
from .routers import analytics, audit, auth, domain, frontend, universities


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


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "UnitFlow AI API", "environment": settings.app_env}


app.include_router(auth.router)
app.include_router(frontend.router)
app.include_router(domain.router)
app.include_router(universities.router)
app.include_router(analytics.router)
app.include_router(audit.router)
