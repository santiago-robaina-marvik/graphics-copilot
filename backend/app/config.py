from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    gemini_api_key: str
    gemini_model: str = "gemini-3-flash-preview"
    charts_dir: str = "static/charts"

    class Config:
        env_file = ".env"

    @property
    def trash_dir(self) -> str:
        return f"{self.charts_dir}/trash"

    @property
    def trash_retention_days(self) -> int:
        return 7


@lru_cache
def get_settings() -> Settings:
    return Settings()
