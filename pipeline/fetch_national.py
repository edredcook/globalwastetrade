"""Download recent monthly waste trade from national statistics offices.

These sources publish a month's trade weeks before it reaches UN Comtrade. Each
source is reported by one country (or the EU), so its export rows belong only to
the exporters' view and its import rows only to the importers' view.

Writes pipeline/raw/national/<source>_<YYYYMM>.json, one row per
reporter, partner, flow and HS6 code:
    {"source", "reporterISO", "partnerISO", "partnerName", "flow" ("X" or "M"),
     "cmd" (HS6), "period" (YYYYMM), "kg", "value", "currency"}

    python pipeline/fetch_national.py --source comext --month 2026-09
    python pipeline/fetch_national.py --source all --latest 3

Sources and what they need:
    comext  Eurostat Comext, EU-27 by partner, CN8. No key.
    hmrc    UK HMRC overseas trade statistics, CN8. No key.
    census  US Census international trade API, HS6. Needs CENSUS_API_KEY (free).
    estat   Japan Customs via e-Stat. Needs ESTAT_APP_ID (free registration).
    kcs     Korea Customs Service via data.go.kr. Needs KCS_SERVICE_KEY (free).
"""
import argparse
import datetime as dt
import json
import os
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE / "raw" / "national"
CODES = json.loads((HERE / "reference" / "national_codes.json").read_text(encoding="utf-8"))
# Plastic waste plus every waste stream the site shows, and tyres, then the main codes
# of the other material groups (metals, textiles, e-waste; paper is HS 4707). HS4 or HS6 prefixes.
WASTE_CODES = ["3915", "550510", "6309", "6310", "854931", "854939", "854991", "854999",
               "382510", "4707", "401220", "400400", "401700",
               "7204", "7404", "7602", "7503", "7802", "7902", "8002", "7112",
               "550520", "5202", "5103", "5104", "5003", "530130",
               "854911", "854912", "854913", "854914", "854919", "854921", "854929"]
HS4 = os.environ.get("NATIONAL_CODES", ",".join(WASTE_CODES)).split(",")
# Comext is asked for HS6 subheadings; these expand the four-digit codes.
HS6_OF = {"3915": ["391510", "391520", "391530", "391590"], "6309": ["630900"],
          "6310": ["631010", "631090"], "4707": ["470710", "470720", "470730", "470790"],
          "7204": ["720410", "720421", "720429", "720430", "720441", "720449", "720450"],
          "7404": ["740400"], "7602": ["760200"], "7503": ["750300"], "7802": ["780200"],
          "7902": ["790200"], "8002": ["800200"], "7112": ["711291", "711292", "711299"],
          "5202": ["520210", "520291", "520299"], "5103": ["510310", "510320", "510330"],
          "5104": ["510400"], "5003": ["500300"]}
EU27 = ("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE").split()


def get(url, headers=None, tries=4, raw=False):
    h = {"User-Agent": "globalwastetrade-pipeline", "Accept": "application/json"}
    h.update(headers or {})
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=180) as r:
                body = r.read()
                return body if raw else json.loads(body)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and i < tries - 1:
                time.sleep(10 * (i + 1))
                continue
            msg = e.read()[:400].decode("utf-8", "replace")
            raise RuntimeError(f"HTTP {e.code} from {url.split('?')[0]}: {msg}")
        except urllib.error.URLError:
            if i < tries - 1:
                time.sleep(10 * (i + 1))
                continue
            raise


def iso3_from_iso2(code):
    return CODES["iso2"].get(code)


def iso3_from_name(name):
    return CODES["names"].get(name.strip().upper())


def add(acc, source, rep, par, par_name, flow, cmd, period, kg, value, currency):
    """Sum into HS6 rows; partners with no ISO3 are kept under their name."""
    key = (rep, par or "", par_name, flow, str(cmd)[:6], period)
    a = acc.setdefault(key, {"kg": 0.0, "value": 0.0, "currency": currency, "source": source})
    a["kg"] += float(kg or 0)
    a["value"] += float(value or 0)


def rows_from(acc):
    out = []
    for (rep, par, name, flow, cmd, period), a in sorted(acc.items()):
        out.append({"source": a["source"], "reporterISO": rep, "partnerISO": par or None,
                    "partnerName": name, "flow": flow, "cmd": cmd, "period": period,
                    "kg": round(a["kg"], 1), "value": round(a["value"], 2), "currency": a["currency"]})
    return out


# ---------- Eurostat Comext (JSON-stat 2.0) ----------
COMEXT = "https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409"


def parse_jsonstat(js):
    """Yield ({dimension: code}, value) for every cell of a JSON-stat 2.0 dataset."""
    ids, sizes = js["id"], js["size"]
    index = []
    for d in ids:
        idx = js["dimension"][d]["category"]["index"]
        if isinstance(idx, list):
            idx = {c: i for i, c in enumerate(idx)}
        index.append({i: c for c, i in idx.items()})
    values = js.get("value") or {}
    items = values.items() if isinstance(values, dict) else enumerate(values)
    for flat, v in items:
        if v is None:
            continue
        flat = int(flat)
        pos = []
        for s in reversed(sizes):
            pos.append(flat % s)
            flat //= s
        pos.reverse()
        yield {d: index[k][p] for k, (d, p) in enumerate(zip(ids, pos))}, v


def comext(month):
    acc = {}
    period = month.replace("-", "")
    for flow_code, flow in (("1", "M"), ("2", "X")):
        for rep in EU27:
            params = [("format", "JSON"), ("lang", "en"), ("freq", "M"), ("reporter", rep),
                      ("flow", flow_code), ("time", month),
                      ("indicators", "VALUE_IN_EUROS"), ("indicators", "QUANTITY_IN_100KG")]
            params += [("product", p) for p in product_codes_hs6()]
            js = get(COMEXT + "?" + urllib.parse.urlencode(params))
            cells = defaultdict(dict)
            for dims, v in parse_jsonstat(js):
                k = (dims["partner"], dims["product"])
                cells[k][dims["indicators"]] = v
            for (par, prod), ind in cells.items():
                par3 = iso3_from_iso2(par)
                if par3 is None and not par.isalpha():
                    continue  # aggregates such as EU27_2020_EXTRA
                if par3 is None and len(par) != 2:
                    continue
                add(acc, "comext", iso3_from_iso2(rep), par3, par, flow, prod, period,
                    (ind.get("QUANTITY_IN_100KG") or 0) * 100, ind.get("VALUE_IN_EUROS"), "EUR")
            time.sleep(0.5)
    return rows_from(acc)


def product_codes_hs6():
    out = []
    for h in HS4:
        out += HS6_OF.get(h, [h])
    return out


# ---------- UK HMRC (OData) ----------
HMRC = "https://api.uktradeinfo.com"


def hmrc(month):
    period = month.replace("-", "")
    countries = {}
    url = HMRC + "/Country"
    while url:
        res = get(url)
        for c in res.get("value", []):
            countries[c["CountryId"]] = (c.get("CountryCodeAlpha"), c.get("CountryName"))
        url = res.get("@odata.nextLink")
    acc = {}
    for h in HS4:
        lo, hi = int(h.ljust(8, "0")), int(h.ljust(8, "9"))
        flt = f"MonthId eq {period} and CommodityId ge {lo} and CommodityId le {hi}"
        url = HMRC + "/OTS?" + urllib.parse.urlencode({"$filter": flt}, quote_via=urllib.parse.quote)
        while url:
            res = get(url)
            for r in res.get("value", []):
                flow = "M" if r["FlowTypeId"] in (1, 3) else "X"
                a2, name = countries.get(r["CountryId"], (None, str(r["CountryId"])))
                add(acc, "hmrc", "GBR", iso3_from_iso2(a2) if a2 else None, name or a2, flow,
                    str(r["CommodityId"]).zfill(8), period, r.get("NetMass"), r.get("Value"), "GBP")
            url = res.get("@odata.nextLink")
    return rows_from(acc)


# ---------- US Census ----------
CENSUS = "https://api.census.gov/data/timeseries/intltrade"


def census(month):
    period = month.replace("-", "")
    key = os.environ.get("CENSUS_API_KEY")
    if not key:
        raise RuntimeError("US Census needs CENSUS_API_KEY; register for a free key and add it as a repo secret.")
    acc = {}
    specs = (("exports", "X", "E_COMMODITY", "ALL_VAL_MO", "QTY_1_MO"),
             ("imports", "M", "I_COMMODITY", "GEN_VAL_MO", "GEN_QY1_MO"))
    errors = []
    for path, flow, comm, val, qty in specs:
        for h in HS4:
            # Quantities are only given at the 10-digit level, so ask for HS10 lines.
            params = {"get": f"CTY_CODE,CTY_NAME,{comm},{val},{qty},UNIT_QY1",
                      "COMM_LVL": "HS10", comm: h + "*", "time": month, "key": key}
            try:
                body = get(f"{CENSUS}/{path}/hs?" + urllib.parse.urlencode(params, safe=",*"), raw=True)
            except RuntimeError as e:
                errors.append(str(e))
                continue
            if not body.strip():
                continue  # the API answers an empty body when the month is not out yet
            try:
                res = json.loads(body)
            except json.JSONDecodeError:
                errors.append("non-JSON answer: " + body[:200].decode("utf-8", "replace").replace("\n", " "))
                continue
            head, rows = res[0], res[1:]
            ix = {c: i for i, c in enumerate(head)}
            for r in rows:
                code, name = r[ix["CTY_CODE"]], r[ix["CTY_NAME"]]
                if not code.isdigit() or code.startswith("0"):
                    continue  # totals and country groups
                unit = r[ix["UNIT_QY1"]]
                kg = float(r[ix[qty]] or 0) * {"KG": 1, "T": 1000}.get(unit, 0)
                add(acc, "census", "USA", iso3_from_name(name), name, flow, r[ix[comm]], period,
                    kg, r[ix[val]], "USD")
    if errors and not acc:
        raise RuntimeError(errors[0])
    return rows_from(acc)


ESTAT = "https://api.e-stat.go.jp/rest/3.0/app/json"


ESTAT_TABLES = {"X": "Commodity by Country Export", "M": "Commodity by Country Import"}
MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def _list(x):
    return x if isinstance(x, list) else ([x] if x else [])


def estat_table_ids(app, month):
    """Japan Customs publishes one commodity-by-country table per year and flow."""
    res = get(ESTAT + "/getStatsList?" + urllib.parse.urlencode(
        {"appId": app, "statsCode": "00350300", "surveyYears": month.replace("-", ""), "lang": "E"}))
    out = {}
    for t in _list((res.get("GET_STATS_LIST", {}).get("DATALIST_INF") or {}).get("TABLE_INF")):
        name = str(t.get("STATISTICS_NAME") or "")
        for flow, key in ESTAT_TABLES.items():
            if name.endswith("Japan " + key) and flow not in out:
                out[flow] = t["@id"]
    return out


def estat(month):
    app = os.environ.get("ESTAT_APP_ID")
    if not app:
        raise RuntimeError("Japan e-Stat needs ESTAT_APP_ID; register for a free key and add it as a repo secret.")
    period = month.replace("-", "")
    mon = MONTHS[int(month[5:7]) - 1]
    acc, seen_units = {}, set()
    for flow, table in estat_table_ids(app, month).items():
        meta = get(ESTAT + "/getMetaInfo?" + urllib.parse.urlencode(
            {"appId": app, "statsDataId": table, "lang": "E"}))
        classes = {o["@id"]: _list(o.get("CLASS")) for o in
                   _list(meta["GET_META_INFO"]["METADATA_INF"]["CLASS_INF"]["CLASS_OBJ"])}
        goods = [c["@code"] for c in classes["cat01"] if c["@code"].startswith(tuple(HS4))]
        cols = {}
        for c in classes["cat02"]:
            n = c["@name"].lower()
            if mon in n and n.startswith("quantity1"):
                cols["q"] = c["@code"]
            elif mon in n and n.startswith("quantity2"):
                cols["q2"] = c["@code"]
            elif n == "unit2":
                cols["u2"] = c["@code"]
            elif mon in n and n.startswith("value"):
                cols["v"] = c["@code"]
            elif n == "unit1":
                cols["u"] = c["@code"]
        if not goods or "q" not in cols or "v" not in cols:
            names = [c["@name"] for c in classes["cat02"]]
            raise RuntimeError(f"e-Stat table {table} layout not recognised: {names[:12]}")
        areas = {c["@code"]: c["@name"] for c in classes["area"]}
        cells = defaultdict(dict)
        start = 1
        while start:
            res = get(ESTAT + "/getStatsData?" + urllib.parse.urlencode(
                {"appId": app, "statsDataId": table, "lang": "E", "cdCat01": ",".join(goods),
                 "cdCat02": ",".join(cols.values()), "startPosition": start, "limit": 100000}))
            data = res["GET_STATS_DATA"]["STATISTICAL_DATA"]
            for v in _list(data.get("DATA_INF", {}).get("VALUE")):
                cells[(v["@cat01"], v["@area"])][v["@cat02"]] = v.get("$")
            start = (data.get("RESULT_INF") or {}).get("NEXT_KEY")
        # Units are columns of their own (full-width text, e.g. "ＫＧ") and may sit only on
        # some cells of a commodity. Japan gives weight as quantity 1 or quantity 2.
        units = {}
        for (good, area), c in cells.items():
            for k in ("u", "u2"):
                u = unicodedata.normalize("NFKC", str(c.get(cols.get(k)) or "")).strip().upper()
                if u and u not in ("-", "***"):
                    units[(good, k)] = u
        seen_units.update(units.values())
        for (good, area), c in cells.items():
            def num(x):
                try:
                    return float(x)
                except (TypeError, ValueError):
                    return 0.0
            val = num(c.get(cols["v"]))
            kg = 0.0
            for qk, uk in (("q", "u"), ("q2", "u2")):
                f = {"KG": 1, "MT": 1000, "TNE": 1000}.get(units.get((good, uk)), 0)
                if f and cols.get(qk):
                    kg = num(c.get(cols[qk])) * f
                    break
            if not kg and not val:
                continue
            name = areas.get(area, area)
            # Values are published in thousands of yen.
            add(acc, "estat", "JPN", iso3_from_name(name), name, flow, good, period, kg, val * 1000, "JPY")
    print(f"e-Stat {month}: quantity units seen {sorted(seen_units)}")
    return rows_from(acc)


def needs_key(var, what):
    def run(month):
        if not os.environ.get(var):
            raise RuntimeError(f"{what} needs {var}; register for a free key and add it as a repo secret.")
        raise RuntimeError(f"{what} fetcher not written yet; it is built once {var} exists to test with.")
    return run


SOURCES = {
    "comext": comext,
    "hmrc": hmrc,
    "census": census,
    "estat": estat,
    "kcs": needs_key("KCS_SERVICE_KEY", "Korea Customs Service"),
}


def months_back(n, today=None):
    today = today or dt.date.today()
    y, m = today.year, today.month
    out = []
    for _ in range(n):
        m -= 1
        if m == 0:
            y, m = y - 1, 12
        out.append(f"{y}-{m:02d}")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--source", default="all", help="comext, hmrc, census, estat, kcs or all")
    ap.add_argument("--month", action="append", help="YYYY-MM; repeat for several")
    ap.add_argument("--latest", type=int, default=0, help="also try the last N complete months")
    args = ap.parse_args()
    months = list(args.month or []) + months_back(args.latest)
    if not months:
        ap.error("give --month or --latest")
    names = list(SOURCES) if args.source == "all" else args.source.split(",")
    RAW.mkdir(parents=True, exist_ok=True)
    summary, failed = [], False
    for s in names:
        for month in months:
            try:
                rows = SOURCES[s](month)
            except Exception as e:  # report and carry on with the other sources
                summary.append(f"| {s} | {month} | not fetched: {str(e)[:160]} |")
                failed = failed or s in ("comext", "hmrc")
                continue
            if not rows:
                summary.append(f"| {s} | {month} | no rows yet |")
                continue
            (RAW / f"{s}_{month.replace('-', '')}.json").write_text(json.dumps(rows), encoding="utf-8")
            kt = {f: sum(r["kg"] for r in rows if r["flow"] == f) / 1e6 for f in "XM"}
            unmatched = sorted({r["partnerName"] for r in rows if not r["partnerISO"]})
            note = f"{len(rows)} rows, exports {kt['X']:.1f} kt, imports {kt['M']:.1f} kt"
            if unmatched:
                note += "; partners with no ISO code: " + ", ".join(unmatched[:12])
            summary.append(f"| {s} | {month} | {note} |")
    report = "| Source | Month | Result |\n| --- | --- | --- |\n" + "\n".join(summary)
    print(report)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write("## National trade data\n\n" + report + "\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
