"""
Test case URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Business Test Cases
    path(
        "projects/<uuid:project_id>/business-tests/",
        views.BusinessTestCaseListCreateView.as_view(),
        name="business-test-list-create",
    ),
    path(
        "projects/<uuid:project_id>/business-tests/import/",
        views.ExcelImportView.as_view(),
        name="business-test-import",
    ),
    path(
        "business-tests/<uuid:pk>/",
        views.BusinessTestCaseDetailView.as_view(),
        name="business-test-detail",
    ),

    # Automation Test Cases
    path(
        "projects/<uuid:project_id>/automation-tests/",
        views.AutomationTestCaseListCreateView.as_view(),
        name="automation-test-list-create",
    ),
    path(
        "automation-tests/<uuid:pk>/",
        views.AutomationTestCaseDetailView.as_view(),
        name="automation-test-detail",
    ),
    path(
        "automation-tests/<uuid:pk>/script/",
        views.AutomationTestScriptView.as_view(),
        name="automation-test-script",
    ),

    # Steps
    path(
        "automation-tests/<uuid:test_id>/steps/",
        views.StepCreateView.as_view(),
        name="step-create",
    ),
    path(
        "automation-tests/<uuid:test_id>/steps/reorder/",
        views.StepReorderView.as_view(),
        name="step-reorder",
    ),
    path(
        "steps/<uuid:pk>/",
        views.StepDetailView.as_view(),
        name="step-detail",
    ),
]
