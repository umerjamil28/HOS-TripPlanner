from __future__ import annotations

from dataclasses import dataclass, field

import requests
from django.conf import settings

from planner.constants import AVERAGE_SPEED_MPH, ROAD_FACTOR
from planner.services.geo import haversine_miles
from planner.services.geocoding import Place


@dataclass
class RouteLeg:
    origin: Place
    dest: Place
    distance_miles: float
    duration_hours: float
    coordinates: list[tuple[float, float]] = field(default_factory=list)
    source: str = "osrm"


class Router:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or settings.OSRM_BASE_URL).rstrip("/")

    def route(self, origin: Place, dest: Place) -> RouteLeg:
        try:
            return self._osrm(origin, dest)
        except (requests.RequestException, ValueError, KeyError, IndexError):
            return self._fallback(origin, dest)

    def _osrm(self, origin: Place, dest: Place) -> RouteLeg:
        url = (
            f"{self.base_url}/route/v1/driving/"
            f"{origin.lng},{origin.lat};{dest.lng},{dest.lat}"
        )
        response = requests.get(
            url,
            params={"overview": "simplified", "geometries": "geojson"},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != "Ok":
            raise ValueError(payload.get("message") or "OSRM routing failed")

        route = payload["routes"][0]
        meters = float(route["distance"])
        seconds = float(route["duration"])
        coords = [
            (lat, lng) for lng, lat in route["geometry"]["coordinates"]
        ]
        miles = meters / 1609.344
        hours = seconds / 3600.0
        if hours <= 0 and miles > 0:
            hours = miles / AVERAGE_SPEED_MPH
        return RouteLeg(
            origin=origin,
            dest=dest,
            distance_miles=miles,
            duration_hours=hours,
            coordinates=coords or [(origin.lat, origin.lng), (dest.lat, dest.lng)],
            source="osrm",
        )

    def _fallback(self, origin: Place, dest: Place) -> RouteLeg:
        straight = haversine_miles(origin.lat, origin.lng, dest.lat, dest.lng)
        miles = max(straight * ROAD_FACTOR, straight)
        hours = miles / AVERAGE_SPEED_MPH if miles else 0.0
        return RouteLeg(
            origin=origin,
            dest=dest,
            distance_miles=miles,
            duration_hours=hours,
            coordinates=[(origin.lat, origin.lng), (dest.lat, dest.lng)],
            source="haversine",
        )
