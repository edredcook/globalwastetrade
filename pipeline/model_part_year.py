"""Model a full year from the months published so far (the site labels it "modelled").

    python pipeline/model_part_year.py --year 2026

Reads  pipeline/raw/comtrade_<name>_<year>_monthly.json (months so far),
       pipeline/raw/comtrade_<name>_<year-1>_monthly.json and comtrade_<name>_<year-1>.json,
       and any annual returns already filed for <year> (comtrade_<name>_<year>.json)
Writes pipeline/raw/comtrade_<name>_<year>.json in the annual format, so
build_site_data.py can build it like any other year. Annual returns are kept as
filed (and saved aside as ..._<year>_annual.json); only reporters and flows with no
annual return yet are modelled.

For each reporter and flow, the months it has filed this year are summed route by route
and scaled to a full year by its own pattern last year: its annual total divided by its
total for the same months (tonnes, or US$ where tonnes are missing). Where last year's
months are missing the scale is 12 / months filed. Scales are clipped to 1 - 2 x that.
Months with value but no weight are covered by scaling the weight of the other months
by value; a route with no weight in any month is left without one for the cleaning step.
"""
import argparse
import datetime as dt
import json
from collections import defaultdict
from pathlib import Path

from build_site_data import select

RAW = Path(__file__).resolve().parent / "raw"


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def by_month(rows):
    out = defaultdict(list)
    for r in rows:
        out[str(r.get("period"))[-2:]].append(r)
    return out


def totals(sel):
    """(reporter, flow) -> [tonnes, US$]"""
    t = defaultdict(lambda: [0.0, 0.0])
    for (rep, flow, _), v in sel.items():
        t[(rep, flow)][0] += v["t"]
        t[(rep, flow)][1] += v["usd"]
    return t


def model(cur_rows, prev_rows, prev_annual_rows, annual_rows=None):
    cur = {m: select(rs) for m, rs in by_month(cur_rows).items()}
    prev = {m: totals(select(rs)) for m, rs in by_month(prev_rows).items()}
    annual = totals(select(prev_annual_rows)) if prev_annual_rows else {}

    have_annual = {(int(r["reporterCode"]), str(r.get("flowCode")).strip()) for r in annual_rows or []}
    filed = defaultdict(set)                       # (rep, flow) -> months filed this year
    routes = defaultdict(lambda: {"t": 0.0, "usdw": 0.0, "usd": 0.0, "est": False, "desc": None})
    for m, sel in cur.items():
        for (rep, flow, par), v in sel.items():
            if (rep, flow) in have_annual:
                continue
            filed[(rep, flow)].add(m)
            r = routes[(rep, flow, par)]
            r["usd"] += v["usd"]
            if v["t"] > 0:
                r["t"] += v["t"]
                r["usdw"] += v["usd"]
            r["est"] = r["est"] or v["est"]
            r["desc"] = r["desc"] or v["rows"][0]

    scale = {}
    for key, months in filed.items():
        naive = 12 / len(months)
        if len(months) == 12:
            scale[key] = 1.0
            continue
        a = annual.get(key)
        s = [sum(prev[m][key][k] for m in months if m in prev and key in prev[m]) for k in (0, 1)]
        have = all(m in prev and key in prev[m] for m in months)
        f = None
        if a and have:
            if a[0] > 0 and s[0] > 0:
                f = a[0] / s[0]
            elif a[1] > 0 and s[1] > 0:
                f = a[1] / s[1]
        scale[key] = min(2 * naive, max(1.0, f)) if f else naive

    rows = list(annual_rows or [])
    for (rep, flow, par), r in routes.items():
        f = scale[(rep, flow)]
        t = r["t"]
        if t > 0 and r["usdw"] > 0 and r["usd"] > r["usdw"]:
            t *= r["usd"] / r["usdw"]
        d = r["desc"]
        rows.append({
            "reporterCode": rep, "reporterISO": d.get("reporterISO"), "reporterDesc": d.get("reporterDesc"),
            "flowCode": flow, "partnerCode": par, "partnerISO": d.get("partnerISO"),
            "partnerDesc": d.get("partnerDesc"), "partner2Code": 0, "customsCode": "C00",
            "mosCode": "0", "motCode": "0", "cmdCode": d.get("cmdCode"),
            "netWgt": round(t * f * 1000) if t > 0 else None, "isNetWgtEstimated": r["est"],
            "qty": None, "qtyUnitAbbr": "kg", "primaryValue": round(r["usd"] * f),
            "isReported": False, "isAggregate": True,
        })
    return rows, {f"{rep}{flow}": sorted(ms) for (rep, flow), ms in filed.items()}


def share_modelled(filed, annual_rows):
    """Share of reporter flows that are modelled rather than filed as annual returns."""
    have = {(int(r["reporterCode"]), str(r.get("flowCode")).strip()) for r in annual_rows or []}
    return round(len(filed) / (len(filed) + len(have)), 3) if filed else 0.0


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--name", default="hs3915")
    a = ap.parse_args()
    cur = load(RAW / f"comtrade_{a.name}_{a.year}_monthly.json")
    prev = load(RAW / f"comtrade_{a.name}_{a.year - 1}_monthly.json")
    pa = RAW / f"comtrade_{a.name}_{a.year - 1}.json"
    path = RAW / f"comtrade_{a.name}_{a.year}.json"
    kept = RAW / f"comtrade_{a.name}_{a.year}_annual.json"
    annual = None
    if path.exists() and not load(path)["meta"].get("modelled"):
        path.replace(kept)
    if kept.exists():
        annual = load(kept)["data"]
    rows, filed = model(cur["data"], prev["data"], load(pa)["data"] if pa.exists() else None, annual)
    meta = {"downloaded": cur["meta"]["downloaded"], "year": a.year, "cmd": cur["meta"]["cmd"],
            "modelled": bool(filed), "months": cur["meta"].get("months"), "built": dt.date.today().isoformat(),
            "method": "months filed so far scaled to a full year by each reporter's pattern the year before",
            "modelled_share": share_modelled(filed, annual), "filed": filed, "annual_records": len(annual or []), "records": len(rows)}
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "data": rows}, f, separators=(",", ":"))
    print(f"Wrote {path}: {len(annual or []):,} annual records kept, {len(rows) - len(annual or []):,} modelled "
          f"from {len(filed)} reporter flows.")


if __name__ == "__main__":
    main()
