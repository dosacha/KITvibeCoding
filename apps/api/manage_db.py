from __future__ import annotations

import argparse
from pathlib import Path

from sqlalchemy import inspect, text

from app.db import Base, engine, init_schema
from app.seed import seed_demo_data


LEGACY_COLUMN_SPECS = {
    "student_profiles": {
        "enrollment_status": "VARCHAR(20) DEFAULT 'active'",
        "weekly_available_hours": "FLOAT DEFAULT 12",
        "preferred_subjects": "JSON",
        "disliked_subjects": "JSON",
        "learning_style_preferences": "JSON",
    },
    "exams": {
        "class_group_id": "INTEGER",
        "time_limit_minutes": "INTEGER DEFAULT 60",
        "is_retake": "BOOLEAN DEFAULT 0",
    },
    "questions": {
        "teacher_difficulty": "INTEGER DEFAULT 3",
        "answer_key": "VARCHAR(30)",
        "problem_style": "VARCHAR(60) DEFAULT 'mixed'",
    },
    "student_results": {
        "result_status": "VARCHAR(20) DEFAULT 'submitted'",
        "updated_at": "DATETIME",
    },
}


def run_compatibility_migrations() -> None:
    init_schema()
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        for table_name, columns in LEGACY_COLUMN_SPECS.items():
            if table_name not in existing_tables:
                continue
            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, ddl in columns.items():
                if column_name in existing_columns:
                    continue
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))
        if "questions" in existing_tables:
            question_columns = {column["name"] for column in inspector.get_columns("questions")}
            if "difficulty" in question_columns and "teacher_difficulty" in question_columns:
                connection.execute(text("UPDATE questions SET teacher_difficulty = COALESCE(teacher_difficulty, difficulty)"))


def reset_schema() -> None:
    from app import models  # noqa: F401

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def alembic_upgrade(revision: str = "head") -> None:
    from alembic import command
    from alembic.config import Config

    base_dir = Path(__file__).resolve().parent
    config = Config(str(base_dir / "alembic.ini"))
    config.set_main_option("script_location", str(base_dir / "alembic"))
    command.upgrade(config, revision)


def alembic_stamp(revision: str = "head") -> None:
    from alembic import command
    from alembic.config import Config

    base_dir = Path(__file__).resolve().parent
    config = Config(str(base_dir / "alembic.ini"))
    config.set_main_option("script_location", str(base_dir / "alembic"))
    command.stamp(config, revision)


def main() -> None:
    parser = argparse.ArgumentParser(description="UnitFlow AI DB manager")
    parser.add_argument("command", choices=["init", "reset", "seed", "migrate", "upgrade", "stamp"])
    parser.add_argument("--revision", default="head")
    args = parser.parse_args()

    if args.command == "init":
        init_schema()
        print("schema initialized")
        return
    if args.command == "reset":
        reset_schema()
        print("schema reset")
        return
    if args.command == "migrate":
        run_compatibility_migrations()
        print("compatibility migration completed")
        return
    if args.command == "upgrade":
        alembic_upgrade(args.revision)
        print(f"alembic upgraded to {args.revision}")
        return
    if args.command == "stamp":
        alembic_stamp(args.revision)
        print(f"alembic stamped at {args.revision}")
        return
    if args.command == "seed":
        run_compatibility_migrations()
        from app.db import SessionLocal

        with SessionLocal() as session:
            seed_demo_data(session)
        print("seed completed")


if __name__ == "__main__":
    main()
