"""Turn a raw Comtrade download into the site's data file and a check report.

    python pipeline/build_site_data.py --year 2023

Reads  pipeline/raw/comtrade_hs3915_<year>.json and pipeline/reference/*.json
Writes site/data/plastic_<year>.json, site/data/manifest.json
       and pipeline/reports/hs3915_<year>.md

Data rules (from the July 2026 audit):
- one record per reporter, flow and partner: use the partner-2 "World" total
  where the reporter gives one, otherwise sum the partner-2 detail;
- customs procedure and transport mode totals only (C00, mode 0);
- exporter-reported and importer-reported figures are kept apart, never added;
- trade with "World" and a country's trade with itself are left out.
"""
import argparse
import datetime as dt
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "pipeline" / "reference"
RAW = ROOT / "pipeline" / "raw"
REPORTS = ROOT / "pipeline" / "reports"
SITE_DATA = ROOT / "site" / "data"

# Comtrade codes whose map shape uses another M49 id in world-atlas.
MAP_ID = {"842": "840", "251": "250", "699": "356", "757": "756", "579": "578", "490": "158"}
NAMES = {"490": "Taiwan", "842": "United States"}
WORLD = 0


def s(v):
    return "" if v is None else str(v)


def is_total(r):
    return s(r.get("customsCode")) in ("C00", "") and s(r.get("motCode")) in ("0", "") \
        and s(r.get("mosCode")) in ("0", "")


def tonnes(r):
    w = r.get("netWgt")
    if w in (None, 0) and s(r.get("qtyUnitAbbr")).lower() == "kg":
        w = r.get("qty")
    return (w or 0) / 1000.0


def select(rows):
    """One figure per (reporter, flow, partner). Returns dict key -> record."""
    groups = defaultdict(list)
    for r in rows:
        flow = s(r.get("flowCode"))
        rep, par = int(r["reporterCode"]), int(r["partnerCode"])
        if flow not in ("X", "M") or par == WORLD or rep == par:
            continue
        if not is_total(r):
            continue
        groups[(rep, flow, par)].append(r)
    out = {}
    for key, rs in groups.items():
        world = [r for r in rs if int(r.get("partner2Code") or 0) == WORLD]
        if world:
            # Duplicates of the World row can occur; take the largest weight.
            r = max(world, key=tonnes)
            pick, basis = [r], "partner2 World"
        else:
            pick, basis = rs, "partner2 detail summed"
        t = sum(tonnes(r) for r in pick)
        usd = sum(r.get("primaryValue") or 0 for r in pick)
        est = any(bool(r.get("isNetWgtEstimated")) for r in pick)
        if t <= 0 and usd <= 0:
            continue
        out[key] = {"t": t, "usd": usd, "est": est, "basis": basis, "rows": pick}
    return out


def routes_from(selected):
    """Site format: [view, exporter, recipient, tonnes, usd, estimated]."""
    routes = []
    for (rep, flow, par), v in selected.items():
        view, ex, rc = (0, rep, par) if flow == "X" else (1, par, rep)
        routes.append([view, ex, rc, round(v["t"], 2), round(v["usd"]), 1 if v["est"] else 0])
    routes.sort(key=lambda r: (r[0], -r[3]))
    return routes


def countries_for(routes, rows, ref, map_ids):
    used = {str(c) for r in routes for c in (r[1], r[2])}
    desc = {}
    for r in rows:
        desc[str(r["reporterCode"])] = (r.get("reporterISO"), r.get("reporterDesc"))
        desc[str(r["partnerCode"])] = (r.get("partnerISO"), r.get("partnerDesc"))
    # Keep every reference country, so the map can name places with no trade.
    out, new = dict(ref), []
    for c in sorted(used, key=int):
        if c in ref:
            continue
        iso, name = desc.get(c, (None, None))
        mid = MAP_ID.get(c, c.zfill(3))
        out[c] = [iso or "", NAMES.get(c, name or f"Code {c}"), "NS", mid if mid in map_ids else None]
        new.append(c)
    return out, new


def totals(routes):
    t = defaultdict(lambda: [0, 0.0, 0.0, 0])
    for v, ex, rc, w, usd, est in routes:
        t[v][0] += 1
        t[v][1] += w
        t[v][2] += usd
        t[v][3] += est
    return t


def report(year, raw_meta, rows, selected, routes, countries, new, prev, warn):
    t = totals(routes)
    names = {k: v[1] for k, v in countries.items()}
    views = {0: "Exporters' reports", 1: "Importers' reports"}
    detail = sum(1 for v in selected.values() if v["basis"] != "partner2 World")
    lines = [f"# HS 3915 plastic waste, {year}: data check", "",
             f"Downloaded {raw_meta.get('downloaded')} from the UN Comtrade API "
             f"({raw_meta.get('records', len(rows)):,} raw records). Built {dt.date.today().isoformat()}.", ""]
    if warn:
        lines += ["## Warnings", ""] + [f"- {w}" for w in warn] + [""]
    lines += ["## Totals", "", "| Figures | Routes | Tonnes | US$ | Weight estimated | Change in tonnes vs previous file |",
              "|---|---:|---:|---:|---:|---:|"]
    for v in (0, 1):
        n, w, usd, est = t[v]
        ch = ""
        if prev and prev.get(v):
            ch = f"{(w / prev[v] - 1):+.1%}" if prev[v] else ""
        lines.append(f"| {views[v]} | {n:,} | {w:,.0f} | {usd:,.0f} | {est:,} | {ch} |")
    lines += ["", f"Records built from partner-2 detail (no World total given): {detail:,}.", ""]
    if new:
        lines += ["## Countries not in the reference list", "",
                  "These get no income group or region until added to pipeline/reference.", ""]
        lines += [f"- {c}: {countries[c][1]} ({countries[c][0]})" for c in new] + [""]
    for v in (0, 1):
        lines += [f"## Largest 15 routes, {views[v].lower()}", "", "| From | To | Tonnes | US$ |", "|---|---|---:|---:|"]
        for r in [r for r in routes if r[0] == v][:15]:
            lines.append(f"| {names[str(r[1])]} | {names[str(r[2])]} | {r[3]:,.0f} | {r[4]:,.0f} |")
        lines.append("")
    return "\n".join(lines)


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--cmd", default="3915")
    ap.add_argument("--min-ratio", type=float, default=0.6,
                    help="stop if a view's tonnes fall below this share of the previous file")
    a = ap.parse_args()

    raw = load(RAW / f"comtrade_hs{a.cmd}_{a.year}.json")
    rows = raw["data"]
    ref = load(REF / "countries.json")
    schemes = load(REF / "region_schemes.json")
    aliases = load(REF / "aliases.json")
    world = load(SITE_DATA / "world-110m.json")
    map_ids = {g.get("id") for g in world["objects"]["countries"]["geometries"]}

    selected = select(rows)
    routes = routes_from(selected)
    countries, new = countries_for(routes, rows, ref, map_ids)

    out_path = SITE_DATA / f"plastic_{a.year}.json"
    prev = None
    warn = []
    if out_path.exists():
        old = load(out_path)
        pt = totals(old["routes"])
        prev = {v: pt[v][1] for v in (0, 1)}
    t = totals(routes)
    for v in (0, 1):
        if t[v][0] < 300:
            warn.append(f"Only {t[v][0]} routes in view {v}.")
        if prev and prev[v] and t[v][1] < a.min_ratio * prev[v]:
            warn.append(f"View {v} tonnes fell to {t[v][1] / prev[v]:.0%} of the previous file.")

    data = {
        "meta": {
            "year": a.year,
            "code": f"HS {a.cmd}",
            "desc": "Waste, parings and scrap, of plastics",
            "source": f"UN Comtrade API, HS as reported, downloaded {raw['meta'].get('downloaded')}; "
                      "partner-2 World totals, otherwise partner-2 detail summed",
            "built": dt.date.today().isoformat(),
        },
        "countries": countries,
        "routes": routes,
        "schemes": schemes,
        "aliases": aliases,
        "hidden": {},
    }
    baci = REF / f"baci_mixed_streams_{a.year}.json"
    if baci.exists():
        b = load(baci)
        data["meta"]["hidden_source"] = b["source"]
        data["hidden"] = b["streams"]

    REPORTS.mkdir(exist_ok=True)
    rep = report(a.year, raw["meta"], rows, selected, routes, countries, new, prev, warn)
    (REPORTS / f"hs{a.cmd}_{a.year}.md").write_text(rep, encoding="utf-8")
    if warn:
        print("\n".join(warn), file=sys.stderr)
        raise SystemExit("Checks failed; the site data was not changed. See the report.")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
    years = sorted(int(p.stem.split("_")[1]) for p in SITE_DATA.glob("plastic_*.json"))
    with open(SITE_DATA / "manifest.json", "w", encoding="utf-8") as f:
        json.dump({"latest": max(years), "years": years}, f)
    print(f"Wrote {out_path}: {len(routes):,} routes, {len(countries)} countries, {len(new)} new.")


if __name__ == "__main__":
    main()
