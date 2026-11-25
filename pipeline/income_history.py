"""Turn the World Bank's historical income classification (OGHIST.xlsx) into
pipeline/reference/income_history.json, read by build_site_data.py.

    python pipeline/income_history.py path/to/OGHIST.xlsx

The file is at https://ddh-openapi.worldbank.org/resources/DR0095334/download
(linked as "historical classification by income" from the World Bank's
"World Bank Country and Lending Groups" page). Needs openpyxl.

Groups are keyed by the GNI data year, so a trade year uses the classification
built on that same year's GNI (data year 2023 is the FY25 classification).
"""
import json
import sys
from pathlib import Path

import openpyxl

OUT = Path(__file__).resolve().parent / "reference" / "income_history.json"
CODES = {"L": "LIC", "LM": "LMC", "LM*": "LMC", "UM": "UMC", "H": "HIC"}


def main(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(wb["Country Analytical History"].iter_rows(values_only=True))
    head = next(i for i, r in enumerate(rows) if r[1] and str(r[1]).startswith("Data for calendar year"))
    years = {j: int(y) for j, y in enumerate(rows[head]) if isinstance(y, (int, float))}
    groups = {}
    for r in rows[head + 1:]:
        iso = r[0]
        if not iso or not isinstance(iso, str) or len(iso) != 3 or not iso.isupper():
            continue
        g = {str(years[j]): CODES[r[j]] for j in years if j < len(r) and r[j] in CODES}
        if g:
            groups[iso] = g
    out = {
        "source": "World Bank, historical income classifications (OGHIST), "
                  "https://ddh-openapi.worldbank.org/resources/DR0095334/download",
        "years": [min(years.values()), max(years.values())],
        "groups": groups,
    }
    OUT.write_text(json.dumps(out, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(f"Wrote {OUT} ({len(groups)} economies, data years {out['years'][0]} to {out['years'][1]})")


if __name__ == "__main__":
    main(sys.argv[1])
