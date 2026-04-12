from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def _create_engine(database_url: str):
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, future=True, pool_pre_ping=True, connect_args=connect_args)


engine = _create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True, expire_on_commit=False)


def get_db() -> Generator:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_schema() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
