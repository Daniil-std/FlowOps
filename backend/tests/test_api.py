import csv
import os
from collections.abc import Generator
from io import StringIO
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.db import get_session
from app.main import app
from app.sample import sample_csv


@pytest.mark.integration
def test_migration_preserves_legacy_reports_without_guessing_currency(
    database_client: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, factory = database_client
    job = client.post(
        "/api/imports",
        data={"currency": "USD"},
        files={"file": ("legacy.csv", sample_csv())},
    ).json()
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).parents[1] / "migrations"))
    with factory().get_bind().begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "001")
        command.upgrade(config, "head")
    restored = client.get(f"/api/imports/{job['id']}").json()
    assert restored["currency"] is None
    assert restored["processing_version"] == 1
    assert restored["records"] == job["records"]
    assert restored["issues"] == job["issues"]
    assert restored["created_at"] == job["created_at"]


@pytest.fixture
def client() -> Generator[TestClient]:
    def session() -> Generator[Session]:
        with Session() as db:
            yield db

    app.dependency_overrides[get_session] = session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_upload_errors(client: TestClient) -> None:
    for filename, data, status, code in [
        ("a.exe", b"hi", 415, "unsupported_file"),
        ("a.xlsx", b"broken", 422, "malformed_xlsx"),
        ("a.csv", b"a" * (settings.max_file_bytes + 1), 413, "file_too_large"),
        ("a.csv", b"a" * (settings.max_file_bytes + 100_000), 413, "file_too_large"),
        ("a.csv", b"wrong,columns\n1,2", 422, "invalid_columns"),
    ]:
        response = client.post(
            "/api/imports", data={"currency": "USD"}, files={"file": (filename, data)}
        )
        assert response.status_code == status
        assert response.json()["detail"]["code"] == code


def test_missing_upload_and_invalid_request(client: TestClient) -> None:
    assert client.post("/api/imports").status_code == 422
    assert client.get("/api/imports/not-a-uuid").json()["detail"]["code"] == "invalid_request"
    assert client.get("/api/imports?limit=101").status_code == 422


def test_sample_download(client: TestClient) -> None:
    response = client.get("/api/sample")
    assert response.status_code == 200
    assert response.content == sample_csv()
    assert 'filename="flowops-example.csv"' in response.headers["Content-Disposition"]


@pytest.mark.parametrize("currency", [None, "", "JPY", "usd", "USD,EUR"])
def test_currency_must_be_explicit_and_supported(client: TestClient, currency: str | None) -> None:
    response = client.post(
        "/api/imports",
        data={} if currency is None else {"currency": currency},
        files={"file": ("example.csv", sample_csv())},
    )
    assert response.status_code == 422


def test_demos_are_stable_and_work_without_a_database(client: TestClient) -> None:
    # The client fixture supplies an unbound session: any database query would fail.
    for kind in ["clean", "issues"]:
        first = client.get(f"/api/demos/{kind}")
        assert first.status_code == 200
        assert client.get(f"/api/demos/{kind}").json() == first.json()
        assert first.json()["currency"] == "USD"
        analytics = client.get(f"/api/demos/{kind}/analytics").json()
        assert analytics["revenue"] == "3445.00"
        assert analytics["currency"] == "USD"
        for suffix in ["source", "export/csv", "export/xlsx", "issues.csv"]:
            assert client.get(f"/api/demos/{kind}/{suffix}").status_code == 200
    messy = client.get("/api/demos/issues").json()
    assert (
        messy["total_rows"],
        messy["valid_rows"],
        messy["duplicate_rows"],
        messy["invalid_rows"],
    ) == (56, 48, 2, 6)
    assert messy["changes"]


@pytest.fixture
def database_client() -> Generator[tuple[TestClient, sessionmaker[Session]]]:
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests")
    schema = f"test_{uuid4().hex}"
    admin = create_engine(url)
    with admin.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
    factory = sessionmaker(engine)
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).parents[1] / "migrations"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")

    def session() -> Generator[Session]:
        with factory() as db:
            yield db

    app.dependency_overrides[get_session] = session
    try:
        with TestClient(app) as test_client:
            yield test_client, factory
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin.dispose()


@pytest.mark.integration
def test_import_persists_and_reopens(
    database_client: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, factory = database_client
    response = client.post(
        "/api/imports", data={"currency": "USD"}, files={"file": ("example.csv", sample_csv())}
    )
    assert response.status_code == 201, response.text
    job = response.json()
    assert job["valid_rows"] == 48
    assert job["status"] == "ready"
    assert job["currency"] == "USD"
    assert job["processing_version"] == 2
    assert client.get("/api/health").json()["database"] == "ready"
    assert client.get("/api/imports").json()["total"] == 1
    assert "records" not in client.get("/api/imports").json()["items"][0]
    assert client.get(f"/api/imports/{job['id']}/analytics").json()["orders"] == 24
    assert client.get(f"/api/imports/{job['id']}/analytics").json()["currency"] == "USD"
    for _ in range(2):
        assert client.get("/api/demos/issues").status_code == 200
    assert client.get("/api/imports").json()["total"] == 1
    # New database connections and a fresh client must not depend on in-memory job state.
    factory.kw["bind"].dispose()
    with TestClient(app) as reopened:
        report = reopened.get(f"/api/imports/{job['id']}").json()
        assert report["records"] == job["records"]
        for format in ["csv", "xlsx"]:
            export = reopened.get(f"/api/imports/{job['id']}/export/{format}")
            assert export.status_code == 200
            assert len(export.content) > 100
            assert "attachment" in export.headers["Content-Disposition"]
            assert "-USD-cleaned." in export.headers["Content-Disposition"]
    with factory() as session:
        assert session.scalar(text("SELECT count(*) FROM imports")) == 1
        assert session.scalar(text("SELECT jsonb_array_length(records) FROM imports")) == 48


@pytest.mark.integration
def test_issue_persistence_and_empty_export(
    database_client: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = database_client
    content = b"order_id,date,customer,product,quantity,unit_price\n1,bad,Mira,Book,0,-1"
    response = client.post(
        "/api/imports", data={"currency": "USD"}, files={"file": ("bad.csv", content)}
    )
    assert response.status_code == 201
    job = response.json()
    assert job["invalid_rows"] == 1
    assert job["issue_count"] == 3
    assert job["status"] == "no_valid_rows"
    assert client.get(f"/api/imports/{job['id']}").json()["issues"] == job["issues"]
    assert client.get(f"/api/imports/{job['id']}/export/csv").status_code == 409
    assert client.get(f"/api/imports/{job['id']}/analytics").json()["revenue"] == "0.00"
    issues = client.get(f"/api/imports/{job['id']}/issues.csv")
    assert issues.status_code == 200
    rows = list(csv.DictReader(StringIO(issues.content.decode("utf-8-sig"))))
    assert len(rows) == 3
    assert set(rows[0]) == {"source_row", "column", "code", "explanation"}
    assert {row["source_row"] for row in rows} == {"2"}
    assert {row["code"] for row in rows} == {
        "invalid_date",
        "invalid_quantity",
        "invalid_unit_price",
    }
    assert client.get(f"/api/imports/{uuid4()}").status_code == 404
    assert client.get("/api/imports?offset=1").json()["items"] == []
