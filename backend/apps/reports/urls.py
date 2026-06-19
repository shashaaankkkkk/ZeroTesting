"""
Report URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
    path(
        "projects/<uuid:project_id>/reports/",
        views.ReportListView.as_view(),
        name="report-list",
    ),
    path(
        "projects/<uuid:project_id>/reports/generate/",
        views.GenerateReportView.as_view(),
        name="report-generate",
    ),
    path("reports/<uuid:pk>/", views.ReportDetailView.as_view(), name="report-detail"),
    path("reports/<uuid:pk>/download/", views.ReportDownloadView.as_view(), name="report-download"),
]
