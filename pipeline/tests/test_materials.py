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
        page = (ROOT / "site" / "explorer.html").read_text(encoding="utf-8")
        for mat, cfg in b.MATERIALS.items():
            block = page[page.index(f"  {mat}:{{n:\"{cfg['name']}\",noun:"):]
            block = block[:block.index("dlk:")]
            for k in list(cfg["streams"]) + cfg["borrow"]:
                self.assertRegex(block, rf"\b{k}:{{n:", (mat, k))
            # every share that is not a whole stream names a source or says Assumption
            for m in re.finditer(r"(\w+):\{n:\"[^\"]+\",codes:\"[^\"]+\",f:([\d.]+)(,[^}]*)?\}", block):
                if "core:true" not in (m.group(3) or ""):
                    self.assertRegex(m.group(3) or "", r"src:\"(Source|Assumption)", (mat, m.group(1)))

    def test_price_windows_split_a_code_once(self):
        # A code split by US$ per kg across groups: every record lands in exactly one part.
        parts = {}
        for mat, cfg in b.MATERIALS.items():
            for k, specs in cfg["streams"].items():
                for spec in specs:
                    code, win = b.code_window(spec)
                    if win:
                        parts.setdefault(code, []).append(win)
        self.assertIn("711299", parts)
        for code, wins in parts.items():
            for usd_kg in (0.5, 1, 7, 15, 40):
                v = {"t": 1.0, "usd": usd_kg * 1000}
                self.assertEqual(sum(b.in_window(v, w) for w in wins), 1, (code, usd_kg))

    def test_circuit_boards_in_ewaste_not_metals(self):
        rows = [row(842, "X", 156, 100_000, 500_000, "711299"),     # US$5 per kg: circuit boards
                row(842, "X", 699, 1_000, 200_000, "711299")]       # US$200 per kg: precious-metal scrap
        rows += [row(842, "X", p, 10_000, 60_000, "711299") for p in (410, 458, 704)]
        ew, _ = b.mixed_streams(rows, streams=b.MATERIALS["ewaste"]["streams"])
        pm, _ = b.mixed_streams(rows, streams={"pm": b.MATERIALS["metals"]["streams"]["pm"]})
        self.assertEqual(sum(r[3] for r in ew["epcb"]), 130.0)
        self.assertEqual(sum(r[3] for r in pm["pm"]), 1.0)

    def test_batteries_their_own_group(self):
        self.assertIn("batteries", b.MATERIALS)
        bat = set(b.material_codes("batteries"))
        self.assertTrue({"854911", "854912", "854810"} <= bat)
        self.assertFalse(bat & set(b.material_codes("ewaste")))

    def test_record_decisions_by_code(self):
        nl = b.record_decisions(2024, "854912")
        self.assertEqual(nl.get((528, "X", 276)), "weight_from_value")
        self.assertNotIn((528, "X", 276), b.record_decisions(2024, "3915"))
        self.assertNotIn((528, "X", 276), b.record_decisions(2022, "854912"))

    def test_reviewed_mistake_fixed_even_in_range(self):
        # A weight error that still falls inside the usual price range is fixed when reviewed.
        rows = [row(528, "X", 276, 400_000_000, 40_000_000, "854912")]   # US$100 per tonne
        rows += [row(r, "X", 276, 1_000_000, 900_000, "854912") for r in (56, 250, 380, 724, 616)]
        out, rules = b.mixed_streams(rows, streams={"bpbo": ["854912"]}, year=2024)
        nl = [r for r in out["bpbo"] if r[1] == 528]
        self.assertEqual(rules["bpbo"].get("F"), 1)
        self.assertLess(nl[0][3], 100_000)


class GreyEwaste(unittest.TestCase):
    def test_screen_rules(self):
        import json
        import build_grey_ewaste as g
        ref = json.loads((ROOT / "pipeline" / "reference" / "used_eee_codes.json").read_text(encoding="utf-8"))
        self.assertEqual(ref["calibration"]["year"], 2019)
        self.assertEqual(ref["calibration"]["ewaste_share"], [0.33, 0.70])
        code = ref["keys"]["0108"]["hs"][0]
        cat = ref["keys"]["0108"]["cat"]
        def r(ex, im, kg, usd):
            return {"reporterCode": ex, "partnerCode": im, "cmdCode": code, "netWgt": kg, "primaryValue": usd}
        data = [r(276, 156, 1000, 10_000)] * 9 + [
            r(276, 566, 1000, 100),     # cheap, HIC to Nigeria: kept
            r(276, 251, 1000, 100),     # cheap, to an OECD member: dropped
            r(156, 566, 1000, 100),     # cheap, from a middle-income sender: dropped
            r(784, 566, 1000, 100),     # cheap, from the Gulf: dropped
            r(276, 682, 1000, 100)]     # cheap, to the Gulf: dropped
        group = lambda c, y: "HIC" if c in (276, 251, 784, 682) else "UMC"
        orig = g.b.load
        g.b.load = lambda p: {"data": data} if "usedeee" in str(p) else orig(p)
        try:
            out = g.screen(2019, ref, group)
        finally:
            g.b.load = orig
        self.assertLess(ref["threshold"][cat], 1)
        self.assertEqual([(ex, im) for ex, im, _, _ in out], [(276, 566)])

    def test_built_file_brackets_calibration(self):
        import json
        path = ROOT / "site" / "data" / "grey_ewaste.json"
        if not path.exists():
            self.skipTest("no grey_ewaste.json")
        d = json.loads(path.read_text(encoding="utf-8"))
        y = {r["year"]: r for r in d["years"]}
        self.assertAlmostEqual(y[2019]["scaled_t"], 3_300_000, delta=1000)
        for r in d["years"]:
            self.assertLessEqual(r["low_t"], r["central_t"])
            self.assertLessEqual(r["central_t"], r["high_t"])


if __name__ == "__main__":
    unittest.main()
