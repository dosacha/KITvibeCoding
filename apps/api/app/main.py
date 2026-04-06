from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers.analytics import router as analytics_router
from .routers.auth import router as auth_router
from .routers.dashboard import router as dashboard_router
from .routers.domain import router as domain_router
from .routers.universities import router as universities_router


Base.metadata.create_all(bind=engine)

app = FastAPI(title="UnitFlow AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(domain_router)
app.include_router(analytics_router)
app.include_router(dashboard_router)
app.include_router(universities_router)
