from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable

from planner.constants import (
    AVERAGE_SPEED_MPH,
    BREAK_AFTER_DRIVE_HOURS,
    BREAK_HOURS,
    CYCLE_LIMIT_HOURS,
    DAILY_REST_HOURS,
    DROPOFF_HOURS,
    DRIVING,
    FUEL_HOURS,
    FUEL_INTERVAL_MILES,
    MAX_DRIVING_HOURS,
    MAX_WINDOW_HOURS,
    MIN_SEGMENT_HOURS,
    OFF_DUTY,
    ON_DUTY,
    PICKUP_HOURS,
    RESTART_HOURS,
    SLEEPER,
)
from planner.services.geo import point_along_line, round_to_quarter
from planner.services.geocoding import Place
from planner.services.routing import RouteLeg

ResolveName = Callable[[float, float], str]


@dataclass
class Segment:
    status: str
    start: datetime
    end: datetime
    lat: float
    lng: float
    location: str
    remark: str
    miles: float = 0.0


@dataclass
class Stop:
    kind: str
    lat: float
    lng: float
    location: str
    time: datetime
    duration_hours: float
    description: str


@dataclass
class HosResult:
    segments: list[Segment]
    stops: list[Stop]
    total_miles: float
    cycle_used_start: float
    cycle_used_end: float
    start_time: datetime
    end_time: datetime
    pickup: Place
    dropoff: Place
    current: Place
    geometry: list[tuple[float, float]] = field(default_factory=list)
    route_distance_miles: float = 0.0
    route_duration_hours: float = 0.0


class HosEngine:
    """Walk a route and insert HOS-compliant breaks, rest, fuel, pickup, and dropoff."""

    def __init__(
        self,
        start_time: datetime,
        cycle_used: float,
        resolve_name: ResolveName | None = None,
    ):
        self.start_clock = start_time.replace(second=0, microsecond=0)
        self.now = self.start_clock.replace(hour=0, minute=0)
        self.cycle = float(cycle_used)
        self.cycle_used_start = float(cycle_used)
        self.resolve_name = resolve_name or (lambda lat, lng: "En route")
        self.shift_start: datetime | None = None
        self.driving_shift = 0.0
        self.driving_since_break = 0.0
        self.miles_since_fuel = 0.0
        self.total_miles = 0.0
        self.segments: list[Segment] = []
        self.stops: list[Stop] = []

    def run(
        self,
        current: Place,
        pickup: Place,
        dropoff: Place,
        to_pickup: RouteLeg | None,
        to_dropoff: RouteLeg,
    ) -> HosResult:
        midnight = self.start_clock.replace(hour=0, minute=0)
        pre_trip = (self.start_clock - midnight).total_seconds() / 3600.0
        if pre_trip > 0:
            self._add(
                OFF_DUTY,
                pre_trip,
                current.lat,
                current.lng,
                current.city_state,
                "Off duty",
                count_clock=False,
            )

        self._stop("current", current.lat, current.lng, current.city_state, 0, "Current location")

        if to_pickup is not None:
            self._drive(to_pickup)

        self._work(
            PICKUP_HOURS,
            pickup.lat,
            pickup.lng,
            pickup.city_state,
            "Pickup",
            "pickup",
        )

        self._drive(to_dropoff)

        self._work(
            DROPOFF_HOURS,
            dropoff.lat,
            dropoff.lng,
            dropoff.city_state,
            "Dropoff",
            "dropoff",
        )

        end_midnight = (self.now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        remaining = (end_midnight - self.now).total_seconds() / 3600.0
        if remaining >= MIN_SEGMENT_HOURS / 2:
            self._add(
                OFF_DUTY,
                remaining,
                dropoff.lat,
                dropoff.lng,
                dropoff.city_state,
                "Off duty / released from work",
                count_clock=False,
            )

        geometry: list[tuple[float, float]] = []
        route_miles = 0.0
        route_hours = 0.0
        for leg in (to_pickup, to_dropoff):
            if leg is None:
                continue
            route_miles += leg.distance_miles
            route_hours += leg.duration_hours
            for lat, lng in leg.coordinates:
                if not geometry or geometry[-1] != (lat, lng):
                    geometry.append((lat, lng))

        return HosResult(
            segments=self._merged_segments(),
            stops=self.stops,
            total_miles=self.total_miles,
            cycle_used_start=self.cycle_used_start,
            cycle_used_end=self.cycle,
            start_time=midnight,
            end_time=self.now,
            pickup=pickup,
            dropoff=dropoff,
            current=current,
            geometry=geometry,
            route_distance_miles=route_miles,
            route_duration_hours=route_hours,
        )

    def _name(self, lat: float, lng: float, fallback: str) -> str:
        try:
            label = self.resolve_name(lat, lng)
            return label or fallback
        except Exception:
            return fallback

    def _window_remaining(self) -> float:
        if self.shift_start is None:
            return MAX_WINDOW_HOURS
        elapsed = (self.now - self.shift_start).total_seconds() / 3600.0
        return max(0.0, MAX_WINDOW_HOURS - elapsed)

    def _begin_shift(self) -> None:
        if self.shift_start is None:
            self.shift_start = self.now

    def _reset_shift(self) -> None:
        self.shift_start = None
        self.driving_shift = 0.0
        self.driving_since_break = 0.0

    def _add(
        self,
        status: str,
        hours: float,
        lat: float,
        lng: float,
        location: str,
        remark: str,
        miles: float = 0.0,
        count_clock: bool = True,
    ) -> None:
        hours = round_to_quarter(max(hours, 0.0))
        if hours <= 0:
            return
        if status in (DRIVING, ON_DUTY) and count_clock:
            self._begin_shift()
        start = self.now
        end = start + timedelta(hours=hours)
        self.segments.append(
            Segment(
                status=status,
                start=start,
                end=end,
                lat=lat,
                lng=lng,
                location=location,
                remark=remark,
                miles=miles,
            )
        )
        self.now = end
        if status in (DRIVING, ON_DUTY):
            self.cycle += hours
        if status == DRIVING:
            self.driving_shift += hours
            self.driving_since_break += hours
            self.total_miles += miles
            self.miles_since_fuel += miles

    def _stop(
        self,
        kind: str,
        lat: float,
        lng: float,
        location: str,
        duration: float,
        description: str,
    ) -> None:
        self.stops.append(
            Stop(
                kind=kind,
                lat=lat,
                lng=lng,
                location=location,
                time=self.now,
                duration_hours=duration,
                description=description,
            )
        )

    def _work(
        self,
        hours: float,
        lat: float,
        lng: float,
        location: str,
        remark: str,
        kind: str,
    ) -> None:
        self._stop(kind, lat, lng, location, hours, remark)
        self._add(ON_DUTY, hours, lat, lng, location, remark)

    def _break(self, lat: float, lng: float, location: str) -> None:
        self._stop("break", lat, lng, location, BREAK_HOURS, "30-minute rest break")
        self._add(
            OFF_DUTY,
            BREAK_HOURS,
            lat,
            lng,
            location,
            "30-minute rest break",
        )
        self.driving_since_break = 0.0

    def _fuel(self, lat: float, lng: float, location: str) -> None:
        self._stop("fuel", lat, lng, location, FUEL_HOURS, "Fuel stop")
        self._add(ON_DUTY, FUEL_HOURS, lat, lng, location, "Fueling")
        self.miles_since_fuel = 0.0
        self.driving_since_break = 0.0

    def _daily_rest(self, lat: float, lng: float, location: str) -> None:
        self._stop("rest", lat, lng, location, DAILY_REST_HOURS, "10-hour sleeper berth rest")
        self._add(
            SLEEPER,
            DAILY_REST_HOURS,
            lat,
            lng,
            location,
            "10-hour sleeper berth rest",
            count_clock=False,
        )
        self._reset_shift()

    def _restart(self, lat: float, lng: float, location: str) -> None:
        self._stop("restart", lat, lng, location, RESTART_HOURS, "34-hour restart")
        self._add(
            OFF_DUTY,
            RESTART_HOURS,
            lat,
            lng,
            location,
            "34-hour restart",
            count_clock=False,
        )
        self.cycle = 0.0
        self._reset_shift()

    def _prepare_to_drive(self, lat: float, lng: float, fallback: str) -> None:
        location = self._name(lat, lng, fallback)
        # Limits that block driving must be cleared before we move the truck.
        for _ in range(8):
            if self.cycle >= CYCLE_LIMIT_HOURS - 1e-6:
                self._restart(lat, lng, location)
                continue
            if self.driving_shift >= MAX_DRIVING_HOURS - 1e-6 or self._window_remaining() < MIN_SEGMENT_HOURS:
                self._daily_rest(lat, lng, location)
                continue
            if self.driving_since_break >= BREAK_AFTER_DRIVE_HOURS - 1e-6:
                if self._window_remaining() >= BREAK_HOURS:
                    self._break(lat, lng, location)
                else:
                    self._daily_rest(lat, lng, location)
                continue
            if self.miles_since_fuel >= FUEL_INTERVAL_MILES - 1e-6:
                self._fuel(lat, lng, location)
                continue
            break

    def _drive(self, leg: RouteLeg) -> None:
        remaining_miles = leg.distance_miles
        duration = leg.duration_hours
        if remaining_miles <= 0.05:
            return
        if duration <= 0:
            duration = remaining_miles / AVERAGE_SPEED_MPH
        speed = remaining_miles / duration
        coords = leg.coordinates or [
            (leg.origin.lat, leg.origin.lng),
            (leg.dest.lat, leg.dest.lng),
        ]
        traveled_on_leg = 0.0
        safety = 0

        while remaining_miles > 0.05 and safety < 500:
            safety += 1
            frac = min(1.0, traveled_on_leg / leg.distance_miles) if leg.distance_miles else 1.0
            here = point_along_line(coords, frac)
            self._prepare_to_drive(here[0], here[1], leg.origin.city_state)

            window = self._window_remaining()
            drive_left = MAX_DRIVING_HOURS - self.driving_shift
            break_left = BREAK_AFTER_DRIVE_HOURS - self.driving_since_break
            cycle_left = CYCLE_LIMIT_HOURS - self.cycle
            fuel_left_miles = FUEL_INTERVAL_MILES - self.miles_since_fuel
            fuel_left_hours = fuel_left_miles / speed if speed > 0 else window
            leg_hours = remaining_miles / speed

            h = min(window, drive_left, break_left, cycle_left, fuel_left_hours, leg_hours)
            h = round_to_quarter(h)

            if h < MIN_SEGMENT_HOURS:
                if remaining_miles / speed <= MIN_SEGMENT_HOURS + 1e-6 and min(window, drive_left, cycle_left) >= MIN_SEGMENT_HOURS:
                    h = MIN_SEGMENT_HOURS
                else:
                    # A limit is sitting at zero; prepare_to_drive should have cleared it.
                    # Force the matching rest so we cannot spin.
                    loc_name = self._name(here[0], here[1], leg.dest.city_state)
                    if cycle_left < MIN_SEGMENT_HOURS:
                        self._restart(here[0], here[1], loc_name)
                    elif drive_left < MIN_SEGMENT_HOURS or window < MIN_SEGMENT_HOURS:
                        self._daily_rest(here[0], here[1], loc_name)
                    elif break_left < MIN_SEGMENT_HOURS:
                        self._break(here[0], here[1], loc_name)
                    elif fuel_left_hours < MIN_SEGMENT_HOURS:
                        self._fuel(here[0], here[1], loc_name)
                    else:
                        break
                    continue

            miles = min(remaining_miles, h * speed)
            if miles <= 0:
                break
            h = miles / speed
            h = max(MIN_SEGMENT_HOURS, round_to_quarter(h)) if remaining_miles - miles <= 0.05 else round_to_quarter(h)
            if h <= 0:
                break
            miles = min(remaining_miles, h * speed)

            traveled_on_leg += miles
            remaining_miles = max(0.0, remaining_miles - miles)
            dest_frac = min(1.0, traveled_on_leg / leg.distance_miles) if leg.distance_miles else 1.0
            dest_pt = point_along_line(coords, dest_frac)
            dest_name = (
                leg.dest.city_state
                if remaining_miles <= 0.05
                else self._name(dest_pt[0], dest_pt[1], leg.dest.city_state)
            )
            self._add(
                DRIVING,
                h,
                dest_pt[0],
                dest_pt[1],
                dest_name,
                f"Driving to {leg.dest.city_state}",
                miles=miles,
            )

        if self.miles_since_fuel >= FUEL_INTERVAL_MILES - 1e-6:
            self._fuel(leg.dest.lat, leg.dest.lng, leg.dest.city_state)

        if remaining_miles <= 0.05:
            for seg in reversed(self.segments):
                if seg.status == DRIVING:
                    seg.lat = leg.dest.lat
                    seg.lng = leg.dest.lng
                    seg.location = leg.dest.city_state
                    break

    def _merged_segments(self) -> list[Segment]:
        if not self.segments:
            return []
        merged: list[Segment] = [self.segments[0]]
        for seg in self.segments[1:]:
            prev = merged[-1]
            same = (
                prev.status == seg.status
                and prev.remark == seg.remark
                and prev.end == seg.start
            )
            if same:
                prev.end = seg.end
                prev.miles += seg.miles
                prev.lat = seg.lat
                prev.lng = seg.lng
                prev.location = seg.location
            else:
                merged.append(seg)
        return merged
