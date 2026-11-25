"""Summarise every year's site data into site/data/trends.json for the trend charts.

    python pipeline/build_trends.py

For each figures view (0 = exporters' reports, 1 = importers' reports) and each
year it stores world totals and, per country, what it sent abroad and received,
in tonnes and US$. The two views are kept apart and never added together.
"""
import json
from collections import defaultdict
from pathlib import Path

SITE_DATA = Path(__file__).resolve().parent.parent / "site" / "data"


def main():
    files = sorted(SITE_DATA.glob("plastic_*.json"), key=lambda p: int(p.stem.split("_")[1]))
    years = [int(p.stem.split("_")[1]) for p in files]
    n = len(years)
    world = {v: {"t": [0] * n, "usd": [0] * n} for v in (0, 1)}
    # countries[code][view][series] -> list per year; series: out_t, out_usd, in_t, in_usd
    countries = defaultdict(lambda: {v: defaultdict(lambda: [0] * n) for v in (0, 1)})
    for i, p in enumerate(files):
        d = json.loads(p.read_text(encoding="utf-8"))
        for v, ex, rc, t, usd, est in d["routes"]:
            if ex == rc:
                continue
            world[v]["t"][i] += t
            world[v]["usd"][i] += usd
            countries[str(ex)][v]["out_t"][i] += t
            countries[str(ex)][v]["out_usd"][i] += usd
            countries[str(rc)][v]["in_t"][i] += t
            countries[str(rc)][v]["in_usd"][i] += usd
    rnd = lambda xs: [round(x) for x in xs]
    out = {
        "years": years,
        "world": {str(v): {k: rnd(s) for k, s in w.items()} for v, w in world.items()},
        "countries": {c: {str(v): {k: rnd(s) for k, s in ser.items()} for v, ser in vs.items()}
                      for c, vs in sorted(countries.items(), key=lambda kv: int(kv[0]))},
    }
    with open(SITE_DATA / "trends.json", "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"Wrote trends for {n} years and {len(out['countries'])} countries.")


if __name__ == "__main__":
    main()
