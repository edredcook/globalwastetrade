"""Every public page carries what search engines and link previews need."""
import json
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

SITE = Path(__file__).resolve().parents[2] / "site"
BASE = "https://globalwastetrade.org/"
PAGES = {"index.html": "", "plastics.html": "plastics.html", "tyres.html": "tyres.html", "ewaste.html": "ewaste.html", "explorer.html": "explorer.html",
         "trends.html": "trends.html", "validation.html": "validation.html", "about.html": "about.html"}


def head(page):
    html = (SITE / page).read_text(encoding="utf-8")
    return html[: html.index("</head>")] if "</head>" in html else html[: html.index("<body")]


class Heads(unittest.TestCase):
    def test_each_page_has_title_description_canonical_and_card(self):
        for page, path in PAGES.items():
            h = head(page)
            with self.subTest(page=page):
                title = re.search(r"<title>(.+?)</title>", h).group(1)
                self.assertLessEqual(len(title), 70)
                desc = re.search(r'<meta name="description" content="([^"]+)"', h).group(1)
                self.assertTrue(50 <= len(desc) <= 230, len(desc))
                self.assertIn(f'<link rel="canonical" href="{BASE}{path}">', h)
                self.assertIn(f'<meta property="og:url" content="{BASE}{path}">', h)
                self.assertIn('property="og:image"', h)
                self.assertIn('name="twitter:card"', h)
                self.assertEqual(h.count("<title>"), 1)

    def test_structured_data_parses(self):
        found = {}
        for page in PAGES:
            for block in re.findall(r'<script type="application/ld\+json">(.+?)</script>', head(page), re.S):
                d = json.loads(block)
                found[d["@type"]] = d
        ds = found["Dataset"]
        self.assertEqual(ds["license"], "https://creativecommons.org/licenses/by/4.0/")
        self.assertEqual(ds["creator"]["name"], "Ed Cook")
        for dl in ds["distribution"]:
            self.assertTrue((SITE / dl["contentUrl"][len(BASE):]).exists(), dl["contentUrl"])
        self.assertIn("WebSite", found)

    def test_linked_files_exist(self):
        for f in ["robots.txt", "sitemap.xml", "favicon.svg", "favicon-48.png", "apple-touch-icon.png", "img/social-card.jpg"]:
            self.assertTrue((SITE / f).exists(), f)


class Sitemap(unittest.TestCase):
    def test_sitemap_lists_every_page(self):
        ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        locs = {e.text for e in ET.parse(SITE / "sitemap.xml").findall(".//s:loc", ns)}
        self.assertEqual(locs, {BASE + p for p in PAGES.values()})
        self.assertEqual(set(PAGES), {p.name for p in SITE.glob("*.html")})

    def test_robots_points_to_sitemap(self):
        self.assertIn(f"Sitemap: {BASE}sitemap.xml", (SITE / "robots.txt").read_text())


if __name__ == "__main__":
    unittest.main()
