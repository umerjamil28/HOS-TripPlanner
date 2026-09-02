from django.urls import path

from planner import views

urlpatterns = [
    path("", views.index),
    path("health/", views.health),
    path("locations/", views.suggest_locations),
    path("plan-trip/", views.plan_trip_view),
]
