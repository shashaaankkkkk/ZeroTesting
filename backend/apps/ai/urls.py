"""
AI URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
    path("ai/status/", views.AIStatusView.as_view(), name="ai-status"),
    path("ai/generate-steps/", views.GenerateStepsView.as_view(), name="ai-generate-steps"),
    path("ai/failure-summary/", views.FailureSummaryView.as_view(), name="ai-failure-summary"),
]
