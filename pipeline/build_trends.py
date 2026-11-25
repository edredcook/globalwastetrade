"""Summarise every year's site data into trend files for the trend charts.

    python pipeline/build_trends.py

Writes site/data/trends.json for plastic waste (HS 3915) and
site/data/trends_<stream>.json for each waste that carries plastic amongst other
materials (whole-stream tonnes). For each figures view (0 = exporters' reports,
1 = importers' reports) and each year it stores world totals; per country, what it
sent abroad and received, in tonnes and US$; and tonnes between World Bank income
groups (exporter's group by recipient's group, using each year's classification).
The two views are kept apart and never added together.
"""
import json
from collections import defaultdict
from pathlib import Path

GROUPS = ["HIC", "UMC", "LMC", "LIC", "NS"]
SITE_DATA = Path(__file__).resolve().parent.parent / "site" / "data"


def summarise(years, per_year):
    """per_year: list of (routes, countries) for each year, routes in site format."""
    n = len(years)
    world = {v: {"t": [0] * n, "usd": [0] * n} for v in (0, 1)}
    countries = defaultdict(lambda: {v: defaultdict(lambda: [0] * n) for v in (0, 1)})
    groups = {v: [[[0] * len(GROUPS) for _ in GROUPS] for _ in range(n)] for v in (0, 1)}
    names = {}
    for i, (routes, cs) in enumerate(per_year):
        inc = {c: (v[2] if v[2] in GROUPS else "NS") for c, v in cs.items()}
        for v, ex, rc, t, usd, est in routes:
            if ex == rc:
                continue
            ex, rc = str(ex), str(rc)
            for c in (ex, rc):
                if c in cs:
                    names[c] = cs[c][:2]
            world[v]["t"][i] += t
            world[v]["usd"][i] += usd
            countries[ex][v]["out_t"][i] += t
            countries[ex][v]["out_usd"][i] += usd
            countries[rc][v]["in_t"][i] += t
            countries[rc][v]["in_usd"][i] += usd
            groups[v][i][GROUPS.index(inc.get(ex, "NS"))][GROUPS.index(inc.get(rc, "NS"))] += t
    rnd = lambda xs: [round(x) for x in xs]
    return {
        "years": years,
        "world": {str(v): {k: rnd(s) for k, s in w.items()} for v, w in world.items()},
        "groups": GROUPS,
        "income_flows": {str(v): [[rnd(row) for row in m] for m in groups[v]] for v in (0, 1)},
        "names": {c: names[c] for c in sorted(names, key=int)},
        "countries": {c: {str(v): {k: rnd(s) for k, s in ser.items()} for v, ser in vs.items()}
                      for c, vs in sorted(countries.items(), key=lambda kv: int(kv[0]))},
    }


def write(name, out):
    with open(SITE_DATA / name, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)


def main():
    files = sorted(SITE_DATA.glob("plastic_*.json"), key=lambda p: int(p.stem.split("_")[1]))
    years = [int(p.stem.split("_")[1]) for p in files]
    data = [json.loads(p.read_text(encoding="utf-8")) for p in files]
    write("trends.json", summarise(years, [(d["routes"], d["countries"]) for d in data]))
    streams = sorted({k for d in data for k in d.get("hidden", {})})
    for k in streams:
        write(f"trends_{k}.json", summarise(years, [(d.get("hidden", {}).get(k, []), d["countries"]) for d in data]))
    print(f"Wrote trends for {len(years)} years: plastic and {len(streams)} mixed streams ({', '.join(streams)}).")


if __name__ == "__main__":
    main()
