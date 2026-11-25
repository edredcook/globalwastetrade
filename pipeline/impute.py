"""Imputed routes for economies that did not report in a given year.

Each view is filled on its own, so the two sides are never added together:
- exporters' view: an economy with no export report gets the routes that its
  partners' import reports record from it;
- importers' view: an economy with no import report gets the routes that its
  partners' export reports record to it.

Three methods, tried in this order and tagged on the route:
1  From partner reports. The partner figure is scaled by the economy's own-to-partner
   ratio in its nearest reporting years (up to three, on routes where both sides
   reported), clipped to 0.5-2. This corrects the usual gap between a country's own
   figures and its partners', e.g. for late reporters in the latest year.
2  Straight line. For a gap of one or two years inside a run of the economy's own
   reports, routes that no partner recorded are filled on a straight line between
   the years either side.
3  Trend, the fallback. Routes still unfilled are carried from the economy's nearest
   own report up to three years away, scaled by how the same view changed between
   those two years among economies that reported in both (clipped to 0.5-2).

Routes are [view, exporter, recipient, tonnes, US$, method]. Only economies in that
year's reporting universe (World Bank-classified, or any reporter) are filled.
"""
from collections import defaultdict

PARTNER, LINE, TREND = 1, 2, 3
TREND_YEARS = 3
MAX_GAP = 2
NEAREST = 3
CLIP = (0.5, 2.0)


def _clip(x):
    return min(CLIP[1], max(CLIP[0], x))


def impute(years, routes_by_year, universes):
    """routes_by_year[i]: site routes for years[i]; universes[i]: set of codes (str).
    Returns a list (per year) of imputed routes."""
    n = len(years)
    # reporters per view, and each view's routes keyed by (reporter, partner)
    rep = [[set(), set()] for _ in range(n)]
    own = [[defaultdict(dict), defaultdict(dict)] for _ in range(n)]   # own[i][v][c][p] = (t, usd)
    mir = [[defaultdict(dict), defaultdict(dict)] for _ in range(n)]   # what partners record with c, for view v
    for i, routes in enumerate(routes_by_year):
        for v, ex, rc, t, usd, *_ in routes:
            ex, rc = str(ex), str(rc)
            if ex == rc:
                continue
            if v == 0:
                rep[i][0].add(ex)
                own[i][0][ex][rc] = (t, usd)
                mir[i][1][rc][ex] = (t, usd)       # an exporter's record of what it sent rc
            else:
                rep[i][1].add(rc)
                own[i][1][rc][ex] = (t, usd)
                mir[i][0][ex][rc] = (t, usd)       # an importer's record of what it got from ex
    reported_years = defaultdict(list)             # (v, c) -> year indexes with a report
    for i in range(n):
        for v in (0, 1):
            for c in rep[i][v]:
                reported_years[(v, c)].append(i)

    def ratio(v, c, i):
        ys = sorted(reported_years[(v, c)], key=lambda j: (abs(j - i), j))
        ot = ou = mt = mu = 0.0
        used = 0
        for j in ys:
            pairs = [(own[j][v][c][p], m) for p, m in mir[j][v][c].items() if p in own[j][v][c]]
            if not pairs:
                continue
            ot += sum(a[0] for a, _ in pairs)
            ou += sum(a[1] for a, _ in pairs)
            mt += sum(b[0] for _, b in pairs)
            mu += sum(b[1] for _, b in pairs)
            used += 1
            if used == NEAREST:
                break
        rt = _clip(ot / mt) if mt > 0 and ot > 0 else 1.0
        ru = _clip(ou / mu) if mu > 0 and ou > 0 else 1.0
        return rt, ru

    tot = [[defaultdict(float), defaultdict(float)] for _ in range(n)]   # tot[i][v][c] = own tonnes
    for i in range(n):
        for v in (0, 1):
            for c, ps in own[i][v].items():
                tot[i][v][c] = sum(t for t, _ in ps.values())

    def change(v, j, i):
        both = rep[i][v] & rep[j][v]
        a, b = sum(tot[j][v][c] for c in both), sum(tot[i][v][c] for c in both)
        return _clip(b / a) if a > 0 and b > 0 else 1.0

    out = []
    for i in range(n):
        rows = []
        for v in (0, 1):
            for c in sorted(universes[i] - rep[i][v], key=int):
                filled = {}
                m = mir[i][v].get(c, {})
                if m:
                    rt, ru = ratio(v, c, i)
                    for p, (t, usd) in m.items():
                        filled[p] = (t * rt, usd * ru, PARTNER)
                ys = reported_years[(v, c)]
                before = [j for j in ys if j < i]
                after = [j for j in ys if j > i]
                if before and after and after[0] - before[-1] - 1 <= MAX_GAP:
                    j, k = before[-1], after[0]
                    f = (i - j) / (k - j)
                    for p in set(own[j][v][c]) | set(own[k][v][c]):
                        if p in filled or p == c:
                            continue
                        a, b = own[j][v][c].get(p, (0, 0)), own[k][v][c].get(p, (0, 0))
                        t, usd = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
                        if t > 0 or usd > 0:
                            filled[p] = (t, usd, LINE)
                near = [j for j in ys if abs(j - i) <= TREND_YEARS]
                if near:
                    j = min(near, key=lambda j: (abs(j - i), -j))
                    f = change(v, j, i)
                    for p, (t, usd) in own[j][v][c].items():
                        if p not in filled and p != c and (t > 0 or usd > 0):
                            filled[p] = (t * f, usd * f, TREND)
                for p, (t, usd, how) in filled.items():
                    ex, rc = (c, p) if v == 0 else (p, c)
                    rows.append([v, int(ex), int(rc), round(t, 2), round(usd), how])
        rows.sort(key=lambda r: (r[0], -r[3]))
        out.append(rows)
    return out
