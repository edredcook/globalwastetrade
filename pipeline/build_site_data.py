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
    # Comtrade pads some codes in older years ("0 " for mosCode), so strip.
    return "" if v is None else str(v).strip()


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


def view_medians(selected):
    """Median US$ per tonne for each flow, from records with both weight and value."""
    med = {}
    for flow in ("X", "M"):
        uv = sorted(v["usd"] / v["t"] for (r, f, p), v in selected.items() if f == flow and v["t"] > 0 and v["usd"] > 0)
        med[flow] = uv[len(uv) // 2] if uv else None
    return med


def clean(selected, factor=10.0, gross=100.0):
    """Repair weights in place. Returns a list of changes for the check report.

    A. No weight but a value: take the partner's weight if its mirror report is in
       range, otherwise weight = value / that flow's median US$ per tonne.
    B. US$ per tonne more than `factor` times away from the flow's median, and the
       partner's mirror report of the same route is within range: take the
       partner's weight. The value stays as reported.
    D. No usable partner report and US$ per tonne more than `gross` times away from
       the median (a units error, such as 2.4 Mt of clothing at US$1 a tonne):
       weight = value / that flow's median US$ per tonne.
    C. Other out-of-range records are left as reported and listed.
    Re-estimated weights are marked est = 2 (1 means the reporter estimated it).
    """
    med = view_medians(selected)
    changes = []

    def in_range(v, flow):
        m = med[flow]
        return m and v["t"] > 0 and v["usd"] > 0 and m / factor <= v["usd"] / v["t"] <= m * factor

    for (rep, flow, par), v in selected.items():
        m = med[flow]
        if not m:
            continue
        mflow = "M" if flow == "X" else "X"
        mirror = selected.get((par, mflow, rep))
        if v["t"] <= 0 and v["usd"] > 0:
            if mirror and in_range(mirror, mflow):
                new, how = mirror["t"], "weight from partner's report"
            else:
                new, how = v["usd"] / m, "weight estimated from value"
            changes.append({"rule": "A", "key": (rep, flow, par), "old_t": v["t"], "new_t": new, "usd": v["usd"]})
            v.update(t=new, est=2, cleaned=how)
            continue
        if v["t"] <= 0 or v["usd"] <= 0 or in_range(v, flow):
            continue
        if mirror and in_range(mirror, mflow):
            changes.append({"rule": "B", "key": (rep, flow, par), "old_t": v["t"], "new_t": mirror["t"], "usd": v["usd"]})
            v.update(t=mirror["t"], est=2, cleaned="weight from partner's report")
        elif gross and not m / gross <= v["usd"] / v["t"] <= m * gross:
            new = v["usd"] / m
            changes.append({"rule": "D", "key": (rep, flow, par), "old_t": v["t"], "new_t": new, "usd": v["usd"]})
            v.update(t=new, est=2, cleaned="weight estimated from value")
        else:
            changes.append({"rule": "C", "key": (rep, flow, par), "old_t": v["t"], "new_t": v["t"], "usd": v["usd"]})
    return changes, med


def routes_from(selected):
    """Site format: [view, exporter, recipient, tonnes, usd, estimated]."""
    routes = []
    for (rep, flow, par), v in selected.items():
        view, ex, rc = (0, rep, par) if flow == "X" else (1, par, rep)
        routes.append([view, ex, rc, round(v["t"], 2), round(v["usd"]), int(v["est"])])
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


# Municipal waste often moves at a gate fee, so a near-zero US$ per tonne can be
# genuine: rule D is not applied to it.
NO_RULE_D = {"382510"}

# Wastes that carry plastic amongst other materials. Each is selected and cleaned
# code by code with the same rules as HS 3915, then the codes are summed.
STREAMS = {
    "fibre": ["550510"],
    "clothing": ["6309"],
    "rags": ["6310"],
    "weee": ["854931", "854939"],   # HS 8549 exists from HS 2022
    "weeeo": ["854991", "854999"],
    "rdf": ["382510"],
    "paper": ["4707"],
}


def mixed_streams(rows, factor=10.0):
    """Comtrade routes for each mixed stream, in the site's route format.

    Returns ({stream: routes}, {stream: {"A": n, "B": n, "C": n}}).
    """
    by_code = defaultdict(list)
    for r in rows:
        by_code[s(r.get("cmdCode"))].append(r)
    out, rules = {}, {}
    for k, codes in STREAMS.items():
        merged = {}
        rules[k] = {"A": 0, "B": 0, "C": 0, "D": 0}
        for code in codes:
            sel = select(by_code.get(code, []))
            changes, _ = clean(sel, factor, None if code in NO_RULE_D else 100.0)
            for c in changes:
                rules[k][c["rule"]] += 1
            for v, ex, rc, t, usd, est in routes_from(sel):
                m = merged.setdefault((v, ex, rc), [v, ex, rc, 0.0, 0, 0])
                m[3] = round(m[3] + t, 2)
                m[4] += usd
                m[5] = max(m[5], est)
        out[k] = sorted(merged.values(), key=lambda r: (r[0], -r[3]))
    return out, rules


WB_ISO = {"S19": "TWN"}  # Comtrade's code for Taiwan
# Economies inside another reporter's customs figures: left out of the reporting count.
# (Puerto Rico, the US Virgin Islands, Monaco and Liechtenstein have no Comtrade code.)
COVERED = {"674": "380"}  # San Marino, in Italy's figures


def apply_income(countries, history, year):
    """Set each country's income group to the World Bank's group for this data year.

    Economies the World Bank lists, but left unclassified that year, get "NS".
    Places it never lists keep the group from countries.json.
    """
    last = str(min(year, history["years"][1]))
    changed = 0
    for c, v in countries.items():
        g = history["groups"].get(WB_ISO.get(v[0], v[0]))
        if g is None:
            continue
        new = g.get(last, "NS")
        if new != v[2]:
            countries[c] = [v[0], v[1], new] + v[3:]
            changed += 1
    return changed


def reporting(rows, ref, history, year):
    """Who filed a report for this code and year.

    X and M list the Comtrade codes of countries with any export or import record
    (the World total counts). universe lists every economy the World Bank classified
    that year, plus any other reporter: {code: [iso, name, map id]}.
    """
    rep = {"X": set(), "M": set()}
    for r in rows:
        f = s(r.get("flowCode"))
        if f in rep:
            rep[f].add(str(int(r["reporterCode"])))
    yr = str(min(year, history["years"][1]))
    universe = {}
    for c, v in ref.items():
        g = history["groups"].get(WB_ISO.get(v[0], v[0]), {}).get(yr)
        if c in COVERED and c not in rep["X"] and c not in rep["M"]:
            continue
        if g in ("HIC", "UMC", "LMC", "LIC") or c in rep["X"] or c in rep["M"]:
            universe[c] = [v[0], v[1], v[3]]
    return {"X": sorted(rep["X"] & universe.keys(), key=int), "M": sorted(rep["M"] & universe.keys(), key=int),
            "universe": dict(sorted(universe.items(), key=lambda kv: int(kv[0])))}


def totals(routes):
    t = defaultdict(lambda: [0, 0.0, 0.0, 0])
    for v, ex, rc, w, usd, est in routes:
        t[v][0] += 1
        t[v][1] += w
        t[v][2] += usd
        t[v][3] += est
    return t


def cleaning_section(changes, med, factor, names):
    flows = {"X": "exporters' reports", "M": "importers' reports"}
    rules = {"A": "No weight given: partner's weight, or value at the median US$ per tonne",
             "B": "US$ per tonne out of range: weight taken from the partner's report",
             "D": "US$ per tonne 100 times out, no usable partner report: value at the median US$ per tonne",
             "C": "US$ per tonne out of range, no usable partner report: left as reported"}
    lines = ["## Cleaning", "",
             "Median US$ per tonne: " + ", ".join(f"{flows[f]} {m:,.0f}" for f, m in med.items() if m) +
             f". Out of range means more than {factor:g} times above or below the median.", "",
             "| Rule | Records | Tonnes before | Tonnes after |", "|---|---:|---:|---:|"]
    for k, label in rules.items():
        cs = [c for c in changes if c["rule"] == k]
        lines.append(f"| {label} | {len(cs):,} | {sum(c['old_t'] for c in cs):,.0f} | {sum(c['new_t'] for c in cs):,.0f} |")
    lines.append("")
    for k in ("B", "D", "C"):
        cs = sorted((c for c in changes if c["rule"] == k), key=lambda c: -max(c["old_t"], c["new_t"], c["usd"] / 1e4))[:25]
        if not cs:
            continue
        lines += [f"### Rule {k}, largest 25", "", "| Reporter | Flow | Partner | Tonnes before | Tonnes after | US$ | US$ per tonne as reported |",
                  "|---|---|---|---:|---:|---:|---:|"]
        for c in cs:
            rep, flow, par = c["key"]
            uv = c["usd"] / c["old_t"] if c["old_t"] else 0
            lines.append(f"| {names.get(str(rep), rep)} | {flow} | {names.get(str(par), par)} | {c['old_t']:,.1f} | {c['new_t']:,.1f} | {c['usd']:,.0f} | {uv:,.0f} |")
        lines.append("")
    return lines


def mixed_report(year, mixed, rules):
    """Mixed-stream totals per view, checked against BACI where we hold BACI figures."""
    if not mixed:
        return ""
    baci_path = REF / f"baci_mixed_streams_{year}.json"
    baci = load(baci_path)["streams"] if baci_path.exists() else {}
    lines = ["", "## Wastes carrying plastic amongst other materials", "",
             "Whole stream tonnes, before any plastic share is applied."
             + (" BACI is shown as a check only; the site uses Comtrade." if baci else ""), "",
             "| Stream | HS | Exporters' reports, t | Importers' reports, t | "
             + ("BACI, t | Exporters ÷ BACI | " if baci else "") + "Cleaned A / B / D / C |",
             "|---|---|---:|---:|" + ("---:|---:|" if baci else "") + "---|"]
    for k, codes in STREAMS.items():
        rs = mixed.get(k, [])
        x = sum(r[3] for r in rs if r[0] == 0)
        m = sum(r[3] for r in rs if r[0] == 1)
        row = f"| {k} | {', '.join(codes)} | {x:,.0f} | {m:,.0f} | "
        if baci:
            b = sum(r[2] for r in baci.get(k, []))
            row += f"{b:,.0f} | {x / b:.2f} | " if b else "0 | – | "
        r = rules.get(k, {})
        row += f"{r.get('A', 0)} / {r.get('B', 0)} / {r.get('D', 0)} / {r.get('C', 0)} |"
        lines.append(row)
    return "\n".join(lines) + "\n"


def report(year, raw_meta, rows, selected, routes, countries, new, prev, warn, changes=(), med=None, factor=10.0):
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
    if med:
        lines += cleaning_section(changes, med, factor, names)
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
    ap.add_argument("--outlier-factor", type=float, default=10.0,
                    help="US$ per tonne this many times above or below the median counts as out of range")
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
    changes, med = clean(selected, a.outlier_factor)
    routes = routes_from(selected)
    mixed_path = RAW / f"comtrade_mixed_{a.year}.json"
    mixed, mixed_rules, mixed_meta = {}, {}, None
    if mixed_path.exists():
        m = load(mixed_path)
        mixed_meta = m["meta"]
        mixed, mixed_rules = mixed_streams(m["data"], a.outlier_factor)
        rows_for_names = rows + m["data"]
    else:
        rows_for_names = rows
    all_routes = routes + [r for rs in mixed.values() for r in rs]
    countries, new = countries_for(all_routes, rows_for_names, ref, map_ids)
    income = load(REF / "income_history.json")
    apply_income(countries, income, a.year)

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
            "income": f"{income['source']}; GNI data year {min(a.year, income['years'][1])}",
        },
        "countries": countries,
        "routes": routes,
        "schemes": schemes,
        "aliases": aliases,
        "hidden": {},
        "reporting": reporting(rows, ref, income, a.year),
    }
    if raw["meta"].get("modelled"):
        data["meta"]["modelled"] = True
        data["meta"]["months"] = raw["meta"].get("months")
        data["meta"]["modelled_share"] = raw["meta"].get("modelled_share", 1.0)
        data["meta"]["source"] += "; modelled: " + raw["meta"]["method"]
    if mixed_meta:
        data["meta"]["hidden_source"] = (f"UN Comtrade API, downloaded {mixed_meta.get('downloaded')}; "
                                         "same selection and cleaning as HS 3915")
        data["hidden"] = {k: v for k, v in mixed.items() if v}
    elif a.year >= 2019 and not raw["meta"].get("modelled"):
        warn.append("No mixed-stream download (comtrade_mixed_<year>.json); run fetch_comtrade.py --name mixed.")

    REPORTS.mkdir(exist_ok=True)
    rep = report(a.year, raw["meta"], rows, selected, routes, countries, new, prev, warn, changes, med, a.outlier_factor)
    rep += mixed_report(a.year, mixed, mixed_rules)
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
