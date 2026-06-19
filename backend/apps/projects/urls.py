"""
Project URL routes.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"projects", views.ProjectViewSet, basename="project")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "projects/<uuid:project_id>/environments/",
        views.EnvironmentListCreateView.as_view(),
        name="environment-list-create",
    ),
    path(
        "environments/<uuid:pk>/",
        views.EnvironmentDetailView.as_view(),
        name="environment-detail",
    ),
]
