from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()


def is_sqlite_url(database_url: str) -> bool:
    return database_url.startswith("sqlite")


def is_postgres_url(database_url: str) -> bool:
    return database_url.startswith("postgresql") or database_url.startswith("postgres")


connect_args = {"check_same_thread": False} if is_sqlite_url(settings.database_url) else {}
engine = create_engine(settings.database_url, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def validate_database_configuration() -> None:
    if settings.app_env.lower() == "production" and is_sqlite_url(settings.database_url):
        raise RuntimeError("운영 환경에서는 SQLite 대신 PostgreSQL 같은 서버형 데이터베이스를 사용해야 해.")


def initialize_database(*, reset: bool = False) -> None:
    from .models import Academy  # noqa: F401

    validate_database_configuration()
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
