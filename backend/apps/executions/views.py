"""
Execution views.
"""
import os
from django.http import FileResponse, Http404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema

from .models import ExecutionRun, Artifact
from .serializers import (
    ExecutionRunListSerializer,
    ExecutionRunDetailSerializer,
    ExecutionRunStatusSerializer,
    TriggerExecutionSerializer,
)
from .services import ExecutionService


class ExecutionRunListView(generics.ListAPIView):
    """List execution runs for a project."""
    serializer_class = ExecutionRunListSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status"]
    ordering_fields = ["created_at", "duration_ms"]
    ordering = ["-created_at"]

    @extend_schema(tags=["Executions"])
    def get_queryset(self):
        return ExecutionRun.objects.filter(
            project_id=self.kwargs["project_id"],
            project__owner=self.request.user,
        ).select_related("test_case", "environment")


class ExecutionRunDetailView(generics.RetrieveAPIView):
    """Get execution run detail with step results."""
    serializer_class = ExecutionRunDetailSerializer

    @extend_schema(tags=["Executions"])
    def get_queryset(self):
        return ExecutionRun.objects.filter(
            project__owner=self.request.user
        ).select_related("test_case", "environment").prefetch_related(
            "step_results", "artifacts"
        )


class ExecutionStatusView(generics.RetrieveAPIView):
    """Lightweight status endpoint for polling."""
    serializer_class = ExecutionRunStatusSerializer

    @extend_schema(tags=["Executions"])
    def get_queryset(self):
        return ExecutionRun.objects.filter(project__owner=self.request.user)


class TriggerExecutionView(APIView):
    """Trigger a test execution."""

    @extend_schema(tags=["Executions"], request=TriggerExecutionSerializer)
    def post(self, request):
        serializer = TriggerExecutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            run = ExecutionService.trigger_execution(
                request.user,
                serializer.validated_data["test_case_id"],
                serializer.validated_data["environment_id"],
            )
            return Response(
                ExecutionRunListSerializer(run).data,
                status=status.HTTP_202_ACCEPTED,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CancelExecutionView(APIView):
    """Cancel a running execution."""

    @extend_schema(tags=["Executions"])
    def post(self, request, pk):
        try:
            run = ExecutionRun.objects.get(id=pk, project__owner=request.user)
            cancelled = ExecutionService.cancel_execution(run)
            if cancelled:
                return Response({"message": "Execution cancelled."})
            return Response(
                {"message": "Cannot cancel this execution."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ExecutionRun.DoesNotExist:
            raise Http404


class ArtifactListView(generics.ListAPIView):
    """List artifacts for an execution run."""
    from .serializers import ArtifactSerializer
    serializer_class = ArtifactSerializer

    @extend_schema(tags=["Executions"])
    def get_queryset(self):
        return Artifact.objects.filter(
            execution_run_id=self.kwargs["pk"],
            execution_run__project__owner=self.request.user,
        )


class ArtifactDownloadView(APIView):
    """Download an artifact file."""

    @extend_schema(tags=["Executions"])
    def get(self, request, pk):
        try:
            artifact = Artifact.objects.get(
                id=pk,
                execution_run__project__owner=request.user,
            )
            if os.path.exists(artifact.file_path):
                return FileResponse(
                    open(artifact.file_path, "rb"),
                    as_attachment=True,
                    filename=artifact.file_name,
                )
            raise Http404("Artifact file not found.")
        except Artifact.DoesNotExist:
            raise Http404


class DashboardStatsView(APIView):
    """Aggregated dashboard stats."""

    @extend_schema(tags=["Dashboard"])
    def get(self, request):
        stats = ExecutionService.get_dashboard_stats(request.user)
        return Response(stats)


class DashboardTrendsView(APIView):
    """Execution trends over the last 30 days."""

    @extend_schema(tags=["Dashboard"])
    def get(self, request):
        days = int(request.query_params.get("days", 30))
        trends = ExecutionService.get_execution_trends(request.user, days)
        return Response(trends)


class RecentExecutionsView(APIView):
    """Recent execution runs."""

    @extend_schema(tags=["Dashboard"])
    def get(self, request):
        runs = ExecutionService.get_recent_executions(request.user)
        return Response(ExecutionRunListSerializer(runs, many=True).data)


class RecentFailuresView(APIView):
    """Recent failed execution runs."""

    @extend_schema(tags=["Dashboard"])
    def get(self, request):
        runs = ExecutionService.get_recent_failures(request.user)
        return Response(ExecutionRunListSerializer(runs, many=True).data)


class DirectArtifactDownloadView(APIView):
    """Download an artifact by its absolute path (used for step screenshots)."""

    @extend_schema(tags=["Executions"])
    def get(self, request):
        from django.conf import settings
        path_param = request.query_params.get("path")
        if not path_param:
            raise Http404("Path not specified.")

        # Resolve path and check it is within media root for security
        media_root = os.path.abspath(settings.MEDIA_ROOT)
        abs_path = os.path.abspath(path_param)

        if not abs_path.startswith(media_root):
            raise Http404("Access denied.")

        if os.path.exists(abs_path):
            return FileResponse(
                open(abs_path, "rb"),
                as_attachment=False,
                content_type="image/png",
            )
        raise Http404("Screenshot not found.")
