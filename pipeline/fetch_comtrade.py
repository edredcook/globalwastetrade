"""Download one year of HS trade records from the UN Comtrade API.

Writes pipeline/raw/comtrade_hs<cmd>_<year>.json with the fields the build needs.
Needs a subscription key in the COMTRADE_API_KEY environment variable
(the free tier is enough: 500 calls a day, up to 100,000 records a call),
or --key-from-proxy where a network proxy adds the Ocp-Apim-Subscription-Key header.

    python pipeline/fetch_comtrade.py --year 2023
    python pipeline/fetch_comtrade.py --year 2026 --monthly   # every month published so far
"""
import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://comtradeapi.un.org/data/v1/get/C/A/HS"
API_M = "https://comtradeapi.un.org/data/v1/get/C/M/HS"
REPORTERS = "https://comtradeapi.un.org/files/v1/app/reference/Reporters.json"
MAX_RECORDS = 100_000
BATCH = 15  # reporters per call when one call would hit the record cap
KEEP = [
    "reporterCode", "reporterISO", "reporterDesc", "flowCode",
    "partnerCode", "partnerISO", "partnerDesc", "partner2Code",
    "customsCode", "mosCode", "motCode", "cmdCode",
    "netWgt", "isNetWgtEstimated", "qty", "qtyUnitAbbr",
    "primaryValue", "isReported", "isAggregate", "period",
]
RAW = Path(__file__).resolve().parent / "raw"


def get_json(url, key=None, tries=5):
    headers = {"User-Agent": "globalwastetrade-pipeline"}
    if key:
        headers["Ocp-Apim-Subscription-Key"] = key
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and i < tries - 1:
                time.sleep(10 * (i + 1))
                continue
            body = e.read()[:300].decode("utf-8", "replace")
            raise SystemExit(f"Comtrade returned HTTP {e.code}: {body}")
        except urllib.error.URLError:
            if i < tries - 1:
                time.sleep(10 * (i + 1))
                continue
            raise


def call(key, year, cmd, flow, reporters=None, api=API):
    params = {
        "period": str(year), "cmdCode": cmd, "flowCode": flow,
        "breakdownMode": "plus", "includeDesc": "true",
        "maxRecords": str(MAX_RECORDS), "format": "JSON",
    }
    if reporters:
        params["reporterCode"] = ",".join(str(r) for r in reporters)
    res = get_json(api + "?" + urllib.parse.urlencode(params), key)
    if res.get("error"):
        raise SystemExit(f"Comtrade error: {res['error']}")
    time.sleep(1.5)  # stay well inside the free tier's rate limit
    return res.get("data") or []


def reporter_codes():
    ref = get_json(REPORTERS)
    rows = ref.get("results", ref)
    return sorted({int(r["id"]) for r in rows if not r.get("isGroup") and int(r["id"]) > 0})


def fetch(key, year, cmd, api=API):
    out = []
    for flow in ("X", "M"):
        rows = call(key, year, cmd, flow, api=api)
        if len(rows) >= MAX_RECORDS:
            print(f"{flow}: hit the {MAX_RECORDS:,} record cap, fetching by reporter", file=sys.stderr)
            rows = []
            codes = reporter_codes()
            for i in range(0, len(codes), BATCH):
                part = call(key, year, cmd, flow, codes[i:i + BATCH], api=api)
                if len(part) >= MAX_RECORDS:
                    raise SystemExit("A reporter batch still hit the record cap; lower BATCH.")
                rows += part
        print(f"{flow}: {len(rows):,} records", file=sys.stderr)
        out += [{k: r.get(k) for k in KEEP} for r in rows]
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--cmd", default="3915", help="HS code, or several separated by commas (default 3915, plastic waste)")
    ap.add_argument("--name", help="file name part instead of hs<cmd>, e.g. mixed")
    ap.add_argument("--monthly", action="store_true",
                    help="fetch each month of the year (one period per call) into ..._<year>_monthly.json")
    ap.add_argument("--key-from-proxy", action="store_true",
                    help="send no key; a network proxy adds the subscription header")
    a = ap.parse_args()
    key = os.environ.get("COMTRADE_API_KEY", "").strip()
    if not key and not a.key_from_proxy:
        raise SystemExit("Set COMTRADE_API_KEY first, or pass --key-from-proxy.")
    if a.monthly:
        rows, months = [], []
        for m in range(1, 13):
            print(f"{a.year}-{m:02d}", file=sys.stderr)
            part = fetch(key, f"{a.year}{m:02d}", a.cmd, API_M)
            if part:
                months.append(m)
                rows += part
    else:
        rows = fetch(key, a.year, a.cmd)
    if not rows:
        raise SystemExit("Comtrade returned no records.")
    RAW.mkdir(exist_ok=True)
    path = RAW / f"comtrade_{a.name or 'hs' + a.cmd}_{a.year}{'_monthly' if a.monthly else ''}.json"
    meta = {"downloaded": dt.date.today().isoformat(), "year": a.year, "cmd": a.cmd,
            "endpoint": API_M if a.monthly else API, "breakdownMode": "plus", "records": len(rows)}
    if a.monthly:
        meta["months"] = months
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "data": rows}, f, separators=(",", ":"))
    print(f"Wrote {path} ({len(rows):,} records)")


if __name__ == "__main__":
    main()
