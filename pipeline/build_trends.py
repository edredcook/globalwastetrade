"""Summarise every year's site data into trend files for the trend charts.

    python pipeline/build_trends.py

Writes site/data/trends.json for plastic waste (HS 3915) and
site/data/trends_<stream>.json for each waste that carries plastic amongst other
materials (whole-stream tonnes). For each figures view (0 = exporters' reports,
1 = importers' reports) and each year it stores world totals; per country, what it
sent abroad and received, in tonnes and US$; and tonnes between World Bank income
groups (exporter's group by recipient's group, using each year's classification).
The two views are kept apart and never added together.

It also writes site/data/completeness.json and completeness.csv: for HS 3915, who
reported exports and imports each year, and what partners recorded with those who did not.

It also writes site/data/flows.json and flows_<stream>.json: every route for every
year, per view, so the Trends page can filter by country, region and income group,
with the imputed routes for economies that did not report (see impute.py) kept apart
under "imputed". HS 3915 is also split by polymer (see polymers.py) into
trends_<polymer>.json and flows_<polymer>.json, reported and imputed routes alike.
site/data/imputed_<year>.json holds the same imputed routes for the
explorer, and manifest.json gets "default": the most recent year with normal coverage.
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

from build_site_data import MATERIALS
from impute import impute
import polymers

GROUPS = ["HIC", "UMC", "LMC", "LIC", "NS"]
SITE_DATA = Path(__file__).resolve().parent.parent / "site" / "data"
REF = Path(__file__).resolve().parent / "reference"


def oecd_members():
    """OECD membership by year for the site: Comtrade code -> accession year."""
    ref = json.loads((REF / "oecd_members.json").read_text(encoding="utf-8"))
    return {"members": {c: m["joined"] for c, m in sorted(ref["members"].items(), key=lambda kv: int(kv[0]))}}


def is_oecd(members, code, year):
    joined = members.get(str(code))
    return joined is not None and joined <= year


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


def flows(years, per_year, schemes, imputed=None, modelled=()):
    """Compact route table. flows[view][i] is a flat list [ex, rc, tonnes, kUS$, ...] for
    year i, with ex and rc as indexes into codes. inc[k] holds one letter per year
    (H, U, M, L, N) for that year's World Bank group."""
    codes = sorted({str(c) for routes in [r for r, _ in per_year] + list(imputed or []) for r in routes
                    for c in (r[1], r[2])}, key=int)
    idx = {c: k for k, c in enumerate(codes)}
    names, inc = {}, {c: ["N"] * len(years) for c in codes}
    for i, (_, cs) in enumerate(per_year):
        for c, v in cs.items():
            if c in idx:
                names[c] = v[:2]
                inc[c][i] = INC_CODE.get(v[2], "N")
    def pack(all_routes):
        out = {str(v): [[] for _ in years] for v in (0, 1)}
        for i, routes in enumerate(all_routes):
            for v, ex, rc, t, usd, *_ in routes:
                ex, rc = str(ex), str(rc)
                if ex == rc or (round(t) == 0 and round(usd / 1000) == 0):
                    continue
                out[str(v)][i] += [idx[ex], idx[rc], round(t), round(usd / 1000)]
        return out
    res = {
        "years": years,
        "groups": GROUPS,
        "codes": codes,
        "names": [names.get(c, [c, "Code " + c]) for c in codes],
        "inc": ["".join(inc[c]) for c in codes],
        "regions": {k: [m.get(c, "") for c in codes] for k, m in schemes.items()},
        "modelled": list(modelled),
        "flows": pack([r for r, _ in per_year]),
    }
    if imputed is not None:
        res["imputed"] = pack(imputed)
    return res


def default_year(comp):
    """The most recent year with normal coverage: no more economies without any
    report than 1.2 times the median of the five years before, and partner-only
    tonnes under 5% of world trade in both views."""
    best = None
    for i, y in enumerate(comp["years"]):
        none = comp["none"][i]
        if none is None:
            continue
        prev = sorted(x for x in comp["none"][max(0, i - 5):i] if x is not None)
        ok_n = not prev or none <= 1.2 * prev[len(prev) // 2]
        ok_t = all(comp["total_t"][v][i] and comp["partner_only_t"][v][i] <= 0.05 * comp["total_t"][v][i]
                   for v in ("0", "1"))
        if ok_n and ok_t:
            best = y
    return best or comp["years"][-1]


def completeness(years, data):
    """Per year: counts of economies by reporting status, the tonnes only partners
    record, and one CSV row per economy."""
    out = {"years": years, "universe": [], "both": [], "x_only": [], "m_only": [], "none": [],
           "partner_only_t": {"0": [], "1": []}, "total_t": {"0": [], "1": []}, "nonreporters": {"0": [], "1": []},
           "nonrep": {"0": [], "1": []}, "names": {}}
    rows = []
    for y, d in zip(years, data):
        rp = d.get("reporting")
        if not rp:
            for k in ("universe", "both", "x_only", "m_only", "none"):
                out[k].append(None)
            for v in ("0", "1"):
                out["partner_only_t"][v].append(None)
                out["total_t"][v].append(None)
                out["nonreporters"][v].append([])
                out["nonrep"][v].append([])
            continue
        U, X, M = rp["universe"], set(rp["X"]), set(rp["M"])
        out["universe"].append(len(U))
        out["both"].append(len(X & M))
        out["x_only"].append(len(X - M))
        out["m_only"].append(len(M - X))
        out["none"].append(len(set(U) - X - M))
        sent, recv = defaultdict(float), defaultdict(float)   # partners' records: imports from c, exports to c
        own_x, own_m = defaultdict(float), defaultdict(float)
        tot = {0: 0.0, 1: 0.0}
        for v, ex, rc, t, usd, est in d["routes"]:
            ex, rc = str(ex), str(rc)
            if ex == rc:
                continue
            tot[v] += t
            if v == 1:
                sent[ex] += t
                own_m[rc] += t
            else:
                recv[rc] += t
                own_x[ex] += t
        # Exporters' view misses what importers record from countries with no export report;
        # importers' view misses what exporters record to countries with no import report.
        po0 = sum(t for c, t in sent.items() if c not in X)
        po1 = sum(t for c, t in recv.items() if c not in M)
        out["partner_only_t"]["0"].append(round(po0))
        out["partner_only_t"]["1"].append(round(po1))
        out["total_t"]["0"].append(round(tot[0]))
        out["total_t"]["1"].append(round(tot[1]))
        out["nonreporters"]["0"].append(sorted((c for c in U if c not in X), key=int))
        out["nonreporters"]["1"].append(sorted((c for c in U if c not in M), key=int))
        inc = d["countries"]
        wb = d.get("schemes", {}).get("wb", {})
        letter = lambda c: INC_CODE.get((inc.get(c) or [None, None, "NS"])[2], "N")
        # Per view, each non-reporter with its World Bank group and what partners recorded with it.
        for v, seen, rep in (("0", sent, X), ("1", recv, M)):
            out["nonrep"][v].append(sorted(([c, round(seen[c]), letter(c)] for c in U if c not in rep),
                                           key=lambda e: (-e[1], U[e[0]][1])))
        for c, (iso, name, _) in U.items():
            out["names"][c] = [iso, name, wb.get(c, "")]
            rows.append([y, c, iso, name, (inc.get(c) or [None, None, ""])[2],
                         "yes" if c in X else "no", "yes" if c in M else "no",
                         round(own_x[c]), round(own_m[c]), round(sent[c]), round(recv[c])])
    out["names"] = dict(sorted(out["names"].items(), key=lambda kv: int(kv[0])))
    return out, rows


CSV_HEAD = ["year", "comtrade_code", "iso3", "country", "income_group", "reported_exports", "reported_imports",
            "own_reported_exports_t", "own_reported_imports_t", "partners_report_imports_from_t",
            "partners_report_exports_to_t"]


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
    universes = [set((d.get("reporting") or {}).get("universe", {})) for d in data]
    imp = impute(years, [d["routes"] for d in data], universes)
    comp, rows = completeness(years, data)
    comp["imputed_t"] = {str(v): [round(sum(r[3] for r in rs if r[0] == v)) for rs in imp] for v in (0, 1)}
    comp["default"] = default_year(comp)
    write("completeness.json", comp)
    # "modelled": mostly modelled from monthly returns; "part_modelled": some reporters modelled.
    modelled = [y for y, d in zip(years, data) if d["meta"].get("modelled") and d["meta"].get("modelled_share", 1) >= 0.5]
    part = [y for y, d in zip(years, data) if d["meta"].get("modelled") and y not in modelled]
    mat_years = {m: [y for y in years if (SITE_DATA / f"{m}_{y}.json").exists()] for m in MATERIALS}
    write("manifest.json", {"latest": years[-1], "default": comp["default"], "years": years,
                            "modelled": modelled, "part_modelled": part,
                            "materials": {m: ys for m, ys in mat_years.items() if ys}})
    with open(SITE_DATA / "completeness.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(CSV_HEAD)
        w.writerows(rows)
    write("flows.json", flows(years, per, schemes, imp, modelled))
    write("oecd.json", oecd_members())
    by_year = [{"plastic": rs} for rs in imp]
    # HS 3915 by polymer: every route, reported and imputed, split in its polymer shares.
    pidx = []
    for y in years:
        p = SITE_DATA / f"polymers_{y}.json"
        pidx.append(polymers.index(json.loads(p.read_text(encoding="utf-8"))["routes"]) if p.exists() else None)
    if any(pidx):
        rep = [polymers.split(d["routes"], ix) for d, ix in zip(data, pidx)]
        pim = [polymers.split(rs, ix) for rs, ix in zip(imp, pidx)]
        for k in polymers.KEYS:
            per = [(r[k], d["countries"]) for r, d in zip(rep, data)]
            write(f"trends_{k}.json", summarise(years, per))
            write(f"flows_{k}.json", flows(years, per, schemes, [m[k] for m in pim], modelled))
    streams = sorted({k for d in data for k in d.get("hidden", {})})
    for k in streams:
        per = [(d.get("hidden", {}).get(k, []), d["countries"]) for d in data]
        imk = impute(years, [r for r, _ in per], universes)
        write(f"trends_{k}.json", summarise(years, per))
        write(f"flows_{k}.json", flows(years, per, schemes, imk, modelled))
        for i, rs in enumerate(imk):
            if rs:
                by_year[i][k] = rs
    # The other material groups: <mat>_<year>.json, for the same years as plastic.
    done = set(streams)
    mats = []
    for mat, cfg in MATERIALS.items():
        mdata = []
        for i, y in enumerate(years):
            p = SITE_DATA / f"{mat}_{y}.json"
            mdata.append(json.loads(p.read_text(encoding="utf-8")) if p.exists() else None)
        if not any(mdata):
            continue
        mats.append(mat)
        munis = [set((d.get("reporting") or {}).get("universe", {})) if d else set() for d in mdata]
        mimp = [{} for _ in years]
        for k in sorted({k for d in mdata if d for k in d["hidden"]}):
            if k in done:                       # borrowed from the plastic files: already built
                for i in range(len(years)):
                    if k in by_year[i]:
                        mimp[i][k] = by_year[i][k]
                continue
            per = [((d or {}).get("hidden", {}).get(k, []), (d or data[i])["countries"]) for i, d in enumerate(mdata)]
            imk = impute(years, [r for r, _ in per], munis)
            write(f"trends_{k}.json", summarise(years, per))
            write(f"flows_{k}.json", flows(years, per, schemes, imk, modelled))
            done.add(k)
            for i, rs in enumerate(imk):
                if rs:
                    mimp[i][k] = rs
        for y, d, mi in zip(years, mdata, mimp):
            if d:
                write(f"imputed_{mat}_{y}.json", mi)
    for y, d in zip(years, by_year):
        write(f"imputed_{y}.json", d)
    print(f"Wrote trends for {len(years)} years: plastic ({sum(1 for x in pidx if x)} years by polymer) and "
          f"{len(streams)} mixed streams ({', '.join(streams)}); "
          f"other groups: {', '.join(mats) or 'none'}.")


if __name__ == "__main__":
    main()
