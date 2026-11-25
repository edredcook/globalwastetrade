import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import fetch_national as n  # noqa: E402


class JsonStat(unittest.TestCase):
    def test_cells_decoded_row_major(self):
        js = {"id": ["partner", "indicators"], "size": [2, 2],
              "dimension": {"partner": {"category": {"index": {"MY": 0, "TR": 1}}},
                            "indicators": {"category": {"index": ["KG", "EUR"]}}},
              "value": {"0": 10, "3": 40}}
        cells = list(n.parse_jsonstat(js))
        self.assertIn(({"partner": "MY", "indicators": "KG"}, 10), cells)
        self.assertIn(({"partner": "TR", "indicators": "EUR"}, 40), cells)
        self.assertEqual(len(cells), 2)


class Rows(unittest.TestCase):
    def test_cn8_lines_summed_to_hs6(self):
        acc = {}
        n.add(acc, "hmrc", "GBR", "TUR", "Turkey", "X", "39152000", "202609", 1000, 50, "GBP")
        n.add(acc, "hmrc", "GBR", "TUR", "Turkey", "X", "39152010", "202609", 500, 25, "GBP")
        rows = n.rows_from(acc)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["cmd"], "391520")
        self.assertEqual(rows[0]["kg"], 1500)

    def test_exports_and_imports_kept_apart(self):
        acc = {}
        n.add(acc, "census", "USA", "MYS", "MALAYSIA", "X", "3915900000", "202609", 1, 1, "USD")
        n.add(acc, "census", "USA", "MYS", "MALAYSIA", "M", "3915900000", "202609", 1, 1, "USD")
        self.assertEqual(sorted(r["flow"] for r in n.rows_from(acc)), ["M", "X"])

    def test_codes(self):
        self.assertEqual(n.iso3_from_iso2("EL"), "GRC")
        self.assertEqual(n.iso3_from_name("Korea, South"), "KOR")
        self.assertEqual(n.iso3_from_name("TURKEY"), "TUR")

    def test_months_back(self):
        self.assertEqual(n.months_back(2, dt.date(2027, 1, 20)), ["2026-12", "2026-11"])


if __name__ == "__main__":
    unittest.main()
