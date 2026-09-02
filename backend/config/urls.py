from django.contrib import admin
from django.urls import include, path

from planner.views import index

urlpatterns = [
    path("", index),
    path("admin/", admin.site.urls),
    path("api/", include("planner.urls")),
]
