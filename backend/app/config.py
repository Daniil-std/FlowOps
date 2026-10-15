import os

from pydantic import BaseModel, Field


class Settings(BaseModel):
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql+psycopg://flowops:flowops@localhost:5432/flowops"
    )
    max_file_bytes: int = Field(default=5 * 1024 * 1024, gt=0)
    max_rows: int = Field(default=10_000, gt=0)
    max_expanded_bytes: int = 50 * 1024 * 1024


settings = Settings()
