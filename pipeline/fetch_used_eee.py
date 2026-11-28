"""Download one year of exports of electrical and electronic goods for the used-equipment screen.

Reads the product codes from pipeline/reference/used_eee_codes.json and writes
pipeline/raw/comtrade_usedeee_<year>.json: exporters' reports only (the screen uses
exports, as Baldé et al. 2022 did), totals over transport mode and partner 2.
Needs COMTRADE_API_KEY, or --key-from-proxy where a network proxy adds the key.
"""
import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
from pathlib import Path

from fetch_comtrade import API, get_json

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "pipeline" / "raw"
REF = ROOT / "pipeline" / "reference" / "used_eee_codes.json"
CAP = 100000
KEEP = ("reporterCode", "partnerCode", "cmdCode", "netWgt", "primaryValue", "isNetWgtEstimated")


def codes():
    ref = json.loads(REF.read_text(encoding="utf-8"))
    return [c for k in ref["keys"].values() for c in k["hs"] + k.get("older", [])]


def call(key, year, cmds):
    params = {"period": str(year), "cmdCode": ",".join(cmds), "flowCode": "X", "partner2Code": "0",
              "motCode": "0", "customsCode": "C00", "maxRecords": str(CAP), "format": "JSON"}
    res = get_json(API + "?" + urllib.parse.urlencode(params), key)
    if res.get("error"):
        raise SystemExit(f"Comtrade error: {res['error']}")
    time.sleep(1.5)
    return res.get("data") or []


def fetch(key, year, cmds):
    rows = call(key, year, cmds)
    if len(rows) >= CAP:
        if len(cmds) == 1:
            raise SystemExit(f"HS {cmds[0]} alone hit the record cap for {year}.")
        half = len(cmds) // 2
        return fetch(key, year, cmds[:half]) + fetch(key, year, cmds[half:])
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--key-from-proxy", action="store_true")
    a = ap.parse_args()
    key = os.environ.get("COMTRADE_API_KEY", "").strip()
    if not key and not a.key_from_proxy:
        raise SystemExit("Set COMTRADE_API_KEY first, or pass --key-from-proxy.")
    cs, rows = codes(), []
    for i in range(0, len(cs), 6):
        part = fetch(key, a.year, cs[i:i + 6])
        rows += [{k: r.get(k) for k in KEEP} for r in part
                 if r.get("partnerCode") not in (0, None) and r.get("partnerCode") != r.get("reporterCode")]
        print(f"{a.year} {','.join(cs[i:i + 6])}: {len(part):,} records", file=sys.stderr)
    if not rows:
        raise SystemExit("Comtrade returned no records.")
    RAW.mkdir(exist_ok=True)
    path = RAW / f"comtrade_usedeee_{a.year}.json"
    meta = {"downloaded": dt.date.today().isoformat(), "year": a.year, "codes": cs, "flow": "X", "records": len(rows)}
    path.write_text(json.dumps({"meta": meta, "data": rows}, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {path} ({len(rows):,} records)")


if __name__ == "__main__":
    main()
