import csv
from datetime import date, timedelta
from io import StringIO

from app.reading import COLUMNS


def messy_sample_csv() -> bytes:
    rows = list(csv.reader(StringIO(sample_csv().decode("utf-8"))))
    rows[1][2] = "  Mira Ellis  "
    rows[1][5] = "18.5"
    rows[3][1] = rows[3][1].replace("-", "/")
    rows.append(list(rows[2]))
    normalized = list(rows[1])
    normalized[2] = normalized[2].strip()
    normalized[5] = "18.50"
    rows.append(normalized)
    rows.extend(
        [
            ["FO-9001", "2026-02-30", "Iris Hayes", "Weekly planner", "1", "28.50"],
            ["FO-9002", "2026-09-04", "", "Brass bookmark", "2", "12.00"],
            ["FO-9003", "2026-09-05", "Theo Bennett", "Linen pencil case", "0", "24.00"],
            ["FO-9004", "2026-09-06", "Alex Morgan", "Ceramic desk tray", "1", "-32.00"],
            ["FO-9010", "2026-09-10", "Lena Brooks", "Weekly planner", "1", "28.50"],
            ["FO-9010", "2026-09-11", "Noah Reed", "Brass bookmark", "2", "12.00"],
        ]
    )
    output = StringIO(newline="")
    csv.writer(output).writerows(rows)
    return output.getvalue().encode("utf-8")


def sample_csv() -> bytes:
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(COLUMNS)
    customers = [
        "Mira Ellis",
        "Theo Bennett",
        "Alex Morgan",
        "Lena Brooks",
        "Noah Reed",
        "Iris Hayes",
    ]
    products = [
        ("Everyday notebook", "18.50"),
        ("Ceramic desk tray", "32.00"),
        ("Linen pencil case", "24.00"),
        ("Weekly planner", "28.50"),
        ("Brass bookmark", "12.00"),
    ]
    for index in range(48):
        product, price = products[(index * 7 + index // 5) % len(products)]
        writer.writerow(
            [
                f"FO-{1040 + index // 2}",
                (date(2026, 9, 1) + timedelta(days=index // 2)).isoformat(),
                customers[(index // 2) % len(customers)],
                product,
                1 + (index * 3 + index // 4) % 5,
                price,
            ]
        )
    return output.getvalue().encode("utf-8")
