from decimal import ROUND_HALF_UP, Decimal
from typing import Any

import pandas as pd

from app.schemas import Analytics, ProductStat, RevenuePoint


def amount(cents: int) -> str:
    return f"{Decimal(cents) / 100:.2f}"


def calculate_analytics(records: list[dict[str, Any]]) -> Analytics:
    if not records:
        return Analytics(
            revenue="0.00",
            orders=0,
            average_order_value="0.00",
            units=0,
            revenue_over_time=[],
            top_products=[],
        )
    frame = pd.DataFrame(records)
    # Integer cents keep aggregation exact; input bounds keep the sum within int64.
    frame["revenue_cents"] = (
        frame["unit_price"].map(lambda value: int(Decimal(value) * 100)) * frame["quantity"]
    )
    revenue = int(frame["revenue_cents"].sum())
    orders = int(frame["order_id"].nunique())
    average = (Decimal(revenue) / 100 / orders).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    daily = frame.groupby("date", sort=True)["revenue_cents"].sum()
    products = frame.groupby("product", as_index=False).agg(
        quantity=("quantity", "sum"), revenue_cents=("revenue_cents", "sum")
    )
    products = products.sort_values(
        ["quantity", "revenue_cents", "product"], ascending=[False, False, True]
    ).head(5)
    return Analytics(
        revenue=amount(revenue),
        orders=orders,
        average_order_value=str(average),
        units=int(frame["quantity"].sum()),
        revenue_over_time=[
            RevenuePoint(date=str(day), revenue=amount(int(value))) for day, value in daily.items()
        ],
        top_products=[
            ProductStat(
                product=row["product"],
                quantity=int(row["quantity"]),
                revenue=amount(int(row["revenue_cents"])),
            )
            for row in products.to_dict("records")
        ],
    )
