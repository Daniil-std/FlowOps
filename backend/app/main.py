import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import settings
from app.demos import router as demo_router
from app.errors import ImportErrorDetail
from app.routes import router

logger = logging.getLogger(__name__)


class UploadLimit:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] != "POST":
            await self.app(scope, receive, send)
            return
        limit = settings.max_file_bytes + 64 * 1024
        chunks: list[Message] = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > limit:
                response = JSONResponse(
                    status_code=413,
                    content={
                        "detail": {
                            "code": "file_too_large",
                            "message": "Files must be 5 MB or smaller.",
                        }
                    },
                )
                await response(scope, receive, send)
                return
            chunks.append(message)
            if not message.get("more_body", False):
                break
        iterator = iter(chunks)

        async def replay() -> Message:
            return next(iterator, {"type": "http.request", "body": b"", "more_body": False})

        await self.app(scope, replay, send)


app = FastAPI(title="FlowOps API", version="0.1.0")
app.add_middleware(UploadLimit)
app.include_router(router)
app.include_router(demo_router)


@app.exception_handler(ImportErrorDetail)
async def import_error(request: Request, exc: ImportErrorDetail) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status, content={"detail": {"code": exc.code, "message": exc.message}}
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "code": "invalid_request",
                "message": (
                    "The request is invalid. Check the file, import ID, or pagination values."
                ),
            }
        },
    )


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.error("Database operation failed (%s)", type(exc).__name__)
    return JSONResponse(
        status_code=503,
        content={
            "detail": {
                "code": "database_unavailable",
                "message": "The database is unavailable. Check PostgreSQL and try again.",
            }
        },
    )
