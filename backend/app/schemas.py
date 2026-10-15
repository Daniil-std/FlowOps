from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

Currency = Literal["USD", "EUR", "GBP", "PLN"]


class Record(BaseModel):
    source_row: int
    order_id: str
    date: date
    customer: str
    product: str
    quantity: int
    unit_price: str


class Issue(BaseModel):
    row: int
    column: str
    code: str
    message: str


class ImportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    currency: Currency | None
    processing_version: int
    file_size: int
    created_at: datetime
    status: Literal["ready", "needs_review", "no_valid_rows"]
    total_rows: int
    valid_rows: int
    duplicate_rows: int
    invalid_rows: int
    issue_count: int
    normalized_rows: int


class ImportDetail(ImportSummary):
    records: list[Record]
    issues: list[Issue]
    changes: list[Issue]
    column_changes: list[str]


class ImportPage(BaseModel):
    items: list[ImportSummary]
    total: int
    limit: int
    offset: int


class RevenuePoint(BaseModel):
    date: str
    revenue: str


class ProductStat(BaseModel):
    product: str
    quantity: int
    revenue: str


class Analytics(BaseModel):
    currency: Currency | None = None
    revenue: str
    orders: int
    average_order_value: str
    units: int
    revenue_over_time: list[RevenuePoint]
    top_products: list[ProductStat]
