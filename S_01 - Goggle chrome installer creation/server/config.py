from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SUMMARYGO_", env_file=".env", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8765
    http_timeout: float = 15.0
    summary_sentences: int = 5
    max_body_chars: int = 120_000


settings = Settings()
