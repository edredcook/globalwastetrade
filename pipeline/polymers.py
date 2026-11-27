"""Split HS 3915 plastic scrap by polymer.

HS 3915 has four six-digit codes: 3915.10 ethylene, 3915.20 styrene, 3915.30 vinyl
chloride and 3915.90 other plastics. build_site_data.py --polymers writes each year's
six-digit routes, cleaned code by code, to site/data/polymers_<year>.json as
[view, exporter, recipient, t x 4, US$ x 4]. The site does not count those tonnes
directly: each HS 3915 route (reported or imputed) is split in the shares of the
first of these that has six-digit tonnes, so the polymers always add up to HS 3915:

1. the same route in the same view;
2. the same route in the other view (the partner's report);
3. the exporter's exports, in this view, then in the other view;
4. the recipient's imports, in this view, then in the other view;
5. the world, in this view, then in the other view.

US$ shares come from the same record's US$, or its tonnes where it has no US$.
site/explorer.html does the same in JavaScript (polyShares); keep the two in step.
"""
from collections import defaultdict

KEYS = ["pe", "ps", "pvc", "pother"]
CODES = {"pe": "391510", "ps": "391520", "pvc": "391530", "pother": "391590"}
N = len(KEYS)


def index(poly_routes):
    """Look-up for shares() from the rows of polymers_<year>.json."""
    route = {}
    ex_ = [defaultdict(lambda: [0.0] * 2 * N) for _ in (0, 1)]
    im_ = [defaultdict(lambda: [0.0] * 2 * N) for _ in (0, 1)]
    world = [[0.0] * 2 * N for _ in (0, 1)]
    for r in poly_routes:
        v, ex, rc, a = r[0], str(r[1]), str(r[2]), list(r[3:3 + 2 * N])
        route[(v, ex, rc)] = a
        for acc in (ex_[v][ex], im_[v][rc], world[v]):
            for i, x in enumerate(a):
                acc[i] += x
    return {"route": route, "ex": ex_, "im": im_, "world": world}


def shares(idx, v, ex, rc):
    """(tonne shares, US$ shares) for one route, or None if the year has no six-digit data."""
    ex, rc = str(ex), str(rc)
    w = 1 - v
    for a in (idx["route"].get((v, ex, rc)), idx["route"].get((w, ex, rc)),
              idx["ex"][v].get(ex), idx["ex"][w].get(ex), idx["im"][v].get(rc), idx["im"][w].get(rc),
              idx["world"][v], idx["world"][w]):
        if not a:
            continue
        st = sum(a[:N])
        if st <= 0:
            continue
        su = sum(a[N:])
        ft = [x / st for x in a[:N]]
        return ft, ([x / su for x in a[N:]] if su > 0 else ft)
    return None


def split(routes, idx):
    """{polymer: routes} with each route's tonnes and US$ split by polymer. Routes keep
    their other fields (estimated flag, imputation method)."""
    out = {k: [] for k in KEYS}
    if idx is None:
        return out
    for r in routes:
        sh = shares(idx, r[0], r[1], r[2])
        if sh is None:
            continue
        ft, fu = sh
        for i, k in enumerate(KEYS):
            if ft[i] > 0 or fu[i] > 0:
                out[k].append([r[0], r[1], r[2], r[3] * ft[i], r[4] * fu[i]] + list(r[5:]))
    return out
