"""Summarise every year's site data into trend files for the trend charts.

    python pipeline/build_trends.py

Writes site/data/trends.json for plastic waste (HS 3915) and
site/data/trends_<stream>.json for each waste that carries plastic amongst other
materials (whole-stream tonnes). For each figures view (0 = exporters' reports,
1 = importers' reports) and each year it stores world totals; per country, what it
sent abroad and received, in tonnes and US$; and tonnes between World Bank income
groups (exporter's group by recipient's group, using each year's classification).
The two views are kept apart and never added together.

It also writes site/data/flows.json and flows_<stream>.json: every route for every
year, per view, so the Trends page can filter by country, region and income group.
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


INC_CODE = {"HIC": "H", "UMC": "U", "LMC": "M", "LIC": "L", "NS": "N"}


def flows(years, per_year, schemes):
    """Compact route table. flows[view][i] is a flat list [ex, rc, tonnes, kUS$, ...] for
    year i, with ex and rc as indexes into codes. inc[k] holds one letter per year
    (H, U, M, L, N) for that year's World Bank group."""
    codes = sorted({str(c) for routes, _ in per_year for r in routes for c in (r[1], r[2])}, key=int)
    idx = {c: k for k, c in enumerate(codes)}
    names, inc = {}, {c: ["N"] * len(years) for c in codes}
    for i, (_, cs) in enumerate(per_year):
        for c, v in cs.items():
            if c in idx:
                names[c] = v[:2]
                inc[c][i] = INC_CODE.get(v[2], "N")
    out = {str(v): [[] for _ in years] for v in (0, 1)}
    for i, (routes, _) in enumerate(per_year):
        for v, ex, rc, t, usd, est in routes:
            ex, rc = str(ex), str(rc)
            if ex == rc or (round(t) == 0 and round(usd / 1000) == 0):
                continue
            out[str(v)][i] += [idx[ex], idx[rc], round(t), round(usd / 1000)]
    return {
        "years": years,
        "groups": GROUPS,
        "codes": codes,
        "names": [names.get(c, [c, "Code " + c]) for c in codes],
        "inc": ["".join(inc[c]) for c in codes],
        "regions": {k: [m.get(c, "") for c in codes] for k, m in schemes.items()},
        "flows": out,
    }


def write(name, out):
    with open(SITE_DATA / name, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)


def main():
    files = sorted(SITE_DATA.glob("plastic_*.json"), key=lambda p: int(p.stem.split("_")[1]))
    years = [int(p.stem.split("_")[1]) for p in files]
    data = [json.loads(p.read_text(encoding="utf-8")) for p in files]
    schemes = data[-1]["schemes"]
    per = [(d["routes"], d["countries"]) for d in data]
    write("trends.json", summarise(years, per))
    write("flows.json", flows(years, per, schemes))
    streams = sorted({k for d in data for k in d.get("hidden", {})})
    for k in streams:
        per = [(d.get("hidden", {}).get(k, []), d["countries"]) for d in data]
        write(f"trends_{k}.json", summarise(years, per))
        write(f"flows_{k}.json", flows(years, per, schemes))
    print(f"Wrote trends for {len(years)} years: plastic and {len(streams)} mixed streams ({', '.join(streams)}).")


if __name__ == "__main__":
    main()
