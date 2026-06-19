"""
Execution URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Execution runs
    path(
        "projects/<uuid:project_id>/executions/",
        views.ExecutionRunListView.as_view(),
        name="execution-list",
    ),
    path("executions/run/", views.TriggerExecutionView.as_view(), name="execution-trigger"),
    path("executions/<uuid:pk>/", views.ExecutionRunDetailView.as_view(), name="execution-detail"),
    path("executions/<uuid:pk>/status/", views.ExecutionStatusView.as_view(), name="execution-status"),
    path("executions/<uuid:pk>/cancel/", views.CancelExecutionView.as_view(), name="execution-cancel"),
    path("executions/<uuid:pk>/artifacts/", views.ArtifactListView.as_view(), name="execution-artifacts"),

    # Artifacts
    path("artifacts/download/", views.DirectArtifactDownloadView.as_view(), name="direct-artifact-download"),
    path("artifacts/<uuid:pk>/download/", views.ArtifactDownloadView.as_view(), name="artifact-download"),

    # Dashboard
    path("dashboard/stats/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path("dashboard/trends/", views.DashboardTrendsView.as_view(), name="dashboard-trends"),
    path("dashboard/recent-executions/", views.RecentExecutionsView.as_view(), name="dashboard-recent-executions"),
    path("dashboard/recent-failures/", views.RecentFailuresView.as_view(), name="dashboard-recent-failures"),
]
