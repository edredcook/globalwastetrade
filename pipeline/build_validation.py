"""Compare this site's figures with published studies and official statistics.

    python pipeline/build_validation.py

Reads the published figures in pipeline/reference/validation_sources.json and works
out the same measure from site/data/plastic_<year>.json: the reported routes after
cleaning, never the imputed routes, and never a modelled year. Exporters' and
importers' figures are worked out separately and never added together. Where a study
took the larger of the two reports for each route, that figure is given as well, for
that comparison only.

Writes site/data/validation.json for the Validation page.
"""
import json
from pathlib import Path

from build_site_data import MATERIALS

ROOT = Path(__file__).resolve().parent.parent
SITE_DATA = ROOT / "site" / "data"
REFERENCE = ROOT / "pipeline" / "reference"

EU27 = {40, 56, 100, 191, 196, 203, 208, 233, 246, 251, 276, 300, 348, 372, 380, 428,
        440, 442, 470, 528, 616, 620, 642, 703, 705, 724, 752}
MLIC = {"UMC", "LMC", "LIC"}


def load_year(year, mat=None):
    with open(SITE_DATA / (f"{mat}_{year}.json" if mat else f"plastic_{year}.json"), encoding="utf-8") as f:
        return json.load(f)


def member(spec, d):
    """Return a test code -> bool for a set spec in year file d."""
    if isinstance(spec, list):
        s = {int(c) for c in spec}
        return lambda c: c in s
    if spec.startswith("!"):
        inner = member(spec[1:], d)
        return lambda c: not inner(c)
    if spec == "*":
        return lambda c: True
    if spec == "EU27":
        return lambda c: c in EU27
    if spec == "OECD":
        oecd = d["schemes"]["oecd"]
        return lambda c: oecd.get(str(c), "").startswith("OECD")
    if spec == "MLIC":
        cs = d["countries"]
        return lambda c: (cs.get(str(c)) or [None, None, None])[2] in MLIC
    raise ValueError(f"unknown set {spec!r}")


def routes_of(d, stream=None):
    if isinstance(stream, list):
        rs = [r for k in stream for r in d["hidden"].get(k, [])]
    else:
        rs = d["hidden"].get(stream, []) if stream else d["routes"]
    return [r for r in rs if r[1] != r[2]]


def measure(d, m, stream=None):
    """Tonnes for exporters' view, importers' view, and the larger report per route."""
    fr, to = member(m["from"], d), member(m["to"], d)
    views = [0.0, 0.0]
    pair = {}
    for v, ex, rc, t, usd, est in routes_of(d, stream):
        if fr(int(ex)) and to(int(rc)):
            views[v] += t
            k = (int(ex), int(rc))
            pair[k] = max(pair.get(k, 0.0), t)
    return views[0], views[1], sum(pair.values())


def stream_of(check):
    """A plastic stream, or for another material group the listed streams (default: all its own)."""
    if check.get("material"):
        return check.get("streams") or list(MATERIALS[check["material"]]["streams"])
    return check.get("stream")


def ours(check, data):
    years = check.get("years") or [check["year"]]
    rows = []
    st = stream_of(check)
    for y in years:
        d = data[(check.get("material"), y)] if check.get("material") else data[y]
        x, mm, lg = measure(d, check["measure"], st)
        if "share_of" in check:
            bx, bm, blg = measure(d, check["share_of"], st)
            x, mm, lg = (100 * x / bx if bx else None, 100 * mm / bm if bm else None,
                         100 * lg / blg if blg else None)
        rows.append((x, mm, lg))
    mean = lambda vals: None if any(v is None for v in vals) else sum(vals) / len(vals)
    x, mm, lg = (mean([r[i] for r in rows]) for i in range(3))
    return x, mm, lg


def diff(ourv, pub):
    if ourv is None or not pub:
        return None
    return ourv / pub - 1


def rnd(v, unit):
    if v is None:
        return None
    return round(v, 1) if unit == "%" else round(v)


def build():
    with open(REFERENCE / "validation_sources.json", encoding="utf-8") as f:
        ref = json.load(f)
    with open(SITE_DATA / "manifest.json", encoding="utf-8") as f:
        manifest = json.load(f)
    modelled = set(manifest.get("modelled", []))
    years = [y for y in manifest["years"] if y not in modelled]

    needed = set()
    for c in ref["checks"]:
        needed.update(c.get("years") or [c["year"]])
    needed.add(ref["baci_streams"]["year"])
    data = {y: load_year(y) for y in sorted(needed) if y in years}
    for c in ref["checks"]:
        m = c.get("material")
        for y in (c.get("years") or [c["year"]]) if m else ():
            if y in years and (m, y) not in data and (SITE_DATA / f"{m}_{y}.json").exists():
                data[(m, y)] = load_year(y, m)

    checks = []
    for c in ref["checks"]:
        ys = c.get("years") or [c["year"]]
        if any((c.get("material"), y) not in data if c.get("material") else y not in data for y in ys):
            continue
        unit = c.get("unit", "t")
        pub = c["published"] * c.get("scale", 1)
        x, m, lg = ours(c, data)
        row = {
            "group": c["group"], "label": c["label"],
            "year": f"{ys[0]}–{ys[-1]}" if len(ys) > 1 else ys[0],
            "unit": unit, "published": pub, "source": c["source"],
            "x": rnd(x, unit), "m": rnd(m, unit),
            "dx": diff(x, pub), "dm": diff(m, pub),
            "why": c.get("why", ""),
        }
        if c.get("rule") == "larger":
            row["larger"] = rnd(lg, unit)
            row["dl"] = diff(lg, pub)
        for k in ("dx", "dm", "dl"):
            if row.get(k) is not None:
                row[k] = round(row[k], 3)
        checks.append(row)

    # Wastes that carry plastic amongst other materials, against BACI.
    bs = ref["baci_streams"]
    with open(REFERENCE / "baci_mixed_streams_2023.json", encoding="utf-8") as f:
        baci = json.load(f)
    streams = []
    d = data.get(bs["year"])
    if d is not None and baci.get("year") == bs["year"]:
        for key, label in bs["labels"].items():
            b = sum(r[2] for r in baci["streams"].get(key, []) if r[0] != r[1])
            x, m, _ = measure(d, {"from": "*", "to": "*"}, stream=key)
            streams.append({"key": key, "label": label, "baci": round(b), "x": round(x), "m": round(m),
                            "dx": round(diff(x, b), 3) if b else None,
                            "dm": round(diff(m, b), 3) if b else None,
                            "why": bs["why"].get(key, "")})

    # World totals for the chart: reported routes only.
    series = {"years": years, "x": [], "m": []}
    for y in years:
        dy = data.get(y) or load_year(y)
        x, m, _ = measure(dy, {"from": "*", "to": "*"})
        series["x"].append(round(x))
        series["m"].append(round(m))

    out = {
        "built": manifest.get("built") or None,
        "sources": ref["sources"],
        "checks": checks,
        "streams": {"year": bs["year"], "source": bs["source"], "rows": streams},
        "world": series,
        "findings": ref.get("findings", []),
    }
    with open(SITE_DATA / "validation.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    return out


if __name__ == "__main__":
    o = build()
    for c in o["checks"]:
        f = lambda v: "–" if v is None else f"{v:+.0%}"
        print(f"{c['group'][:14]:14} {c['label'][:40]:40} {c['year']!s:10} pub {c['published']:>12,.1f} "
              f"X {c['x'] if c['x'] is not None else '-':>12} ({f(c['dx'])}) M {c['m'] if c['m'] is not None else '-':>12} ({f(c['dm'])})"
              + (f" L {c['larger']} ({f(c['dl'])})" if 'larger' in c else ""))
    for s in o["streams"]["rows"]:
        print(s)
