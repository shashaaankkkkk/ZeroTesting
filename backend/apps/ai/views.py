"""
AI views.
"""
from rest_framework import status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from .feature_flags import is_ai_enabled
from .services import GeminiService


class GenerateStepsSerializer(serializers.Serializer):
    description = serializers.CharField(required=True)
    context = serializers.CharField(required=False, default="")


class FailureSummarySerializer(serializers.Serializer):
    expected = serializers.CharField(required=True)
    actual = serializers.CharField(required=True)
    error_message = serializers.CharField(required=False, default="")
    console_logs = serializers.CharField(required=False, default="")


class AIStatusView(APIView):
    """Check if AI is enabled."""

    @extend_schema(tags=["AI"])
    def get(self, request):
        return Response({"enabled": is_ai_enabled()})


class GenerateStepsView(APIView):
    """Convert natural language to automation steps."""

    @extend_schema(tags=["AI"], request=GenerateStepsSerializer)
    def post(self, request):
        if not is_ai_enabled():
            return Response(
                {"error": "AI integration is not enabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = GenerateStepsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            steps = GeminiService.generate_test_steps(
                serializer.validated_data["description"],
                serializer.validated_data.get("context", ""),
            )
            return Response({"steps": steps})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FailureSummaryView(APIView):
    """Generate AI failure summary."""

    @extend_schema(tags=["AI"], request=FailureSummarySerializer)
    def post(self, request):
        if not is_ai_enabled():
            return Response(
                {"error": "AI integration is not enabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = FailureSummarySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            summary = GeminiService.generate_failure_summary(
                serializer.validated_data["expected"],
                serializer.validated_data["actual"],
                serializer.validated_data.get("error_message", ""),
                serializer.validated_data.get("console_logs", ""),
            )
            return Response({"summary": summary})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
