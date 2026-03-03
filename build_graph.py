"""
build_graph.py
==============
Builds the Manchester Metrolink network graph from official TfGM GeoJSON data
and writes a JSON file suitable for use in Metrodle (or any other app).

Data sources (Open Government Licence v3.0):
  Metrolink_Stops_Functional.json  — stop point features
  Metrolink_Lines_Functional.json  — track linestring features

Download both files from:
  https://data.gov.uk/dataset/55576216-9b4d-4e80-8b56-12c3b98e7d29

Usage
-----
  # Place the two JSON files in the same directory as this script, then:
  python build_graph.py

  # Or override paths via flags:
  python build_graph.py --stops my_stops.json --lines my_lines.json --out out.json

Output
------
  metrolink_graph.json  (default)
  {
    "stops": {
      "Victoria": {
        "name": "Victoria",
        "code": "VIC",
        "zone": "1",
        "lat": 53.4877,
        "lng": -2.2417,
        "lines": ["Bury", "Second City Crossing"]
      }, ...
    },
    "graph": {
      "Victoria": ["Exchange Square", "Market Street", "Shudehill", ...], ...
    },
    "edges": [
      { "from": "Victoria", "to": "Shudehill", "lines": ["Bury"] }, ...
    ]
  }

Requirements
------------
  Python 3.7+  —  no third-party libraries required.

How it works
------------
  For every track segment in the Lines GeoJSON, each stop is projected onto
  the polyline.  Any stop within THRESHOLD degrees (~600 m) is recorded with
  its arc-length parameter (how far along the track it sits).  Stops are then
  sorted by that parameter and consecutive ones are connected as neighbours.
  MultiLineString geometries (the MediaCity and Piccadilly spurs) are handled
  by processing each part separately.
"""

import argparse
import json
import math
import sys


# ─── Defaults ────────────────────────────────────────────────────────────────

DEFAULT_STOPS     = "Metrolink_Stops_Functional.json"
DEFAULT_LINES     = "Metrolink_Lines_Functional.json"
DEFAULT_OUTPUT    = "metrolink_graph.json"
DEFAULT_THRESHOLD = 0.008   # degrees — ~600 m, catches all 99 stops


# ─── Geometry ────────────────────────────────────────────────────────────────

def point_to_polyline_proj(px: float, py: float, coords: list) -> tuple:
    """
    Project point (px, py) onto a polyline defined by coords ([lng, lat] pairs).

    Returns
    -------
    (min_distance, arc_t)
      min_distance — closest distance from point to any segment (degrees)
      arc_t        — cumulative arc-length at the nearest point; used to
                     order stops along the line before connecting them
    """
    min_dist = float("inf")
    arc_t    = 0.0
    cum      = 0.0

    for i in range(len(coords) - 1):
        ax, ay = coords[i][0],   coords[i][1]
        bx, by = coords[i+1][0], coords[i+1][1]
        dx, dy = bx - ax, by - ay
        seg_sq = dx*dx + dy*dy
        seg    = math.sqrt(seg_sq)

        if seg < 1e-10:
            cum += seg
            continue

        t  = max(0.0, min(1.0, ((px - ax)*dx + (py - ay)*dy) / seg_sq))
        cx = ax + t*dx
        cy = ay + t*dy
        d  = math.sqrt((px - cx)**2 + (py - cy)**2)

        if d < min_dist:
            min_dist = d
            arc_t    = cum + t * seg

        cum += seg

    return min_dist, arc_t


# ─── Core builder ────────────────────────────────────────────────────────────

def build_graph(stops_path: str, lines_path: str, threshold: float) -> dict:
    """
    Build the network graph from two GeoJSON files.

    Returns a dict with keys:
      "stops"  — {stop_name -> metadata dict}
      "graph"  — {stop_name -> [neighbour_names]}
      "edges"  — [{from, to, lines}]
    """
    with open(stops_path) as f:
        stops_geojson = json.load(f)
    with open(lines_path) as f:
        lines_geojson = json.load(f)

    stop_features = stops_geojson["features"]

    # ── Pass 1: project every stop onto every line segment ────────────────────
    # edges: (min_name, max_name) -> set of line names that connect them
    edges: dict = {}

    for line_feat in lines_geojson["features"]:
        line_name = line_feat["properties"]["name"]
        geom      = line_feat["geometry"]

        if geom["type"] == "LineString":
            segments = [geom["coordinates"]]
        elif geom["type"] == "MultiLineString":
            segments = geom["coordinates"]
        else:
            continue

        for seg_coords in segments:
            nearby = []
            for stop in stop_features:
                sx = stop["geometry"]["coordinates"][0]
                sy = stop["geometry"]["coordinates"][1]
                dist, t = point_to_polyline_proj(sx, sy, seg_coords)
                if dist < threshold:
                    nearby.append((stop["properties"]["name"], t))

            # Sort by arc-length position along track, then link consecutive stops
            nearby.sort(key=lambda x: x[1])
            for i in range(len(nearby) - 1):
                a, b = nearby[i][0], nearby[i + 1][0]
                if a != b:
                    key = (min(a, b), max(a, b))
                    edges.setdefault(key, set()).add(line_name)

    # ── Pass 2: adjacency list ────────────────────────────────────────────────
    adj: dict = {s["properties"]["name"]: set() for s in stop_features}
    for (a, b) in edges:
        adj[a].add(b)
        adj[b].add(a)

    # ── Pass 3: which lines serve each stop ───────────────────────────────────
    stop_lines: dict = {s["properties"]["name"]: set() for s in stop_features}
    for (a, b), line_set in edges.items():
        for ln in line_set:
            stop_lines[a].add(ln)
            stop_lines[b].add(ln)

    # ── Assemble final output ─────────────────────────────────────────────────
    stops_out = {}
    for s in stop_features:
        p    = s["properties"]
        c    = s["geometry"]["coordinates"]
        name = p["name"]
        stops_out[name] = {
            "name":  name,
            "code":  p["stationCode"],
            "zone":  p["ticketZone"],
            "lat":   c[1],
            "lng":   c[0],
            "lines": sorted(stop_lines[name]),
        }

    return {
        "stops": stops_out,
        "graph": {name: sorted(nbrs) for name, nbrs in adj.items()},
        "edges": [
            {"from": a, "to": b, "lines": sorted(ls)}
            for (a, b), ls in sorted(edges.items())
        ],
    }


# ─── BFS utilities (importable from other modules) ───────────────────────────

def bfs_distance(start: str, end: str, graph: dict) -> int:
    """Shortest-path hop count between two stops. Returns -1 if unreachable."""
    if start not in graph or end not in graph:
        return -1
    visited = {start}
    queue   = [(start, 0)]
    while queue:
        node, dist = queue.pop(0)
        if node == end:
            return dist
        for nb in graph[node]:
            if nb not in visited:
                visited.add(nb)
                queue.append((nb, dist + 1))
    return -1


def bfs_path(start: str, end: str, graph: dict) -> list:
    """Full stop-name path from start → end, or [] if unreachable."""
    if start not in graph or end not in graph:
        return []
    prev  = {start: None}
    queue = [start]
    while queue:
        node = queue.pop(0)
        if node == end:
            path = []
            while node is not None:
                path.append(node)
                node = prev[node]
            return list(reversed(path))
        for nb in graph[node]:
            if nb not in prev:
                prev[nb] = node
                queue.append(nb)
    return []


def connected_components(graph: dict) -> list:
    """Return a list of sets, one per connected component."""
    seen, components = set(), []
    for start in graph:
        if start in seen:
            continue
        comp, stack = set(), [start]
        while stack:
            n = stack.pop()
            if n in comp:
                continue
            comp.add(n)
            stack.extend(nb for nb in graph[n] if nb not in comp)
        seen |= comp
        components.append(comp)
    return components


# ─── CLI ──────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description="Build Metrolink graph JSON from TfGM GeoJSON files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--stops",     default=DEFAULT_STOPS,
                   help=f"Stops GeoJSON  (default: {DEFAULT_STOPS})")
    p.add_argument("--lines",     default=DEFAULT_LINES,
                   help=f"Lines GeoJSON  (default: {DEFAULT_LINES})")
    p.add_argument("--out",       default=DEFAULT_OUTPUT,
                   help=f"Output JSON    (default: {DEFAULT_OUTPUT})")
    p.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD,
                   help=f"Distance threshold in degrees (default: {DEFAULT_THRESHOLD})")
    return p.parse_args()


def main():
    args = parse_args()

    print(f"Stops file  : {args.stops}")
    print(f"Lines file  : {args.lines}")
    print(f"Threshold   : {args.threshold}°  (~{args.threshold * 111_000:.0f} m)")
    print(f"Output      : {args.out}")
    print()

    try:
        result = build_graph(args.stops, args.lines, args.threshold)
    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        print()
        print("Place both GeoJSON files next to this script, or pass --stops / --lines.")
        print("Download from: https://data.gov.uk/dataset/55576216-9b4d-4e80-8b56-12c3b98e7d29")
        sys.exit(1)

    graph = result["graph"]

    # ── Connectivity report ───────────────────────────────────────────────────
    components = connected_components(graph)
    print(f"Stops       : {len(result['stops'])}")
    print(f"Edges       : {len(result['edges'])}")
    if len(components) == 1:
        print(f"Connected   : yes ✓")
    else:
        print(f"Components  : {len(components)}  ✗  — increase --threshold?")
        for i, comp in enumerate(components, 1):
            sample = sorted(comp)[:4]
            print(f"  [{i}] {len(comp)} stops — e.g. {sample}")

    # ── BFS spot checks ───────────────────────────────────────────────────────
    print()
    print("BFS spot checks:")
    checks = [
        ("Piccadilly Gardens",  "Altrincham"),
        ("Victoria",            "Bury"),
        ("Manchester Airport",  "Piccadilly"),
        ("Ashton-under-Lyne",   "Eccles"),
        ("Rochdale Town Centre","Manchester Airport"),
    ]
    for a, b in checks:
        d = bfs_distance(a, b, graph)
        tag = f"{d} stops" if d >= 0 else "UNREACHABLE ✗"
        print(f"  {a:32s} → {b:<25s}  {tag}")

    # ── Write ─────────────────────────────────────────────────────────────────
    print()
    with open(args.out, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Written: {args.out}  ({len(result['stops'])} stops, {len(result['edges'])} edges)")


if __name__ == "__main__":
    main()
