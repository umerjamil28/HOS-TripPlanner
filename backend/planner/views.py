from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from planner.serializers import PlanTripSerializer
from planner.services.geocoding import Geocoder, LocationNotFound
from planner.services.trip import plan_trip


@api_view(["GET"])
def index(request):
    return Response(
        {
            "name": "HOS Trip Planner API",
            "status": "ok",
            "endpoints": {
                "GET /": "This index",
                "GET /api/health/": "Health check",
                "GET /api/locations/?q=": "Location autocomplete",
                "POST /api/plan-trip/": "Plan a trip and generate ELD logs",
            },
            "plan_trip_body": {
                "current_location": "Chicago, IL",
                "pickup_location": "Chicago, IL",
                "dropoff_location": "Rockford, IL",
                "current_cycle_used": 12,
            },
        }
    )


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


@api_view(["GET"])
def suggest_locations(request):
    query = (request.query_params.get("q") or "").strip()
    if len(query) < 2:
        return Response([])
    return Response(Geocoder().suggest(query))


@api_view(["POST"])
def plan_trip_view(request):
    serializer = PlanTripSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        payload = plan_trip(
            current_location=data["current_location"],
            pickup_location=data["pickup_location"],
            dropoff_location=data["dropoff_location"],
            current_cycle_used=data["current_cycle_used"],
            start_time=data.get("start_time"),
        )
    except LocationNotFound as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response(
            {"detail": f"Could not plan trip: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(payload)
