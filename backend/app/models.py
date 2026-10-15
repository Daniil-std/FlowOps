from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ImportJob(Base):
    __tablename__ = "imports"
    __table_args__ = (CheckConstraint("total_rows = valid_rows + duplicate_rows + invalid_rows"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    filename: Mapped[str] = mapped_column(String(180))
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    processing_version: Mapped[int] = mapped_column(Integer, default=2)
    file_size: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str] = mapped_column(String(24))
    total_rows: Mapped[int] = mapped_column(Integer)
    valid_rows: Mapped[int] = mapped_column(Integer)
    duplicate_rows: Mapped[int] = mapped_column(Integer)
    invalid_rows: Mapped[int] = mapped_column(Integer)
    issue_count: Mapped[int] = mapped_column(Integer)
    normalized_rows: Mapped[int] = mapped_column(Integer)
    records: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    issues: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    changes: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    column_changes: Mapped[list[str]] = mapped_column(JSONB)
