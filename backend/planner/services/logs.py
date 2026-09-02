from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta

from planner.constants import CYCLE_LIMIT_HOURS, DRIVING, OFF_DUTY, ON_DUTY, SLEEPER
from planner.services.hos import HosResult, Segment


def _hhmm(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def _hours_between(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 3600.0


def _split_midnight(segment: Segment) -> list[Segment]:
    pieces: list[Segment] = []
    cursor = segment.start
    total = _hours_between(segment.start, segment.end)
    while cursor.date() < segment.end.date():
        nxt = (cursor + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        part_hours = _hours_between(cursor, nxt)
        miles = segment.miles * (part_hours / total) if total else 0.0
        pieces.append(
            Segment(
                status=segment.status,
                start=cursor,
                end=nxt,
                lat=segment.lat,
                lng=segment.lng,
                location=segment.location,
                remark=segment.remark,
                miles=miles,
            )
        )
        cursor = nxt
    if cursor < segment.end:
        part_hours = _hours_between(cursor, segment.end)
        miles = segment.miles * (part_hours / total) if total else 0.0
        pieces.append(
            Segment(
                status=segment.status,
                start=cursor,
                end=segment.end,
                lat=segment.lat,
                lng=segment.lng,
                location=segment.location,
                remark=segment.remark,
                miles=miles,
            )
        )
    return pieces or [segment]


def _serialize_segment(segment: Segment) -> dict:
    start_hour = segment.start.hour + segment.start.minute / 60.0
    end_hour = segment.end.hour + segment.end.minute / 60.0
    if segment.end.hour == 0 and segment.end.minute == 0 and segment.end != segment.start:
        end_hour = 24.0
    return {
        "status": segment.status,
        "start": _hhmm(segment.start),
        "end": "24:00" if end_hour >= 24 else _hhmm(segment.end),
        "start_hour": round(start_hour, 2),
        "end_hour": round(end_hour, 2),
        "location": segment.location,
        "remark": segment.remark,
        "miles": round(segment.miles, 1),
    }


def build_daily_logs(result: HosResult) -> list[dict]:
    by_date: dict = defaultdict(list)
    for segment in result.segments:
        for piece in _split_midnight(segment):
            by_date[piece.start.date()].append(piece)

    restart_end_dates = {
        (stop.time + timedelta(hours=34)).date()
        for stop in result.stops
        if stop.kind == "restart"
    }

    rolling: deque[float] = deque([0.0] * 6 + [result.cycle_used_start], maxlen=8)
    sheets: list[dict] = []

    for day in sorted(by_date):
        day_segments: list[Segment] = sorted(by_date[day], key=lambda s: s.start)
        totals = {OFF_DUTY: 0.0, SLEEPER: 0.0, DRIVING: 0.0, ON_DUTY: 0.0}
        remarks = []
        miles = 0.0
        locations: list[str] = []

        for seg in day_segments:
            hours = _hours_between(seg.start, seg.end)
            totals[seg.status] = totals.get(seg.status, 0.0) + hours
            miles += seg.miles
            if not remarks or remarks[-1]["text"] != f"{seg.location} — {seg.remark}":
                remarks.append(
                    {
                        "time": _hhmm(seg.start),
                        "location": seg.location,
                        "text": f"{seg.location} — {seg.remark}",
                    }
                )
            if seg.location and (not locations or locations[-1] != seg.location):
                locations.append(seg.location)

        on_duty_today = totals[DRIVING] + totals[ON_DUTY]
        if day in restart_end_dates:
            rolling = deque([0.0] * 7, maxlen=8)
        rolling.append(on_duty_today)

        last_7 = round(sum(list(rolling)[-7:]), 2)
        last_8 = round(sum(rolling), 2)
        available = round(max(0.0, CYCLE_LIMIT_HOURS - last_7), 2)

        total_check = sum(totals.values())
        if abs(total_check - 24.0) > 0.13:
            # Stretch the last off-duty/sleeper block so the grid always covers 24h.
            delta = 24.0 - total_check
            if day_segments and day_segments[-1].status in (OFF_DUTY, SLEEPER):
                totals[day_segments[-1].status] += delta
            else:
                totals[OFF_DUTY] += delta

        sheets.append(
            {
                "date": day.isoformat(),
                "from_location": locations[0] if locations else result.current.city_state,
                "to_location": locations[-1] if locations else result.dropoff.city_state,
                "total_miles": round(miles, 1),
                "segments": [_serialize_segment(s) for s in day_segments],
                "totals": {
                    "off_duty": round(totals[OFF_DUTY], 2),
                    "sleeper": round(totals[SLEEPER], 2),
                    "driving": round(totals[DRIVING], 2),
                    "on_duty": round(totals[ON_DUTY], 2),
                },
                "recap": {
                    "on_duty_today": round(on_duty_today, 2),
                    "last_7_days": last_7,
                    "available_tomorrow": available,
                    "last_8_days": last_8,
                },
                "remarks": remarks,
            }
        )

    return sheets
