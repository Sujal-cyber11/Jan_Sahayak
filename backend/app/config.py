"""Application settings loaded from environment / .env file."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings. GROQ_API_KEY stays empty until a real key is provided."""

    groq_api_key: str = ""
    database_url: str = "sqlite:///./jansahayak.db"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
