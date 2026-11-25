import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import build_validation as v  # noqa: E402

YEAR = {
    "countries": {"826": ["GBR", "UK", "HIC"], "458": ["MYS", "Malaysia", "UMC"], "792": ["TUR", "Türkiye", "UMC"],
                  "276": ["DEU", "Germany", "HIC"]},
    "schemes": {"oecd": {"826": "OECD Europe", "276": "OECD Europe", "792": "OECD Europe", "458": "Asia & Pacific (non-OECD)"}},
    "routes": [[0, 826, 458, 100, 1, 0], [1, 826, 458, 300, 1, 0], [0, 276, 792, 50, 1, 0],
               [1, 276, 792, 40, 1, 0], [0, 826, 826, 999, 1, 0]],
    "hidden": {},
}


class Measure(unittest.TestCase):
    def test_views_kept_apart_and_self_trade_left_out(self):
        x, m, lg = v.measure(YEAR, {"from": "*", "to": "*"})
        self.assertEqual((x, m), (150, 340))
        self.assertEqual(lg, 350)  # larger report per route: 300 + 50

    def test_sets(self):
        self.assertEqual(v.measure(YEAR, {"from": "OECD", "to": "!OECD"})[:2], (100, 300))
        self.assertEqual(v.measure(YEAR, {"from": "*", "to": "MLIC"})[:2], (150, 340))
        self.assertEqual(v.measure(YEAR, {"from": "EU27", "to": [792]})[:2], (50, 40))


class Reference(unittest.TestCase):
    def test_every_check_names_a_known_source(self):
        import json
        ref = json.load(open(ROOT / "pipeline" / "reference" / "validation_sources.json", encoding="utf-8"))
        for c in ref["checks"]:
            self.assertIn(c["source"], ref["sources"], c["label"])
            self.assertIn("published", c)


if __name__ == "__main__":
    unittest.main()
