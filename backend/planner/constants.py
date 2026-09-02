"""Hours-of-service constants for property-carrying CMVs (70-hour / 8-day)."""

# 49 CFR 395.3 — property-carrying
MAX_DRIVING_HOURS = 11.0
MAX_WINDOW_HOURS = 14.0
BREAK_AFTER_DRIVE_HOURS = 8.0
BREAK_HOURS = 0.5
DAILY_REST_HOURS = 10.0
RESTART_HOURS = 34.0
CYCLE_LIMIT_HOURS = 70.0
CYCLE_DAYS = 8

# Assessment assumptions
PICKUP_HOURS = 1.0
DROPOFF_HOURS = 1.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_HOURS = 0.5

# Planning
DEFAULT_START_HOUR = 6
MIN_SEGMENT_HOURS = 0.25  # paper logs are 15-minute increments
SAME_PLACE_MILES = 1.0
AVERAGE_SPEED_MPH = 55.0
ROAD_FACTOR = 1.3  # straight-line fallback

OFF_DUTY = "off_duty"
SLEEPER = "sleeper"
DRIVING = "driving"
ON_DUTY = "on_duty"

STATUS_LABELS = {
    OFF_DUTY: "Off Duty",
    SLEEPER: "Sleeper Berth",
    DRIVING: "Driving",
    ON_DUTY: "On Duty (not driving)",
}
