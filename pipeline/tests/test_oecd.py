import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import build_trends as t  # noqa: E402


class OecdMembers(unittest.TestCase):
    def setUp(self):
        self.m = t.oecd_members()["members"]

    def test_current_membership(self):
        self.assertEqual(len(self.m), 38)
        schemes = json.loads((ROOT / "pipeline" / "reference" / "region_schemes.json").read_text(encoding="utf-8"))["oecd"]
        self.assertEqual(set(self.m), {c for c, v in schemes.items() if v.startswith("OECD")})

    def test_accession_years(self):
        self.assertFalse(t.is_oecd(self.m, 152, 2009))   # Chile joined in 2010
        self.assertTrue(t.is_oecd(self.m, 152, 2010))
        self.assertFalse(t.is_oecd(self.m, 188, 2020))   # Costa Rica joined in 2021
        self.assertTrue(t.is_oecd(self.m, 842, 2008))    # United States, founder
        self.assertFalse(t.is_oecd(self.m, 156, 2026))   # China is not a member


if __name__ == "__main__":
    unittest.main()
