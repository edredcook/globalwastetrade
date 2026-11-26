import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import build_trends as bt  # noqa: E402
import model_part_year as mp  # noqa: E402
from impute import LINE, PARTNER, TREND, impute  # noqa: E402

U = {"1", "2", "3", "4"}


class Impute(unittest.TestCase):
    def test_partner_fill_scaled_by_own_ratio_and_views_kept_apart(self):
        # Year 0: country 1 exports 100 to 2; importer 2 records 80 from 1 (ratio 1.25).
        # Year 1: country 1 files nothing; importer 2 records 40 from it.
        y0 = [[0, 1, 2, 100, 1000, 0], [1, 1, 2, 80, 900, 0]]
        y1 = [[1, 1, 2, 40, 450, 0]]
        imp = impute([2020, 2021], [y0, y1], [U, U])
        self.assertEqual(imp[0], [])
        self.assertEqual(len(imp[1]), 1)
        v, ex, rc, t, usd, how = imp[1][0]
        self.assertEqual((v, ex, rc, how), (0, 1, 2, PARTNER))
        self.assertAlmostEqual(t, 50)
        self.assertAlmostEqual(usd, 500)
        # The importers' view is reported and gets nothing added.
        self.assertFalse([r for r in imp[1] if r[0] == 1])

    def test_ratio_clipped(self):
        y0 = [[0, 1, 2, 1000, 1000, 0], [1, 1, 2, 10, 1000, 0]]
        y1 = [[1, 1, 2, 10, 1000, 0]]
        self.assertAlmostEqual(impute([1, 2], [y0, y1], [U, U])[1][0][3], 20)

    def test_short_gap_filled_on_straight_line(self):
        y0 = [[0, 1, 3, 100, 100, 0]]
        y2 = [[0, 1, 3, 300, 300, 0]]
        imp = impute([1, 2, 3], [y0, [], y2], [U, U, U])
        r = [x for x in imp[1] if x[0] == 0]
        self.assertEqual(r, [[0, 1, 3, 200, 200, LINE]])

    def test_trend_is_the_fallback(self):
        # Country 1 last reported a year ago; reporters that filed both years fell by half.
        y0 = [[0, 1, 3, 100, 100, 0], [0, 2, 4, 1000, 1000, 0]]
        y1 = [[0, 2, 4, 500, 500, 0]]
        imp = impute([1, 2], [y0, y1], [U, U])
        r = [x for x in imp[1] if x[0] == 0 and x[1] == 1]
        self.assertEqual(r, [[0, 1, 3, 50, 50, TREND]])

    def test_outside_universe_not_filled(self):
        y0 = [[1, 9, 2, 40, 450, 0]]
        self.assertEqual(impute([1], [y0], [U])[0], [])

    def test_default_year_skips_incomplete_latest(self):
        comp = {"years": [1, 2, 3, 4], "none": [40, 41, 40, 70],
                "total_t": {"0": [100] * 4, "1": [100] * 4},
                "partner_only_t": {"0": [1, 1, 1, 1], "1": [1, 1, 1, 12]}}
        self.assertEqual(bt.default_year(comp), 3)

    def test_site_imputed_files_match_completeness(self):
        c = json.load(open(ROOT / "site" / "data" / "completeness.json"))
        m = json.load(open(ROOT / "site" / "data" / "manifest.json"))
        self.assertIn(m["default"], m["years"])
        y = c["years"][-2]
        d = json.load(open(ROOT / "site" / "data" / f"imputed_{y}.json"))
        self.assertAlmostEqual(sum(r[3] for r in d["plastic"] if r[0] == 0), c["imputed_t"]["0"][-2], delta=1)


def mrow(rep, flow, par, kg, usd, period):
    return {"reporterCode": rep, "flowCode": flow, "partnerCode": par, "partner2Code": 0, "customsCode": "C00",
            "motCode": "0", "mosCode": "0", "netWgt": kg, "isNetWgtEstimated": False, "primaryValue": usd,
            "qty": None, "qtyUnitAbbr": "kg", "period": period}


class PartYear(unittest.TestCase):
    def test_months_scaled_by_last_years_pattern(self):
        # Last year: Jan 10 t, full year 40 t -> scale 4. This year: Jan 12 t.
        prev_m = [mrow(1, "X", 2, 10000, 10, "202501")]
        prev_a = [mrow(1, "X", 2, 40000, 40, "2025")]
        cur = [mrow(1, "X", 2, 12000, 12, "202601")]
        rows, filed = mp.model(cur, prev_m, prev_a)
        self.assertEqual(rows[0]["netWgt"], 48000)
        self.assertEqual(rows[0]["primaryValue"], 48)
        self.assertEqual(filed, {"1X": ["01"]})

    def test_naive_scale_without_last_year(self):
        cur = [mrow(1, "M", 2, 1000, 5, "2026%02d" % m) for m in (1, 2, 3)]
        rows, _ = mp.model(cur, [], None)
        self.assertEqual(rows[0]["netWgt"], 12000)

    def test_national_months_fill_what_comtrade_lacks(self):
        import tempfile
        iso = {"FRA": (251, "France"), "TUR": (792, "Türkiye"), "DEU": (276, "Germany")}
        cur = [dict(mrow(276, "X", 792, 1000, 200, "202601"), cmdCode="3915")]
        nat = [  # Germany January overlaps Comtrade (sets the rate: 200 US$ for 100 EUR)
            {"source": "comext", "reporterISO": "DEU", "partnerISO": "TUR", "flow": "X", "cmd": "391590",
             "period": "202601", "kg": 1000, "value": 100, "currency": "EUR"},
            {"source": "comext", "reporterISO": "DEU", "partnerISO": "TUR", "flow": "X", "cmd": "391510",
             "period": "202602", "kg": 500, "value": 30, "currency": "EUR"},
            {"source": "comext", "reporterISO": "DEU", "partnerISO": "TUR", "flow": "X", "cmd": "391520",
             "period": "202602", "kg": 500, "value": 20, "currency": "EUR"},
            {"source": "comext", "reporterISO": "FRA", "partnerISO": "TUR", "flow": "X", "cmd": "391590",
             "period": "202601", "kg": 3000, "value": 50, "currency": "EUR"},
            {"source": "comext", "reporterISO": "FRA", "partnerISO": "XX", "flow": "X", "cmd": "391590",
             "period": "202601", "kg": 9, "value": 9, "currency": "EUR"},
        ]
        with tempfile.TemporaryDirectory() as d:
            for per in ("202601", "202602"):
                Path(d, f"comext_{per}.json").write_text(json.dumps([r for r in nat if r["period"] == per]))
            loaded = mp.load_national(2026, ["3915"], iso, Path(d))
        rows, used = mp.supplement(cur, loaded, iso)
        added = {(r["reporterCode"], r["period"]): r for r in rows if r.get("source")}
        self.assertEqual(set(added), {(276, "202602"), (251, "202601")})   # Germany's January kept from Comtrade
        self.assertEqual(added[(276, "202602")]["netWgt"], 1000)          # HS6 rows summed to HS 3915
        self.assertAlmostEqual(added[(276, "202602")]["primaryValue"], 100)  # 50 EUR at 2 US$ per EUR (nearest month)
        self.assertEqual(used["comext"]["reporter_flows"], 2)
        rows, filed = mp.model(rows, [], None)
        self.assertEqual(filed, {"276X": ["01", "02"], "251X": ["01"]})

    def test_several_codes_modelled_apart(self):
        cur = [dict(mrow(1, "X", 2, 1000, 5, "202601"), cmdCode="4707"),
               dict(mrow(1, "X", 2, 2000, 5, "202601"), cmdCode="4004"),
               dict(mrow(1, "X", 2, 2000, 5, "202602"), cmdCode="4004")]
        rows, filed = mp.model_codes(cur, [], None)
        self.assertEqual({r["cmdCode"]: r["netWgt"] for r in rows}, {"4707": 12000, "4004": 24000})
        self.assertEqual(filed, {"4004:1X": ["01", "02"], "4707:1X": ["01"]})


if __name__ == "__main__":
    unittest.main()
