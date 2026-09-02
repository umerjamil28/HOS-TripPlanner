from __future__ import annotations

import threading
import time
from dataclasses import dataclass

import requests
from django.conf import settings

US_STATE_ABBREV = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "district of columbia": "DC",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
}


class LocationNotFound(Exception):
    pass


@dataclass(frozen=True)
class Place:
    query: str
    lat: float
    lng: float
    label: str
    city_state: str


def _state_abbrev(name: str | None) -> str | None:
    if not name:
        return None
    cleaned = name.strip()
    if len(cleaned) == 2 and cleaned.isalpha():
        return cleaned.upper()
    return US_STATE_ABBREV.get(cleaned.lower())


def city_state_from_address(address: dict | None, fallback: str) -> str:
    if not address:
        return fallback
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
        or address.get("county")
        or address.get("municipality")
    )
    state = _state_abbrev(address.get("state")) or address.get("state")
    if city and state:
        return f"{city}, {state}"
    if city:
        return str(city)
    return fallback


class Geocoder:
    """Nominatim geocoder with a 1 req/s throttle (usage policy)."""

    def __init__(self, user_agent: str | None = None, min_interval: float = 1.1):
        self.user_agent = user_agent or settings.NOMINATIM_USER_AGENT
        self.min_interval = min_interval
        self._lock = threading.Lock()
        self._last_request = 0.0
        self._forward_cache: dict[str, Place] = {}
        self._reverse_cache: dict[tuple[float, float], str] = {}

    def _headers(self) -> dict[str, str]:
        return {"User-Agent": self.user_agent, "Accept-Language": "en"}

    def _throttle(self) -> None:
        with self._lock:
            wait = self.min_interval - (time.monotonic() - self._last_request)
            if wait > 0:
                time.sleep(wait)
            self._last_request = time.monotonic()

    def geocode(self, query: str) -> Place:
        key = query.strip()
        if not key:
            raise LocationNotFound("Location is empty.")
        cached = self._forward_cache.get(key.lower())
        if cached:
            return cached

        self._throttle()
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": key,
                "format": "json",
                "addressdetails": 1,
                "limit": 1,
            },
            headers=self._headers(),
            timeout=20,
        )
        response.raise_for_status()
        results = response.json()
        if not results:
            raise LocationNotFound(f"Could not find location: {query}")

        hit = results[0]
        lat = float(hit["lat"])
        lng = float(hit["lon"])
        display = hit.get("display_name") or key
        city_state = city_state_from_address(hit.get("address"), display.split(",")[0])
        place = Place(query=key, lat=lat, lng=lng, label=display, city_state=city_state)
        self._forward_cache[key.lower()] = place
        return place

    def reverse(self, lat: float, lng: float) -> str:
        cache_key = (round(lat, 3), round(lng, 3))
        cached = self._reverse_cache.get(cache_key)
        if cached:
            return cached

        try:
            self._throttle()
            response = requests.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={
                    "lat": lat,
                    "lon": lng,
                    "format": "json",
                    "addressdetails": 1,
                    "zoom": 10,
                },
                headers=self._headers(),
                timeout=20,
            )
            response.raise_for_status()
            data = response.json()
            label = city_state_from_address(
                data.get("address"),
                data.get("display_name", "En route").split(",")[0],
            )
        except (requests.RequestException, ValueError, KeyError):
            label = "En route"

        self._reverse_cache[cache_key] = label
        return label

    def suggest(self, query: str, limit: int = 6) -> list[dict]:
        """Autocomplete via Photon (OSM). Faster than Nominatim for as-you-type search."""
        key = query.strip()
        if len(key) < 2:
            return []
        cache_key = key.lower()
        cached = _suggest_cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            response = requests.get(
                "https://photon.komoot.io/api/",
                params={
                    "q": key,
                    "limit": limit,
                    "lang": "en",
                    "lat": 39.8283,
                    "lon": -98.5795,
                },
                headers=self._headers(),
                timeout=12,
            )
            response.raise_for_status()
            features = response.json().get("features") or []
        except (requests.RequestException, ValueError):
            return []

        seen: set[str] = set()
        suggestions: list[dict] = []
        for feature in features:
            props = feature.get("properties") or {}
            geometry = feature.get("geometry") or {}
            coords = geometry.get("coordinates") or [None, None]
            label, value = _photon_label(props)
            if not value or value.lower() in seen:
                continue
            seen.add(value.lower())
            lng, lat = coords[0], coords[1]
            suggestions.append(
                {
                    "label": label,
                    "value": value,
                    "lat": lat,
                    "lng": lng,
                }
            )

        _suggest_cache[cache_key] = suggestions
        return suggestions


_suggest_cache: dict[str, list[dict]] = {}


def _photon_label(props: dict) -> tuple[str, str]:
    street = props.get("street")
    number = props.get("housenumber")
    name = props.get("name") or ""
    if number and street:
        name = f"{number} {street}"
    elif street and not name:
        name = street

    locality = (
        props.get("city")
        or props.get("town")
        or props.get("village")
        or props.get("name")
    )
    state = _state_abbrev(props.get("state")) or props.get("state")
    country = props.get("country") or ""

    value = name or locality or ""
    if locality and state:
        value = f"{locality}, {state}"
        if name and street and name.lower() != locality.lower():
            value = f"{name}, {locality}, {state}"
    elif locality and name and name.lower() != locality.lower():
        value = f"{name}, {locality}"

    parts: list[str] = []
    country_part = None if country.lower() in {"united states", "usa", ""} else country
    for part in (name, locality, state, country_part):
        if part and part not in parts:
            parts.append(part)
    label = ", ".join(parts) or value
    return label, value
