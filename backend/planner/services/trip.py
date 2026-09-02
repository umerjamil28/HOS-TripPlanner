from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from planner.constants import CYCLE_LIMIT_HOURS, DEFAULT_START_HOUR, SAME_PLACE_MILES
from planner.services.geo import haversine_miles
from planner.services.geocoding import Geocoder, Place
from planner.services.hos import HosEngine
from planner.services.logs import build_daily_logs
from planner.services.routing import Router


def _start_time(value: datetime | None) -> datetime:
    if value is not None:
        return value.replace(second=0, microsecond=0)
    now = datetime.now().replace(second=0, microsecond=0)
    return now.replace(hour=DEFAULT_START_HOUR, minute=0)


def _place_dump(place: Place) -> dict:
    return {
        "query": place.query,
        "lat": place.lat,
        "lng": place.lng,
        "label": place.label,
        "city_state": place.city_state,
    }


def _thin_geometry(coords: list[list[float]], max_points: int = 400) -> list[list[float]]:
    if len(coords) <= max_points:
        return coords
    step = max(1, (len(coords) - 1) // (max_points - 1))
    thinned = coords[::step]
    if thinned[-1] != coords[-1]:
        thinned.append(coords[-1])
    return thinned


def plan_trip(
    current_location: str,
    pickup_location: str,
    dropoff_location: str,
    current_cycle_used: float,
    start_time: datetime | None = None,
    geocoder: Geocoder | None = None,
    router: Router | None = None,
) -> dict:
    geocoder = geocoder or Geocoder()
    router = router or Router()
    start = _start_time(start_time)

    with ThreadPoolExecutor(max_workers=3) as pool:
        current_f = pool.submit(geocoder.geocode, current_location)
        pickup_f = pool.submit(geocoder.geocode, pickup_location)
        dropoff_f = pool.submit(geocoder.geocode, dropoff_location)
        current = current_f.result()
        pickup = pickup_f.result()
        dropoff = dropoff_f.result()

    need_deadhead = (
        haversine_miles(current.lat, current.lng, pickup.lat, pickup.lng) > SAME_PLACE_MILES
    )
    with ThreadPoolExecutor(max_workers=2) as pool:
        dropoff_f = pool.submit(router.route, pickup, dropoff)
        pickup_f = pool.submit(router.route, current, pickup) if need_deadhead else None
        to_dropoff = dropoff_f.result()
        to_pickup = pickup_f.result() if pickup_f else None

    engine = HosEngine(start, current_cycle_used)
    result = engine.run(current, pickup, dropoff, to_pickup, to_dropoff)
    logs = build_daily_logs(result)

    stops = [
        {
            "kind": stop.kind,
            "lat": stop.lat,
            "lng": stop.lng,
            "location": stop.location,
            "time": stop.time.isoformat(timespec="minutes"),
            "duration_hours": stop.duration_hours,
            "description": stop.description,
            "miles": stop.miles,
        }
        for stop in result.stops
    ]

    return {
        "inputs": {
            "current_location": current_location,
            "pickup_location": pickup_location,
            "dropoff_location": dropoff_location,
            "current_cycle_used": current_cycle_used,
            "start_time": start.isoformat(timespec="minutes"),
        },
        "locations": {
            "current": _place_dump(current),
            "pickup": _place_dump(pickup),
            "dropoff": _place_dump(dropoff),
        },
        "route": {
            "distance_miles": round(result.route_distance_miles, 1),
            "duration_hours": round(result.route_duration_hours, 2),
            "geometry": _thin_geometry([[lat, lng] for lat, lng in result.geometry]),
            "source": (
                to_dropoff.source
                if to_pickup is None
                else to_pickup.source
            ),
        },
        "stops": stops,
        "logs": logs,
        "summary": {
            "total_miles": round(result.total_miles, 1),
            "total_days": len(logs),
            "cycle_used_start": round(result.cycle_used_start, 2),
            "cycle_used_end": round(min(result.cycle_used_end, CYCLE_LIMIT_HOURS + 20), 2),
            "hours_remaining": round(max(0.0, CYCLE_LIMIT_HOURS - result.cycle_used_end), 2),
            "pickup_hours": 1.0,
            "dropoff_hours": 1.0,
            "rules": {
                "cycle": "70-hour / 8-day",
                "driving_limit_hours": 11,
                "window_hours": 14,
                "break_after_driving_hours": 8,
                "daily_rest_hours": 10,
                "restart_hours": 34,
                "fuel_every_miles": 1000,
            },
        },
    }
