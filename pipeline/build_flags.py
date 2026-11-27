"""List every HS 3915 record the cleaning changed or flagged, with the decision behind it.

    python pipeline/build_flags.py

For each year with an annual raw download (pipeline/raw/comtrade_hs3915_<year>.json,
not a modelled one), re-runs the selection and cleaning of build_site_data.py and
writes one row per record that a cleaning rule touched:

  A, B, D  automatic repairs of missing or implausible weights (see build_site_data.clean)
  E        Comtrade's own weight estimate replaced (pipeline/reference/estimated_weights.json)
  F        re-estimated from value after review (pipeline/reference/record_decisions.json)
  C        out of range and left as reported, with the review group and decision

Rows for years without a raw download are kept from the existing file, so a monthly
refresh of three years leaves the other years' rows alone.

Writes site/data/flagged_records.csv.
"""
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_site_data as b  # noqa: E402

OUT = b.SITE_DATA / "flagged_records.csv"
COLS = ["year", "reporter", "reporter_code", "flow", "partner", "partner_code",
        "tonnes_reported", "tonnes_used", "usd", "usd_per_tonne", "median_usd_per_tonne",
        "partner_tonnes", "rule", "group", "decision", "agreed", "reason"]

AUTO = {
    "A": ("No weight given", "Partner's weight, or value at the median US$ per tonne"),
    "B": ("Price out of range, partner's report in range", "Partner's weight"),
    "D": ("Price 100 times out, no usable partner report", "Value at the median US$ per tonne"),
    "E": ("Comtrade's own weight estimate", "Replaced; see pipeline/reference/estimated_weights.json"),
}


def load_groups():
    ref = b.load(b.REF / "record_decisions.json")
    listed, matched = {}, {}
    for g in ref["groups"]:
        for y, rep, flow, par in g.get("records", []):
            listed[(y, rep, flow, par)] = g
        if g.get("match"):
            matched[g["match"]] = g
    return listed, matched


def group_for(year, c, mirror, med, listed, matched):
    rep, flow, par = c["key"]
    g = listed.get((year, rep, flow, par))
    if g:
        return g
    t, usd = c["old_t"], c["usd"]
    if t and usd / t > med[flow]:
        return matched.get("high_price")
    if mirror and 0.5 <= mirror["t"] / t <= 2:
        return matched.get("partner_agrees")
    return matched.get("low_price")


def year_rows(year, listed, matched):
    raw = b.load(b.RAW / f"comtrade_hs3915_{year}.json")
    if raw["meta"].get("modelled"):
        return None
    selected = b.select(raw["data"])
    before = {k: dict(v) for k, v in selected.items()}
    changes, med = b.clean(selected, replace_est=b.estimated_weights(year), decisions=b.record_decisions(year))
    site = b.SITE_DATA / f"plastic_{year}.json"
    cs = b.load(site)["countries"] if site.exists() else {}
    name = lambda c: (cs.get(str(c)) or [None, str(c)])[1]
    rows = []
    for c in changes:
        rep, flow, par = c["key"]
        mirror = before.get((par, "M" if flow == "X" else "X", rep))
        if c["rule"] in AUTO:
            group, decision = AUTO[c["rule"]]
            agreed, reason = "Automatic cleaning rule", ""
        else:
            g = group_for(year, c, mirror, med, listed, matched) or {}
            group = g.get("title", "")
            decision = "Weight from value" if c["rule"] == "F" else "Left as reported"
            agreed, reason = g.get("agreed", ""), g.get("reason", "")
        rows.append({
            "year": year, "reporter": name(rep), "reporter_code": rep, "flow": flow,
            "partner": name(par), "partner_code": par,
            "tonnes_reported": round(c["old_t"], 1), "tonnes_used": round(c["new_t"], 1),
            "usd": round(c["usd"]), "usd_per_tonne": round(c["usd"] / c["old_t"]) if c["old_t"] else "",
            "median_usd_per_tonne": round(med[flow]),
            "partner_tonnes": round(mirror["t"], 1) if mirror else "",
            "rule": c["rule"], "group": group, "decision": decision, "agreed": agreed, "reason": reason,
        })
    rows.sort(key=lambda r: (r["rule"], -max(float(r["tonnes_reported"]), float(r["tonnes_used"]))))
    return rows


def main():
    listed, matched = load_groups()
    manifest = b.load(b.SITE_DATA / "manifest.json")
    modelled = set(manifest.get("modelled", []))
    built = {}
    for p in sorted(b.RAW.glob("comtrade_hs3915_*.json")):
        try:
            year = int(p.stem.split("_")[-1])
        except ValueError:
            continue
        if year in modelled:
            continue
        rows = year_rows(year, listed, matched)
        if rows is not None:
            built[year] = rows
    kept = []
    if OUT.exists():
        with open(OUT, newline="", encoding="utf-8") as f:
            kept = [r for r in csv.DictReader(f) if int(r["year"]) not in built and int(r["year"]) not in modelled]
    rows = kept + [r for y in sorted(built) for r in built[y]]
    rows.sort(key=lambda r: int(r["year"]))
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {OUT}: {len(rows):,} records ({', '.join(map(str, sorted(built)))} rebuilt).")


if __name__ == "__main__":
    main()
