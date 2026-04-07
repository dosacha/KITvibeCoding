from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import initialize_database, validate_database_configuration
from .routers.analytics import router as analytics_router
from .routers.auth import router as auth_router
from .routers.dashboard import router as dashboard_router
from .routers.domain import router as domain_router
from .routers.frontend import router as frontend_router
from .routers.universities import router as universities_router


settings = get_settings()

app = FastAPI(title="UnitFlow AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    validate_database_configuration()
    if settings.auto_create_schema:
        initialize_database()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(domain_router)
app.include_router(frontend_router)
app.include_router(analytics_router)
app.include_router(dashboard_router)
app.include_router(universities_router)
