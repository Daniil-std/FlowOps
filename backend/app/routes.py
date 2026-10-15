from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, defer

from app.analytics import calculate_analytics
from app.config import settings
from app.db import get_session
from app.errors import ImportErrorDetail
from app.exports import export_csv, export_issues, export_xlsx, safe_filename
from app.models import ImportJob
from app.processing import process_file
from app.sample import sample_csv
from app.schemas import Analytics, Currency, ImportDetail, ImportPage

router = APIRouter(prefix="/api")
Database = Annotated[Session, Depends(get_session)]


def find_import(import_id: UUID, session: Session) -> ImportJob:
    job = session.get(ImportJob, import_id)
    if job is None:
        raise HTTPException(
            404, detail={"code": "not_found", "message": "This import could not be found."}
        )
    return job


@router.get("/health")
def health(session: Database) -> dict[str, str]:
    try:
        session.execute(text("SELECT 1 FROM imports LIMIT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            503,
            detail={
                "code": "database_unavailable",
                "message": "The database is not ready. Check the connection and migrations.",
            },
        ) from exc
    return {"status": "ok", "database": "ready"}


@router.get("/sample")
def sample() -> Response:
    return Response(
        sample_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="flowops-example.csv"'},
    )


@router.post("/imports", response_model=ImportDetail, status_code=201)
def create_import(
    file: UploadFile, currency: Annotated[Currency, Form()], session: Database
) -> ImportJob:
    filename = safe_filename(file.filename or "upload")
    try:
        content = file.file.read(settings.max_file_bytes + 1)
    finally:
        file.file.close()
    processed = process_file(content, filename)
    job = ImportJob(
        filename=filename,
        currency=currency,
        processing_version=2,
        file_size=len(content),
        status=processed.status,
        total_rows=processed.total_rows,
        valid_rows=len(processed.records),
        duplicate_rows=processed.duplicate_rows,
        invalid_rows=processed.invalid_rows,
        issue_count=len(processed.issues),
        normalized_rows=processed.normalized_rows,
        records=[record.model_dump(mode="json") for record in processed.records],
        issues=[issue.model_dump() for issue in processed.issues],
        changes=[change.model_dump() for change in processed.changes],
        column_changes=processed.column_changes,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


@router.get("/imports", response_model=ImportPage)
def list_imports(
    session: Database, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)
) -> dict[str, object]:
    query = (
        select(ImportJob)
        .options(
            defer(ImportJob.records),
            defer(ImportJob.issues),
            defer(ImportJob.changes),
            defer(ImportJob.column_changes),
        )
        .order_by(ImportJob.created_at.desc(), ImportJob.id.desc())
        .offset(offset)
        .limit(limit)
    )
    return {
        "items": session.scalars(query).all(),
        "total": session.scalar(select(func.count()).select_from(ImportJob)),
        "limit": limit,
        "offset": offset,
    }


@router.get("/imports/{import_id}", response_model=ImportDetail)
def get_import(import_id: UUID, session: Database) -> ImportJob:
    return find_import(import_id, session)


@router.get("/imports/{import_id}/analytics", response_model=Analytics)
def analytics(import_id: UUID, session: Database) -> Analytics:
    job = find_import(import_id, session)
    return calculate_analytics(job.records).model_copy(update={"currency": job.currency})


@router.get("/imports/{import_id}/export/{format}")
def download(import_id: UUID, format: Literal["csv", "xlsx"], session: Database) -> Response:
    job = find_import(import_id, session)
    if not job.records:
        raise ImportErrorDetail("no_valid_rows", "There are no valid rows to export.", 409)
    content = export_csv(job.records) if format == "csv" else export_xlsx(job.records)
    media_type = (
        "text/csv"
        if format == "csv"
        else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    filename = f"flowops-{job.id}-{job.currency or 'unspecified'}-cleaned.{format}"
    return Response(
        content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/imports/{import_id}/issues.csv")
def download_issues(import_id: UUID, session: Database) -> Response:
    job = find_import(import_id, session)
    return Response(
        export_issues(job.issues),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="flowops-{job.id}-issues.csv"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
