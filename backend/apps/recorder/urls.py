"""
Recorder URL routes.
"""
from django.urls import path
from . import views

urlpatterns = [
    path("recorder/start/", views.StartRecordingView.as_view(), name="recorder-start"),
    path("recorder/<str:session_id>/stop/", views.StopRecordingView.as_view(), name="recorder-stop"),
    path("recorder/<str:session_id>/status/", views.RecordingStatusView.as_view(), name="recorder-status"),
    path("recorder/<str:session_id>/steps/", views.RecordedStepsView.as_view(), name="recorder-steps"),
]
