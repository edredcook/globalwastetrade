import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import build_site_data as b  # noqa: E402


def row(rep, flow, par, kg, usd, cmd):
    return {"reporterCode": rep, "flowCode": flow, "partnerCode": par, "partner2Code": 0,
            "customsCode": "C00", "motCode": 0, "mosCode": "0", "netWgt": kg, "cmdCode": cmd,
            "isNetWgtEstimated": False, "primaryValue": usd, "qty": None, "qtyUnitAbbr": "kg"}


class Materials(unittest.TestCase):
    def test_each_code_counted_once(self):
        # Within a group no code is in two streams, and no group's own codes repeat
        # a plastic-file stream (those are borrowed, not fetched again).
        plastic = {c for cs in b.STREAMS.values() for c in cs}
        for mat in b.MATERIALS:
            codes = b.material_codes(mat)
            self.assertEqual(len(codes), len(set(codes)), mat)
            for c in codes:
                # HS 4707 as a whole carries the plastic contamination of paper; the paper group splits it by grade.
                self.assertFalse(any(c.startswith(p) or p.startswith(c) for p in plastic - {"4707"}), (mat, c))

    def test_borrowed_streams_exist(self):
        for mat, cfg in b.MATERIALS.items():
            for k in cfg["borrow"]:
                self.assertIn(k, b.STREAMS, mat)

    def test_streams_summed_by_code_views_apart(self):
        rows = [row(842, "X", 792, 2_000_000, 600_000, "720449"), row(842, "X", 792, 1_000_000, 300_000, "720410"),
                row(792, "M", 842, 2_500_000, 700_000, "720449")]
        out, _ = b.mixed_streams(rows, streams={"fe": ["720410", "720449"]})
        self.assertIn([0, 842, 792, 3000.0, 900_000, 0], out["fe"])
        self.assertIn([1, 842, 792, 2500.0, 700_000, 0], out["fe"])

    def test_page_names_every_stream_and_sources_every_share(self):
        page = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
        for mat, cfg in b.MATERIALS.items():
            block = page[page.index(f"  {mat}:{{n:\"{cfg['name']}\",noun:"):]
            block = block[:block.index("dlk:")]
            for k in list(cfg["streams"]) + cfg["borrow"]:
                self.assertRegex(block, rf"\b{k}:{{n:", (mat, k))
            # every share that is not a whole stream names a source or says Assumption
            for m in re.finditer(r"(\w+):\{n:\"[^\"]+\",codes:\"[^\"]+\",f:([\d.]+)(,[^}]*)?\}", block):
                if "core:true" not in (m.group(3) or ""):
                    self.assertRegex(m.group(3) or "", r"src:\"(Source|Assumption)", (mat, m.group(1)))


if __name__ == "__main__":
    unittest.main()
