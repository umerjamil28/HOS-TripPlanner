from django.utils import timezone
from rest_framework import serializers

from planner.constants import CYCLE_LIMIT_HOURS


class PlanTripSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_used = serializers.FloatField(min_value=0, max_value=CYCLE_LIMIT_HOURS)
    start_time = serializers.DateTimeField(required=False)

    def validate_current_location(self, value: str) -> str:
        return value.strip()

    def validate_pickup_location(self, value: str) -> str:
        return value.strip()

    def validate_dropoff_location(self, value: str) -> str:
        return value.strip()

    def validate_start_time(self, value):
        if timezone.is_aware(value):
            return value.replace(tzinfo=None)
        return value
