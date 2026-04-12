from __future__ import annotations

import os
from pathlib import Path

import pytest

import sys

TESTS_DIR = Path(__file__).resolve().parent
API_ROOT = TESTS_DIR.parent
sys.path.insert(0, str(API_ROOT))

TEST_DB_PATH = Path('/tmp/unitflow_test.sqlite3')
os.environ['DATABASE_URL'] = f'sqlite:///{TEST_DB_PATH}'
os.environ['AUTO_CREATE_SCHEMA'] = 'false'
os.environ['JWT_SECRET'] = 'unitflow-test-secret-key-12345678901234567890'
os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'] = '120'

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.seed import seed_demo_data  # noqa: E402


@pytest.fixture()
def seeded_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)
    yield
    Base.metadata.drop_all(bind=engine)


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink(missing_ok=True)


@pytest.fixture()
def db_session(seeded_db):
    with SessionLocal() as db:
        yield db


@pytest.fixture()
def client(seeded_db):
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers(client):
    def _auth_headers(email: str, password: str = 'password123') -> dict[str, str]:
        response = client.post('/auth/login', json={'email': email, 'password': password})
        assert response.status_code == 200, response.text
        token = response.json()['access_token']
        return {'Authorization': f'Bearer {token}'}

    return _auth_headers
