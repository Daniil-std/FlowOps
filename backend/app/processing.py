import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from app.reading import COLUMNS, read_sheet
from app.schemas import Issue, Record

NUMBER = re.compile(r"^[+-]?\d+(?:\.\d+)?$")
GROUPED_NUMBER = re.compile(r"^[+-]?\d{1,3}(?:,\d{3})+\.\d{1,2}$")
CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


@dataclass
class Processed:
    total_rows: int
    records: list[Record] = field(default_factory=list)
    issues: list[Issue] = field(default_factory=list)
    changes: list[Issue] = field(default_factory=list)
    column_changes: list[str] = field(default_factory=list)
    duplicate_rows: int = 0
    invalid_rows: int = 0

    @property
    def normalized_rows(self) -> int:
        return len({change.row for change in self.changes})

    @property
    def status(self) -> str:
        if not self.records:
            return "no_valid_rows"
        return "needs_review" if self.issues else "ready"


def parse_date(value: str) -> str:
    if re.fullmatch(r"\d{4}[-/]\d{2}[-/]\d{2}", value) and value[4] == value[7]:
        return date.fromisoformat(value.replace("/", "-")).isoformat()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}T00:00:00", value):
        return datetime.fromisoformat(value).date().isoformat()
    raise ValueError("Use YYYY-MM-DD, YYYY/MM/DD, or an Excel date without a time.")


def parse_number(value: str, column: str) -> Decimal:
    normalized = value.replace(",", "") if GROUPED_NUMBER.fullmatch(value) else value
    if not NUMBER.fullmatch(normalized):
        raise ValueError(
            "Use a plain number with a decimal point; ambiguous separators are rejected."
        )
    try:
        number = Decimal(normalized)
    except InvalidOperation as exc:
        raise ValueError("Enter a valid finite number.") from exc
    if abs(number) > 1_000_000:
        raise ValueError("The maximum supported value is 1,000,000.")
    if column == "quantity":
        if number <= 0 or number != number.to_integral_value():
            raise ValueError("Quantity must be a positive whole number.")
    elif number < 0 or number != number.quantize(Decimal("0.01")):
        raise ValueError("Unit price must be non-negative with at most two decimal places.")
    return Decimal(0) if number == 0 else number


def process_file(content: bytes, filename: str) -> Processed:
    sheet = read_sheet(content, filename)
    result = Processed(total_rows=len(sheet.frame), column_changes=sheet.column_changes)
    candidates: list[tuple[Record, tuple[str, ...], list[Issue]]] = []
    identities: dict[str, set[tuple[str, str]]] = {}
    identity_rows: dict[int, str] = {}
    for values, row_number in zip(
        sheet.frame[COLUMNS].itertuples(index=False, name=None), sheet.source_rows, strict=True
    ):
        raw = dict(zip(COLUMNS, values, strict=True))
        cleaned = {column: value.strip() for column, value in raw.items()}
        row_issues: list[Issue] = []
        row_changes: list[Issue] = []
        for column, value in cleaned.items():
            error = None
            if column in sheet.formulas.get(row_number, []):
                error = (
                    "Excel formulas are not supported. Replace the formula with a literal value."
                )
            elif not value:
                error = "A required value is missing."
            elif CONTROL.search(value):
                error = "Control characters are not supported."
            elif len(value) > 200:
                error = "Values must contain at most 200 characters."
            if error:
                row_issues.append(
                    Issue(row=row_number, column=column, code="invalid_value", message=error)
                )
                continue
            if raw[column] != value:
                row_changes.append(
                    Issue(
                        row=row_number,
                        column=column,
                        code="whitespace",
                        message="Trimmed surrounding whitespace.",
                    )
                )
            try:
                if column == "date":
                    cleaned[column] = parse_date(value)
                elif column in {"quantity", "unit_price"}:
                    number = parse_number(value, column)
                    cleaned[column] = str(int(number)) if column == "quantity" else f"{number:.2f}"
                if cleaned[column] != value:
                    row_changes.append(
                        Issue(
                            row=row_number,
                            column=column,
                            code="format",
                            message=f"Normalized {value} to {cleaned[column]}.",
                        )
                    )
            except ValueError as exc:
                row_issues.append(
                    Issue(row=row_number, column=column, code=f"invalid_{column}", message=str(exc))
                )
        if not {issue.column for issue in row_issues} & {"order_id", "date", "customer"}:
            identities.setdefault(cleaned["order_id"], set()).add(
                (cleaned["date"], cleaned["customer"])
            )
            identity_rows[row_number] = cleaned["order_id"]
        if row_issues:
            result.invalid_rows += 1
            result.issues.extend(row_issues)
            continue
        candidates.append(
            (
                Record.model_validate({"source_row": row_number, **cleaned}),
                tuple(values),
                row_changes,
            )
        )

    conflicting = {order_id for order_id, identity in identities.items() if len(identity) > 1}
    for row_number, order_id in identity_rows.items():
        if order_id in conflicting:
            result.issues.append(
                Issue(
                    row=row_number,
                    column="order_id",
                    code="order_conflict",
                    message=(
                        "This order ID has different dates or customers. All its rows are "
                        "excluded; correct the order identity and import again."
                    ),
                )
            )
    seen: dict[tuple[str, ...], tuple[int, tuple[str, ...]]] = {}
    for record, raw_values, row_changes in candidates:
        row_number = record.source_row
        if record.order_id in conflicting:
            result.invalid_rows += 1
            continue
        key = (
            record.order_id,
            str(record.date),
            record.customer,
            record.product,
            str(record.quantity),
            record.unit_price,
        )
        if key in seen:
            first_row, first_values = seen[key]
            result.duplicate_rows += 1
            result.issues.append(
                Issue(
                    row=row_number,
                    column="row",
                    code="duplicate" if raw_values == first_values else "normalized_duplicate",
                    message=(
                        f"Matches row {first_row} after normalization; excluded as a potential "
                        "duplicate. If both are real identical items, combine their quantities "
                        "in the source file and import again."
                    ),
                )
            )
            continue
        seen[key] = (row_number, raw_values)
        result.records.append(record)
        result.changes.extend(row_changes)
    result.issues.sort(key=lambda issue: (issue.row, issue.column, issue.code))
    return result
