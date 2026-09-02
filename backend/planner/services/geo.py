from __future__ import annotations

import math
from bisect import bisect_left

EARTH_RADIUS_MILES = 3958.8


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * math.asin(math.sqrt(a))


def cumulative_miles(coords: list[tuple[float, float]]) -> list[float]:
    """coords are (lat, lng)."""
    if not coords:
        return [0.0]
    cum = [0.0]
    for i in range(1, len(coords)):
        d = haversine_miles(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1])
        cum.append(cum[-1] + d)
    return cum


def point_along_line(
    coords: list[tuple[float, float]],
    fraction: float,
) -> tuple[float, float]:
    """Return (lat, lng) at a fraction 0..1 along the polyline."""
    if not coords:
        raise ValueError("No coordinates")
    if len(coords) == 1 or fraction <= 0:
        return coords[0]
    if fraction >= 1:
        return coords[-1]

    cum = cumulative_miles(coords)
    total = cum[-1]
    if total <= 0:
        return coords[0]

    target = fraction * total
    i = bisect_left(cum, target)
    if i <= 0:
        return coords[0]
    if i >= len(coords):
        return coords[-1]

    span = cum[i] - cum[i - 1]
    t = 0.0 if span <= 0 else (target - cum[i - 1]) / span
    lat = coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0])
    lng = coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1])
    return (lat, lng)


def round_to_quarter(hours: float) -> float:
    return round(hours * 4) / 4
