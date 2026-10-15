from datetime import UTC, datetime
from functools import lru_cache
from typing import Literal
from uuid import UUID

from fastapi import APIRouter
from fastapi.responses import Response

from app.analytics import calculate_analytics
from app.exports import export_csv, export_issues, export_xlsx
from app.processing import process_file
from app.sample import messy_sample_csv, sample_csv
from app.schemas import Analytics, ImportDetail

DemoKind = Literal["clean", "issues"]
router = APIRouter(prefix="/api/demos")


@lru_cache(maxsize=2)
def demo_report(kind: DemoKind) -> ImportDetail:
    content = sample_csv() if kind == "clean" else messy_sample_csv()
    filename = f"fictional-stationery-{kind}.csv"
    result = process_file(content, filename)
    return ImportDetail.model_validate(
        {
            "id": UUID(int=1 if kind == "clean" else 2),
            "filename": filename,
            "currency": "USD",
            "processing_version": 2,
            "file_size": len(content),
            "created_at": datetime(2026, 9, 25, tzinfo=UTC),
            "status": result.status,
            "total_rows": result.total_rows,
            "valid_rows": len(result.records),
            "duplicate_rows": result.duplicate_rows,
            "invalid_rows": result.invalid_rows,
            "issue_count": len(result.issues),
            "normalized_rows": result.normalized_rows,
            "records": result.records,
            "issues": result.issues,
            "changes": result.changes,
            "column_changes": result.column_changes,
        }
    )


@router.get("/{kind}", response_model=ImportDetail)
def get_demo(kind: DemoKind) -> ImportDetail:
    return demo_report(kind)


@router.get("/{kind}/analytics", response_model=Analytics)
def demo_analytics(kind: DemoKind) -> Analytics:
    return calculate_analytics(
        [row.model_dump(mode="json") for row in demo_report(kind).records]
    ).model_copy(update={"currency": "USD"})


@router.get("/{kind}/source")
def demo_source(kind: DemoKind) -> Response:
    content = sample_csv() if kind == "clean" else messy_sample_csv()
    return Response(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="flowops-demo-{kind}-USD.csv"'},
    )


@router.get("/{kind}/export/{format}")
def demo_export(kind: DemoKind, format: Literal["csv", "xlsx"]) -> Response:
    records = [row.model_dump(mode="json") for row in demo_report(kind).records]
    filename = f"flowops-demo-{kind}-USD-cleaned.{format}"
    return Response(
        export_csv(records) if format == "csv" else export_xlsx(records),
        media_type="text/csv"
        if format == "csv"
        else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{kind}/issues.csv")
def demo_issues(kind: DemoKind) -> Response:
    return Response(
        export_issues([issue.model_dump() for issue in demo_report(kind).issues]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="flowops-demo-{kind}-issues.csv"'},
    )
