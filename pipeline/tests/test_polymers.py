import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import polymers as p  # noqa: E402

DATA = ROOT / "site" / "data"


def prow(v, ex, rc, t, usd=None):
    """A polymers_<year>.json row from tonnes (and US$) by polymer."""
    return [v, ex, rc, *t, *(usd if usd is not None else [x * 100 for x in t])]


class Shares(unittest.TestCase):
    def setUp(self):
        self.idx = p.index([
            prow(0, 826, 458, [3, 1, 0, 0]),       # UK's own report of exports to Malaysia
            prow(1, 826, 458, [0, 0, 1, 1]),       # Malaysia's report of the same trade
            prow(0, 826, 156, [1, 0, 0, 1]),       # UK to China
            prow(1, 392, 704, [0, 0, 0, 2]),       # Viet Nam's imports from Japan
        ])

    def test_own_route_first(self):
        ft, fu = p.shares(self.idx, 0, 826, 458)
        self.assertEqual(ft, [0.75, 0.25, 0, 0])
        self.assertEqual(fu, ft)
        self.assertEqual(p.shares(self.idx, 1, 826, 458)[0], [0, 0, 0.5, 0.5])

    def test_partner_report_when_route_missing_in_this_view(self):
        self.assertEqual(p.shares(self.idx, 1, 826, 156)[0], [0.5, 0, 0, 0.5])

    def test_exporter_then_recipient_then_world(self):
        # UK to Türkiye: UK's exports in this view (3+1 to Malaysia, 1+1 to China)
        self.assertEqual(p.shares(self.idx, 0, 826, 792)[0], [4 / 6, 1 / 6, 0, 1 / 6])
        # Germany to Viet Nam, importers' view: Viet Nam's imports
        self.assertEqual(p.shares(self.idx, 1, 276, 704)[0], [0, 0, 0, 1])
        # Germany to Ghana in exporters' view: nothing on either side, world exporters' view
        self.assertEqual(p.shares(self.idx, 0, 276, 288)[0], [4 / 6, 1 / 6, 0, 1 / 6])

    def test_us_dollars_fall_back_to_tonnes(self):
        idx = p.index([prow(0, 1, 2, [1, 1, 0, 0], [0, 0, 0, 0])])
        self.assertEqual(p.shares(idx, 0, 1, 2)[1], [0.5, 0.5, 0, 0])

    def test_split_adds_up_and_keeps_fields(self):
        routes = [[0, 826, 458, 100.0, 5000, 1], [1, 392, 704, 40.0, 800, 0, 2]]
        out = p.split(routes, self.idx)
        for r in routes:
            parts = [x for k in p.KEYS for x in out[k] if x[:3] == r[:3]]
            self.assertAlmostEqual(sum(x[3] for x in parts), r[3])
            self.assertAlmostEqual(sum(x[4] for x in parts), r[4])
            self.assertTrue(all(x[5:] == r[5:] for x in parts))

    def test_no_data_no_split(self):
        self.assertEqual(p.split([[0, 1, 2, 5.0, 1, 0]], None), {k: [] for k in p.KEYS})


class PolymerData(unittest.TestCase):
    def test_polymer_files(self):
        files = sorted(DATA.glob("polymers_*.json"))
        self.assertTrue(files, "no polymers_<year>.json")
        for f in files:
            d = json.load(open(f))
            self.assertEqual(d["meta"]["keys"], p.KEYS)
            pl = json.load(open(DATA / f"plastic_{d['meta']['year']}.json"))
            for r in d["routes"]:
                self.assertEqual(len(r), 3 + 2 * len(p.KEYS))
                self.assertIn(r[0], (0, 1))
                self.assertTrue(all(x >= 0 for x in r[3:]))
            # The six-digit codes cover HS 3915 closely in years with annual returns.
            if not pl["meta"].get("modelled"):
                for v in (0, 1):
                    six = sum(sum(r[3:7]) for r in d["routes"] if r[0] == v)
                    four = sum(r[3] for r in pl["routes"] if r[0] == v)
                    self.assertLess(abs(six / four - 1), 0.25, f"{f.name} view {v}")

    def test_polymer_trends_add_up_to_hs3915(self):
        tr = json.load(open(DATA / "trends.json"))
        parts = [json.load(open(DATA / f"trends_{k}.json")) for k in p.KEYS]
        years = {json.load(open(f))["meta"]["year"] for f in DATA.glob("polymers_*.json")}
        for i, y in enumerate(tr["years"]):
            for v in ("0", "1"):
                s = sum(t["world"][v]["t"][i] for t in parts)
                if y in years:
                    self.assertAlmostEqual(s, tr["world"][v]["t"][i], delta=len(p.KEYS))
                else:
                    self.assertEqual(s, 0)


if __name__ == "__main__":
    unittest.main()
