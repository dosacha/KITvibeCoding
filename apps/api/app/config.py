from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite:///./unitflow.db"
    auto_create_schema: bool = False

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720

    openai_api_key: str | None = None
    openai_model: str = "gpt-5.4-mini"

    cors_origins: str = (
        "http://127.0.0.1:5173,http://localhost:5173,"
        "http://127.0.0.1:5174,http://localhost:5174,"
        "http://127.0.0.1:5175,http://localhost:5175"
    )
    unitflow_api_base_url: str = "http://localhost:8000"
    vite_api_base_url: str = "http://localhost:8000"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _normalize_cors(cls, value: str | list[str]) -> str:
        if isinstance(value, list):
            return ",".join(value)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
