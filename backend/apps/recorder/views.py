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
    throttle_classes = []

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
    throttle_classes = []

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
        return Response({
            "session_id": session_id,
            "status": "stopping",
            "steps": session.get("steps", [])
        })


class RecordingStatusView(APIView):
    """Get recording session status."""
    throttle_classes = []

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
    """Get or update recorded steps from a session."""
    throttle_classes = []

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

    @extend_schema(tags=["Recorder"])
    def put(self, request, session_id):
        session = RecorderService.get_session(session_id)
        if not session:
            return Response(
                {"error": "Session not found or expired."},
                status=status.HTTP_404_NOT_FOUND,
            )

        steps = request.data.get("steps", [])
        session["steps"] = steps
        RecorderService.update_session(session_id, session)
        return Response({
            "session_id": session_id,
            "status": session.get("status"),
            "steps": steps,
        })



from django.core.cache import cache

class RecordingInteractSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["click", "type", "press", "navigate", "back", "forward", "reload"])
    x = serializers.IntegerField(required=False, allow_null=True)
    y = serializers.IntegerField(required=False, allow_null=True)
    text = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    key = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    url = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class RecordingScreenshotView(APIView):
    """Get the latest screenshot frame of the recording session."""
    throttle_classes = []

    @extend_schema(tags=["Recorder"])
    def get(self, request, session_id):
        screenshot_data = cache.get(f"recorder_screenshot_{session_id}")
        if not screenshot_data:
            return Response(
                {"screenshot": ""},
                status=status.HTTP_200_OK
            )
        return Response({"screenshot": screenshot_data}, status=status.HTTP_200_OK)


class RecordingInteractView(APIView):
    """Queue an interaction command for the remote browser."""
    throttle_classes = []

    @extend_schema(tags=["Recorder"], request=RecordingInteractSerializer)
    def post(self, request, session_id):
        serializer = RecordingInteractSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = RecorderService.get_session(session_id)
        if not session:
            return Response(
                {"error": "Session not found or expired."},
                status=status.HTTP_404_NOT_FOUND,
            )

        import uuid
        import time

        command_id = str(uuid.uuid4())
        cmd_data = {**serializer.validated_data, "id": command_id}

        command_key = f"recorder_commands_{session_id}"
        commands = cache.get(command_key) or []
        commands.append(cmd_data)
        cache.set(command_key, commands, 600)

        # Wait for worker to complete the command
        result_key = f"recorder_command_result_{command_id}"
        for _ in range(30):  # 3 seconds timeout
            time.sleep(0.1)
            if cache.get(result_key):
                cache.delete(result_key)
                break

        screenshot_data = cache.get(f"recorder_screenshot_{session_id}") or ""
        return Response({
            "status": "command_queued",
            "screenshot": screenshot_data
        }, status=status.HTTP_200_OK)


