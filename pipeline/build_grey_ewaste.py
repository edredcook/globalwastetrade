"""Estimate e-waste shipped as used goods, every year, by copying the Global E-waste Monitor's screen.

    python pipeline/build_grey_ewaste.py

Baldé et al. (2022, pp. 22-23) took exports of electrical and electronic goods from
UN Comtrade, treated each record priced below 30% of its code's median US$ per kg
(10% for small IT) as used equipment or e-waste, dropped records going to OECD or Gulf
countries, then scaled the result up to 3.3 Mt for 2019 to match the Countering WEEE
Illegal Trade study. They describe these flows as going from high-income to middle- and
low-income countries, and checked the largest records by hand; here that check is a rule:
the sending country must be high-income (World Bank group for that year) and outside the
Gulf, which keeps out cheap new goods from China and Gulf re-export hubs. This script runs the same screen on every year downloaded by
fetch_used_eee.py (pipeline/raw/comtrade_usedeee_<year>.json), applies the one factor
that makes 2019 equal 3.3 Mt, and takes 33% to 70% of the result as e-waste (Baldé et
al. 2024, p. 38); the rest is working second-hand equipment.

A sending country with no exports reported for a year (late or missing returns, and the
current year before it is filed) keeps its screened tonnes from its latest earlier year
for up to two years,
so every year up to the current one has an estimate; those tonnes are counted in
carried_t. Years before the first download keep their rows from the last build, and the factor
comes from the last build when the 2019 download is not present (the monthly refresh
downloads only recent years).

Writes site/data/grey_ewaste.json: world totals per year (screened tonnes, the scaled
total, the low, central and high e-waste estimates, and the part carried forward), and
the central estimate by receiving income group, sending country and receiving country.
"""
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_site_data as b  # noqa: E402

REF = b.REF / "used_eee_codes.json"
OUT = b.SITE_DATA / "grey_ewaste.json"
CARRY = 2  # years a sending country's last report is carried forward


def oecd_in(year):
    m = b.load(b.REF / "oecd_members.json")["members"]
    return {int(k) for k, v in m.items() if v["joined"] <= year}


def screen(year, ref, group):
    """Screened records for one year: [(exporter, importer, tonnes, code)]."""
    raw = b.load(b.RAW / f"comtrade_usedeee_{year}.json")["data"]
    cat = {c: k["cat"] for k in ref["keys"].values() for c in k["hs"] + k.get("older", [])}
    by = defaultdict(list)
    for r in raw:
        kg, usd = r.get("netWgt") or 0, r.get("primaryValue") or 0
        if kg > 0 and usd > 0:
            by[str(r["cmdCode"])].append((int(r["reporterCode"]), int(r["partnerCode"]), kg, usd))
    gulf = {int(c) for c in ref["gulf"]}
    skip = oecd_in(year) | gulf
    out = []
    for code, rs in by.items():
        if code not in cat:
            continue
        med = statistics.median(u / k for _, _, k, u in rs)
        cut = ref["threshold"][cat[code]] * med
        for ex, im, kg, usd in rs:
            if usd / kg < cut and im not in skip and ex not in gulf and group(ex, year) == "HIC":
                out.append((ex, im, kg / 1000, code))
    return out


def main():
    ref = b.load(REF)
    cal = ref["calibration"]
    years = sorted(int(p.stem.split("_")[-1]) for p in b.RAW.glob("comtrade_usedeee_*.json"))
    old = b.load(OUT) if OUT.exists() else {"meta": {}, "years": []}
    if not years:
        raise SystemExit("No used-equipment downloads in pipeline/raw.")
    if cal["year"] not in years and not old["meta"].get("factor"):
        raise SystemExit(f"No used-equipment download for {cal['year']}, the calibration year, and no earlier build.")
    income = b.load(b.REF / "income_history.json")
    countries = b.load(b.REF / "countries.json")
    def group(c, y):
        iso = (countries.get(str(c)) or [""])[0]
        g = income["groups"].get(b.WB_ISO.get(iso, iso))
        return (g or {}).get(str(min(y, income["years"][1])), "NS") if g else "NS"

    lo, hi = cal["ewaste_share"]
    per = {y: screen(y, ref, group) for y in years}
    rows = {r["year"]: r for r in old["years"]}
    # The first downloaded year only seeds the carry-forward when an earlier build has
    # the year before it (the refresh downloads one year more than it rebuilds).
    seed = min(years) if min(years) - 1 in rows and min(years) in rows else None
    built, last = {}, {}  # year -> (records, carried tonnes); sender -> (year, its records)
    for y in range(min(years), max(max(years), b.dt.date.today().year) + 1):
        recs = list(per.get(y, []))
        sent = {ex for ex, _, _, _ in recs}
        carried = 0.0
        for ex, (ly, rs) in last.items():
            if ex not in sent and y - ly <= CARRY:
                recs += rs
                carried += sum(t for _, _, t, _ in rs)
        for ex in sent:
            last[ex] = (y, [r for r in per[y] if r[0] == ex])
        if y != seed and recs and (y in per or y > max(years) or y not in rows):
            built[y] = (recs, carried)
    if cal["year"] in built:
        factor = cal["total_t"] / sum(t for _, _, t, _ in built[cal["year"]][0])
    else:
        factor = old["meta"]["factor"]
    mid = (lo + hi) / 2
    for y, (recs, carried) in built.items():
        tot = sum(t for _, _, t, _ in recs)
        s_t = tot * factor
        inc, frm, to = defaultdict(float), defaultdict(float), defaultdict(float)
        for ex, im, t, _ in recs:
            inc[group(im, y)] += t * factor * mid
            frm[str(ex)] += t * factor * mid
            to[str(im)] += t * factor * mid
        rows[y] = {"year": y, "screened_t": round(tot), "scaled_t": round(s_t), "carried_t": round(carried * factor),
                   "low_t": round(s_t * lo), "central_t": round(s_t * mid), "high_t": round(s_t * hi),
                   "to_income": {g: round(v) for g, v in sorted(inc.items())},
                   "from": {k: round(v) for k, v in sorted(frm.items(), key=lambda kv: -kv[1]) if v >= 500},
                   "to": {k: round(v) for k, v in sorted(to.items(), key=lambda kv: -kv[1]) if v >= 500}}
    rows = [rows[y] for y in sorted(rows)]
    names = {c: (countries.get(c) or [c, c])[1] for r in rows for c in list(r.get("from", {})) + list(r.get("to", {}))}
    data = {"meta": {"source": "UN Comtrade API, exporters' reports of " + str(len([c for k in ref["keys"].values() for c in k["hs"]])) +
                     " HS codes for electrical and electronic goods; method of Baldé et al. (2022), pp. 22-23",
                     "factor": round(factor, 2), "calibration": cal, "built": b.dt.date.today().isoformat()},
            "years": rows, "names": names}
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    for r in rows:
        print(f"{r['year']}: screened {r['screened_t'] / 1e3:,.0f} kt, e-waste {r['low_t'] / 1e6:.2f} to {r['high_t'] / 1e6:.2f} Mt")
    print(f"Factor {factor:.2f}. Wrote {OUT}")


if __name__ == "__main__":
    main()
