"""Generate fictional browser parity cases using the Python processor as the reference."""

import base64
import csv
import json
import sys
from datetime import datetime
from io import BytesIO, StringIO
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.analytics import calculate_analytics  # noqa: E402
from app.errors import ImportErrorDetail  # noqa: E402
from app.processing import process_file  # noqa: E402
from app.reading import COLUMNS  # noqa: E402
from openpyxl import Workbook  # noqa: E402

VALID = ["001", "2026-09-01", "Mira", "Notebook", "2", "18.50"]


def csv_bytes(rows, headers=COLUMNS):
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    return output.getvalue().encode("utf-8-sig")


def xlsx_bytes(rows, *, extra_sheet=False, date1904=False):
    from openpyxl.utils.datetime import CALENDAR_MAC_1904

    book = Workbook()
    if date1904:
        book.epoch = CALENDAR_MAC_1904
    sheet = book.active
    sheet.append(COLUMNS)
    for row in rows:
        sheet.append(row)
    if extra_sheet:
        book.create_sheet("Extra")
    output = BytesIO()
    book.save(output)
    book.close()
    return output.getvalue()


def generate():
    cases = []

    def add(name, content, suffix="csv"):
        case = {
            "name": name,
            "filename": f"{name}.{suffix}",
            "content": base64.b64encode(content).decode(),
        }
        try:
            result = process_file(content, case["filename"])
            records = [row.model_dump(mode="json") for row in result.records]
            case["expected"] = {
                "total_rows": result.total_rows,
                "invalid_rows": result.invalid_rows,
                "duplicate_rows": result.duplicate_rows,
                "normalized_rows": result.normalized_rows,
                "status": result.status,
                "records": records,
                "issues": [
                    {"row": item.row, "column": item.column, "code": item.code}
                    for item in result.issues
                ],
                "changes": [item.model_dump() for item in result.changes],
                "column_changes": result.column_changes,
            }
            case["analytics"] = calculate_analytics(records).model_dump(exclude={"currency"})
        except ImportErrorDetail as error:
            case["error"] = error.code
        cases.append(case)

    add(
        "literal-ids",
        csv_bytes([VALID, ["002", "2026/09/02", "NA", "NULL", "+3.0", "0"]]),
    )
    add(
        "normalization",
        csv_bytes(
            [
                [" 001 ", "2026/09/01", " Mira ", " Notebook ", "+2.0", "1,234.50"],
                ["001", "2026-09-01", "Mira", "Notebook", "2", "1234.50"],
            ],
            [f" {c.upper()} " for c in COLUMNS],
        ),
    )
    add(
        "exact-duplicates",
        csv_bytes([VALID, VALID, [*VALID[:3], "Planner", "1", "28.00"]]),
    )
    add(
        "conflicting-date",
        csv_bytes([VALID, [VALID[0], "2026-09-02", *VALID[2:]], VALID]),
    )
    add(
        "conflicting-invalid-item",
        csv_bytes([VALID, [VALID[0], "2026-09-02", *VALID[2:4], "0", VALID[5]]]),
    )
    add("conflicting-customer", csv_bytes([VALID, [*VALID[:2], "Other", *VALID[3:]]]))
    add(
        "blank-and-multiline",
        b'order_id,date,customer,product,quantity,unit_price\n1,2026-09-01,"Mira\nEllis",Book,1,2\n\n2,bad,Mira,Book,1,2\n',
    )
    add(
        "decimal-rounding",
        csv_bytes([["1", *VALID[1:4], "1", "0.01"], ["2", *VALID[1:4], "1", "0.00"]]),
    )
    add(
        "signed-zero",
        csv_bytes([[*VALID[:5], "-0.00"], [*VALID[:5], "0"], [*VALID[:4], "3", "0.00"]]),
    )
    add(
        "unicode",
        csv_bytes([["1", "2024-02-29", "Łukasz", "📚" * 200, "01", "0001.200"]]),
    )
    for column, values in {
        "date": [
            "01/09/2026",
            "2026-02-30",
            "2026-01/01",
            "2026-01-01T12:00:00",
            "0000-01-01",
            "2026-01-01T00:00:00",
        ],
        "quantity": ["0", "-2", "1.5", "ten", "1000001", "2.000000000000000001"],
        "unit_price": [
            "-0.01",
            "NaN",
            "inf",
            "1,23",
            "1,234",
            "1.234",
            "1000001",
            "1000000.0000000001",
            "1e2",
            "1.0000000000000001",
        ],
        "product": ["x" * 201],
        "customer": ["a\x01b"],
    }.items():
        for index, value in enumerate(values):
            row = VALID.copy()
            row[COLUMNS.index(column)] = value
            add(f"value-{column}-{index}", csv_bytes([row]))
    for column in COLUMNS:
        row = VALID.copy()
        row[COLUMNS.index(column)] = "  "
        add(f"missing-{column}", csv_bytes([row]))
    for name, headers in [
        ("missing-header", COLUMNS[:-1]),
        ("extra-header", [*COLUMNS, "extra"]),
        ("duplicate-header", [*COLUMNS[:-1], " QUANTITY "]),
    ]:
        add(name, csv_bytes([VALID], headers))
    for name, content in [
        ("empty", b""),
        ("encoding", b"\xff\xfe"),
        ("null", b"\x00"),
        ("unclosed-quote", csv_bytes([]) + b'"bad'),
        ("bad-quote", csv_bytes([]) + b'"bad"x,1,2,3,4,5'),
        ("extra-cell", csv_bytes([VALID + ["extra"]])),
        ("header-only", csv_bytes([])),
    ]:
        add(name, content)
    for name in ["clean", "issues"]:
        add(f"demo-{name}", (ROOT / f"demo/public/demo/{name}-source.csv").read_bytes())
    for name, rows in [
        ("excel-date", [[VALID[0], datetime(2026, 9, 1), *VALID[2:]]]),
        ("excel-time", [[VALID[0], datetime(2026, 9, 1, 12), *VALID[2:]]]),
        ("excel-formula", [[*VALID[:5], "=1+1"]]),
        ("excel-blank", [VALID, [], ["2", *VALID[1:]]]),
        ("excel-leading-blank", [[], VALID]),
        ("excel-trailing-blank", [VALID, []]),
    ]:
        add(name, xlsx_bytes(rows), "xlsx")
    add(
        "excel-1904",
        xlsx_bytes([[VALID[0], datetime(2026, 9, 1), *VALID[2:]]], date1904=True),
        "xlsx",
    )
    add("excel-multiple", xlsx_bytes([VALID], extra_sheet=True), "xlsx")
    add("excel-invalid", b"not excel", "xlsx")
    for name, replacement in [
        ("excel-bad-xml", b"<worksheet><broken"),
        ("excel-fake-dimension", None),
    ]:
        output = BytesIO()
        with (
            ZipFile(BytesIO(xlsx_bytes([VALID]))) as source,
            ZipFile(output, "w") as target,
        ):
            for member in source.infolist():
                data = source.read(member.filename)
                if member.filename == "xl/worksheets/sheet1.xml":
                    data = replacement if replacement else data.replace(b"A1:F2", b"A1:XFD1048576")
                target.writestr(member, data)
        add(name, output.getvalue(), "xlsx")
    path = ROOT / "demo/src/test/python-fixtures.json"
    path.write_text(json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(cases)} Python reference cases: {path}")


if __name__ == "__main__":
    generate()
