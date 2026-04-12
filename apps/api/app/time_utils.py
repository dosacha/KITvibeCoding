from __future__ import annotations

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Return a UTC timestamp without using deprecated utcnow().

    We keep the stored value naive for compatibility with the current SQLAlchemy
    DateTime columns and SQLite test database, while deriving it from an
    explicit UTC clock source.
    """
    return datetime.now(UTC).replace(tzinfo=None)


def current_utc_year() -> int:
    return datetime.now(UTC).year
