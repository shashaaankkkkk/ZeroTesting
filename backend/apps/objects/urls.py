"""
Object Repository URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
    path(
        "projects/<uuid:project_id>/objects/",
        views.ObjectRepositoryListCreateView.as_view(),
        name="object-list-create",
    ),
    path(
        "objects/<uuid:pk>/",
        views.ObjectRepositoryDetailView.as_view(),
        name="object-detail",
    ),
]
