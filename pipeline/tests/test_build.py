import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import build_site_data as b  # noqa: E402


def row(rep, flow, par, kg, usd, p2=0, customs="C00", mot=0, mos="0", est=False):
    return {"reporterCode": rep, "flowCode": flow, "partnerCode": par, "partner2Code": p2,
            "customsCode": customs, "motCode": mot, "mosCode": mos, "netWgt": kg,
            "isNetWgtEstimated": est, "primaryValue": usd, "qty": None, "qtyUnitAbbr": "kg"}


class Selection(unittest.TestCase):
    def test_world_total_preferred_over_detail(self):
        rows = [row(826, "X", 458, 1000, 50), row(826, "X", 458, 400, 20, p2=156),
                row(826, "X", 458, 500, 25, p2=702)]
        sel = b.select(rows)
        v = sel[(826, "X", 458)]
        self.assertAlmostEqual(v["t"], 1.0)
        self.assertEqual(v["basis"], "partner2 World")

    def test_detail_summed_when_no_world_total(self):
        rows = [row(826, "X", 458, 400, 20, p2=156), row(826, "X", 458, 500, 25, p2=702)]
        v = b.select(rows)[(826, "X", 458)]
        self.assertAlmostEqual(v["t"], 0.9)
        self.assertEqual(v["usd"], 45)
        self.assertEqual(v["basis"], "partner2 detail summed")

    def test_breakdown_rows_ignored(self):
        rows = [row(826, "X", 458, 1000, 50), row(826, "X", 458, 999, 49, mot=2100),
                row(826, "X", 458, 999, 49, customs="C01")]
        self.assertAlmostEqual(b.select(rows)[(826, "X", 458)]["t"], 1.0)

    def test_world_partner_self_trade_and_reexports_left_out(self):
        rows = [row(826, "X", 0, 9e6, 1), row(826, "X", 826, 5, 1), row(826, "RX", 458, 5, 1)]
        self.assertEqual(b.select(rows), {})

    def test_views_never_added_and_oriented(self):
        rows = [row(826, "X", 792, 2000, 10), row(792, "M", 826, 3000, 12, est=True)]
        routes = b.routes_from(b.select(rows))
        self.assertIn([0, 826, 792, 2.0, 10, 0], routes)
        self.assertIn([1, 826, 792, 3.0, 12, 1], routes)
        self.assertEqual(len(routes), 2)

    def test_qty_used_when_net_weight_missing(self):
        r = row(826, "X", 458, None, 10)
        r["qty"] = 2500
        self.assertAlmostEqual(b.select([r])[(826, "X", 458)]["t"], 2.5)


class SiteData(unittest.TestCase):
    def test_published_files_have_expected_shape(self):
        man = json.load(open(ROOT / "site" / "data" / "manifest.json"))
        self.assertIn(man["latest"], man["years"])
        for y in man["years"]:
            d = json.load(open(ROOT / "site" / "data" / f"plastic_{y}.json"))
            self.assertEqual(d["meta"]["year"], y)
            self.assertGreater(len(d["routes"]), 300)
            for r in d["routes"][:50]:
                self.assertEqual(len(r), 6)
                self.assertIn(r[0], (0, 1))
                self.assertIn(str(r[1]), d["countries"])
                self.assertIn(str(r[2]), d["countries"])
            for k in ("un", "unsub", "wb", "oecd"):
                self.assertIn(k, d["schemes"])


if __name__ == "__main__":
    unittest.main()
