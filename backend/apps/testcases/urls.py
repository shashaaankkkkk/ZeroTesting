"""
Test case URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
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

    # Test Case Groups
    path(
        "projects/<uuid:project_id>/testcase-groups/",
        views.TestCaseGroupListCreateView.as_view(),
        name="testcase-group-list-create",
    ),
    path(
        "testcase-groups/<uuid:pk>/",
        views.TestCaseGroupDetailView.as_view(),
        name="testcase-group-detail",
    ),
    path(
        "testcase-groups/<uuid:pk>/add-testcases/",
        views.TestCaseGroupAddTestCasesView.as_view(),
        name="testcase-group-add-testcases",
    ),
]


