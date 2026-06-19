"""
Recorder views.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from rest_framework import serializers

from .services import RecorderService
from .tasks import start_recording_task


class StartRecordingSerializer(serializers.Serializer):
    base_url = serializers.URLField(required=True)


class StartRecordingView(APIView):
    """Start a new recording session."""

    @extend_schema(tags=["Recorder"], request=StartRecordingSerializer)
    def post(self, request):
        serializer = StartRecordingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = RecorderService.create_session()
        base_url = serializer.validated_data["base_url"]

        # Dispatch Celery task
        start_recording_task.delay(session_id, base_url)

        return Response(
            {"session_id": session_id, "status": "starting"},
            status=status.HTTP_202_ACCEPTED,
        )


class StopRecordingView(APIView):
    """Stop a recording session."""

    @extend_schema(tags=["Recorder"])
    def post(self, request, session_id):
        session = RecorderService.get_session(session_id)
        if not session:
            return Response(
                {"error": "Session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        session["status"] = "stopping"
        RecorderService.update_session(session_id, session)
        return Response({"session_id": session_id, "status": "stopping"})


class RecordingStatusView(APIView):
    """Get recording session status."""

    @extend_schema(tags=["Recorder"])
    def get(self, request, session_id):
        session = RecorderService.get_session(session_id)
        if not session:
            return Response(
                {"error": "Session not found or expired."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            "session_id": session_id,
            "status": session.get("status"),
            "url": session.get("url", ""),
            "step_count": len(session.get("steps", [])),
        })


class RecordedStepsView(APIView):
    """Get recorded steps from a session."""

    @extend_schema(tags=["Recorder"])
    def get(self, request, session_id):
        session = RecorderService.get_session(session_id)
        if not session:
            return Response(
                {"error": "Session not found or expired."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            "session_id": session_id,
            "status": session.get("status"),
            "steps": session.get("steps", []),
        })
