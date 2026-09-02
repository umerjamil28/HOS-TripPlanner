from datetime import datetime

from django.test import SimpleTestCase

from planner.constants import DRIVING, SLEEPER
from planner.services.geocoding import Place
from planner.services.hos import HosEngine
from planner.services.logs import build_daily_logs
from planner.services.routing import RouteLeg


def place(name: str, lat: float, lng: float) -> Place:
    return Place(query=name, lat=lat, lng=lng, label=name, city_state=name)


class HosEngineTests(SimpleTestCase):
    def test_short_trip_fits_one_day(self):
        chicago = place("Chicago, IL", 41.88, -87.63)
        rockford = place("Rockford, IL", 42.27, -89.09)
        leg = RouteLeg(
            origin=chicago,
            dest=rockford,
            distance_miles=80,
            duration_hours=1.5,
            coordinates=[(chicago.lat, chicago.lng), (rockford.lat, rockford.lng)],
        )
        engine = HosEngine(datetime(2026, 9, 2, 6, 0), cycle_used=20)
        result = engine.run(chicago, chicago, rockford, None, leg)
        logs = build_daily_logs(result)

        self.assertEqual(len(logs), 1)
        totals = logs[0]["totals"]
        self.assertAlmostEqual(sum(totals.values()), 24.0, places=1)
        self.assertAlmostEqual(totals["on_duty"], 2.0, places=1)
        self.assertAlmostEqual(totals["driving"], 1.5, delta=0.25)
        self.assertEqual(logs[0]["recap"]["on_duty_today"], totals["driving"] + totals["on_duty"])
        kinds = {stop.kind for stop in result.stops}
        self.assertIn("pickup", kinds)
        self.assertIn("dropoff", kinds)

    def test_break_after_eight_hours_driving(self):
        start = place("Chicago, IL", 41.88, -87.63)
        end = place("Lincoln, NE", 40.81, -96.68)
        leg = RouteLeg(
            origin=start,
            dest=end,
            distance_miles=500,
            duration_hours=10,
            coordinates=[(start.lat, start.lng), (end.lat, end.lng)],
        )
        engine = HosEngine(datetime(2026, 9, 2, 6, 0), cycle_used=10)
        result = engine.run(start, start, end, None, leg)

        statuses = [(s.status, s.remark) for s in result.segments]
        self.assertTrue(any("30-minute rest break" in s.remark for s in result.segments))
        driving = sum(
            (s.end - s.start).total_seconds() / 3600
            for s in result.segments
            if s.status == DRIVING
        )
        self.assertAlmostEqual(driving, 10.0, delta=0.5)
        self.assertNotIn(SLEEPER, [s.status for s in result.segments])

    def test_daily_rest_when_driving_exceeds_eleven_hours(self):
        start = place("Chicago, IL", 41.88, -87.63)
        end = place("Denver, CO", 39.74, -104.99)
        leg = RouteLeg(
            origin=start,
            dest=end,
            distance_miles=1000,
            duration_hours=18,
            coordinates=[(start.lat, start.lng), (end.lat, end.lng)],
        )
        engine = HosEngine(datetime(2026, 9, 2, 6, 0), cycle_used=0)
        result = engine.run(start, start, end, None, leg)
        logs = build_daily_logs(result)

        self.assertGreaterEqual(len(logs), 2)
        self.assertTrue(any(s.status == SLEEPER for s in result.segments))
        self.assertTrue(any(stop.kind == "fuel" for stop in result.stops))
        for sheet in logs:
            self.assertAlmostEqual(sum(sheet["totals"].values()), 24.0, delta=0.26)

    def test_cycle_restart_when_weekly_hours_exhausted(self):
        start = place("Dallas, TX", 32.78, -96.80)
        end = place("Austin, TX", 30.27, -97.74)
        leg = RouteLeg(
            origin=start,
            dest=end,
            distance_miles=200,
            duration_hours=4,
            coordinates=[(start.lat, start.lng), (end.lat, end.lng)],
        )
        engine = HosEngine(datetime(2026, 9, 2, 6, 0), cycle_used=69)
        result = engine.run(start, start, end, None, leg)

        self.assertTrue(any(stop.kind == "restart" for stop in result.stops))
        self.assertTrue(any("34-hour restart" in s.remark for s in result.segments))
        driving = [s for s in result.segments if s.status == DRIVING]
        self.assertTrue(driving)
        restart = next(s for s in result.segments if "34-hour restart" in s.remark)
        self.assertLessEqual(restart.end, driving[0].start)
        self.assertLess(restart.start, driving[0].start)
