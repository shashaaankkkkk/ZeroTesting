"""
Test Data URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
    path(
        "projects/<uuid:project_id>/test-data/",
        views.TestDataListCreateView.as_view(),
        name="testdata-list-create",
    ),
    path(
        "test-data/<uuid:pk>/",
        views.TestDataDetailView.as_view(),
        name="testdata-detail",
    ),
    path(
        "test-data/generate/",
        views.GenerateValueView.as_view(),
        name="testdata-generate",
    ),
    path(
        "test-data/generators/",
        views.ListGeneratorsView.as_view(),
        name="testdata-generators",
    ),
]
