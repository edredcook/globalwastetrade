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

Months that a reporter has not yet filed with Comtrade are taken from its national
statistics office where fetch_national.py has them (pipeline/raw/national/), for this
year and the year before. Their values are converted to US$ at the rate implied by the
routes both sources have for that month. Files with several HS codes (--name mixed)
are modelled code by code.
"""
import argparse
import datetime as dt
import json
from collections import defaultdict
from pathlib import Path

from build_site_data import is_total, select

RAW = Path(__file__).resolve().parent / "raw"
NAT = RAW / "national"
SOURCE_NAMES = {"comext": "Eurostat Comext", "hmrc": "UK HMRC", "census": "US Census Bureau",
                "estat": "Japan Customs (e-Stat)", "kcs": "Korea Customs Service"}


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
    multi = any(":" in k for k in filed)
    have = {(int(r["reporterCode"]), str(r.get("flowCode")).strip()) + ((str(r.get("cmdCode")),) if multi else ())
            for r in annual_rows or []}
    return round(len(filed) / (len(filed) + len(have)), 3) if filed else 0.0


def iso_index(*row_lists):
    """ISO3 -> (Comtrade code, name), from the codes Comtrade itself uses."""
    out = {}
    for rows in row_lists:
        for r in rows or []:
            for a, c, d in (("reporterISO", "reporterCode", "reporterDesc"), ("partnerISO", "partnerCode", "partnerDesc")):
                if r.get(a) and r.get(c) is not None and r[a] not in out:
                    out[r[a]] = (int(r[c]), r.get(d))
    return out


def load_national(year, codes, iso, folder=None):
    """National rows for <year>, summed to the stream codes and keyed by Comtrade codes:
    (source, reporter, flow, partner, code, period) -> [kg, value, currency, partner ISO3]."""
    acc = {}
    for p in sorted((folder or NAT).glob(f"*_{year}[01][0-9].json")):
        for r in load(p):
            code = next((c for c in codes if str(r.get("cmd", "")).startswith(c)), None)
            rep, par = iso.get(r.get("reporterISO")), iso.get(r.get("partnerISO"))
            if code is None or rep is None or par is None or rep[0] == par[0]:
                continue
            k = (r["source"], rep[0], r["flow"], par[0], code, str(r["period"]))
            a = acc.setdefault(k, [0.0, 0.0, r["currency"], r["partnerISO"]])
            a[0] += r.get("kg") or 0
            a[1] += r.get("value") or 0
    return acc


def supplement(rows, nat, iso):
    """Add national months for reporter, flow and code combinations that Comtrade's monthly
    returns do not have yet. Returns (rows, {source: {"months": [...], "reporter_flows": n}})."""
    ct, ckg = defaultdict(float), defaultdict(float)
    present = set()
    for r in rows:
        if not is_total(r) or int(r.get("partner2Code") or 0) != 0:
            continue
        k = (int(r["reporterCode"]), str(r.get("flowCode")).strip(), int(r["partnerCode"]),
             str(r.get("cmdCode")), str(r.get("period")))
        ct[k] += r.get("primaryValue") or 0
        ckg[k] += r.get("netWgt") or 0
        present.add((k[0], k[1], k[3], k[4]))
    # US$ per unit of national currency, from routes both sources have that month
    num, den = defaultdict(float), defaultdict(float)
    kg_both = defaultdict(lambda: [0.0, 0.0])        # source -> [national kg, Comtrade kg] on shared routes
    for (src, rep, flow, par, code, per), (kg, val, cur, _) in nat.items():
        k = (rep, flow, par, code, per)
        u = ct.get(k)
        if u and val > 0:
            num[(cur, per)] += u
            den[(cur, per)] += val
        if ckg.get(k) and kg > 0:
            kg_both[src][0] += kg
            kg_both[src][1] += ckg[k]
    rates = {k: num[k] / den[k] for k in num if den[k] > 0}

    def rate(cur, per):
        if cur == "USD":
            return 1.0
        have = sorted((abs(int(p) - int(per)), p) for c, p in rates if c == cur)
        return rates[(cur, have[0][1])] if have else None

    names = {c: d for c, d in iso.values()}
    iso_of = {c: i for i, (c, _) in iso.items()}
    out, used = list(rows), defaultdict(lambda: {"months": set(), "flows": set()})
    for (src, rep, flow, par, code, per), (kg, val, cur, par_iso) in sorted(nat.items()):
        if (rep, flow, code, per) in present:
            continue
        x = rate(cur, per)
        if x is None:
            continue
        out.append({
            "reporterCode": rep, "reporterISO": iso_of[rep],
            "reporterDesc": names.get(rep), "flowCode": flow, "partnerCode": par, "partnerISO": par_iso,
            "partnerDesc": names.get(par), "partner2Code": 0, "customsCode": "C00", "mosCode": "0",
            "motCode": "0", "cmdCode": code, "period": per, "netWgt": kg or None,
            "isNetWgtEstimated": False, "primaryValue": val * x, "source": src,
        })
        used[src]["months"].add(per)
        used[src]["flows"].add((rep, flow, code))
    info = {s: {"months": sorted(u["months"]), "reporter_flows": len(u["flows"])} for s, u in used.items()}
    for src, (a, b) in kg_both.items():
        if src in info and b > 0:
            info[src]["kg_vs_comtrade"] = round(a / b, 3)   # on routes and months both sources have
    for src in info:
        cur = next(c for (s_, *_), (_, _, c, _) in nat.items() if s_ == src)
        info[src]["usd_per_unit"] = {p: round(x, 4) for (c, p), x in sorted(rates.items()) if c == cur}
    return out, info


def model_codes(cur_rows, prev_rows, prev_annual_rows, annual_rows=None):
    """model() for each HS code in the files; filed keys carry the code when there are several."""
    def split(rows):
        out = defaultdict(list)
        for r in rows or []:
            out[str(r.get("cmdCode"))].append(r)
        return out
    cur, prev, pa, an = split(cur_rows), split(prev_rows), split(prev_annual_rows), split(annual_rows)
    codes = sorted(set(cur) | set(an))
    rows, filed = [], {}
    for c in codes:
        rs, fl = model(cur.get(c, []), prev.get(c, []), pa.get(c) or None, an.get(c) or None)
        rows += rs
        filed.update({(f"{c}:{k}" if len(codes) > 1 else k): v for k, v in fl.items()})
    return rows, filed


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--name", default="hs3915")
    ap.add_argument("--cmd", help="HS codes when there is no monthly Comtrade file, e.g. for --name mixed")
    a = ap.parse_args()
    empty = {"meta": {}, "data": []}
    cp, pp = (RAW / f"comtrade_{a.name}_{y}_monthly.json" for y in (a.year, a.year - 1))
    cur = load(cp) if cp.exists() else empty
    prev = load(pp) if pp.exists() else empty
    pa = RAW / f"comtrade_{a.name}_{a.year - 1}.json"
    pa_rows = load(pa)["data"] if pa.exists() else None
    path = RAW / f"comtrade_{a.name}_{a.year}.json"
    kept = RAW / f"comtrade_{a.name}_{a.year}_annual.json"
    annual = None
    if path.exists() and not load(path)["meta"].get("modelled"):
        path.replace(kept)
    if kept.exists():
        annual = load(kept)["data"]
    cmd = cur["meta"].get("cmd") or a.cmd or (load(pa)["meta"].get("cmd") if pa.exists() else None)
    if not cmd:
        ap.error("no monthly Comtrade file and no --cmd")
    codes = sorted(cmd.split(","), key=len, reverse=True)
    iso = iso_index(cur["data"], prev["data"], pa_rows, annual)
    national = {}
    cur_rows, prev_rows = cur["data"], prev["data"]
    if NAT.exists():
        cur_rows, national = supplement(cur_rows, load_national(a.year, codes, iso), iso)
        prev_rows, _ = supplement(prev_rows, load_national(a.year - 1, codes, iso), iso)
    rows, filed = model_codes(cur_rows, prev_rows, pa_rows, annual)
    months = sorted({int(str(r["period"])[-2:]) for r in cur_rows if r.get("period")})
    method = "months filed so far scaled to a full year by each reporter's pattern the year before"
    if national:
        method += ("; months not yet in UN Comtrade taken from " +
                   " and ".join(SOURCE_NAMES.get(k, k) for k in sorted(national)) + " (provisional)")
    meta = {"downloaded": cur["meta"].get("downloaded") or dt.date.today().isoformat(), "year": a.year, "cmd": cmd,
            "modelled": bool(filed), "months": months, "built": dt.date.today().isoformat(),
            "method": method, "national": national,
            "modelled_share": share_modelled(filed, annual), "filed": filed, "annual_records": len(annual or []), "records": len(rows)}
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "data": rows}, f, separators=(",", ":"))
    print(f"Wrote {path}: {len(annual or []):,} annual records kept, {len(rows) - len(annual or []):,} modelled "
          f"from {len(filed)} reporter flows.")
    for src, i in national.items():
        print(f"  {SOURCE_NAMES.get(src, src)}: {i['reporter_flows']} reporter flows in months {', '.join(i['months'])}; "
              f"weight {i.get('kg_vs_comtrade', 'n/a')} x Comtrade where both report; US$ per unit {i['usd_per_unit']}")


if __name__ == "__main__":
    main()
