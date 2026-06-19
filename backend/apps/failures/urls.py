"""
Failure URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
    path(
        "projects/<uuid:project_id>/failures/",
        views.FailureListView.as_view(),
        name="failure-list",
    ),
    path("failures/<uuid:pk>/", views.FailureDetailView.as_view(), name="failure-detail"),
    path("failures/<uuid:pk>/update/", views.FailureUpdateView.as_view(), name="failure-update"),
]
