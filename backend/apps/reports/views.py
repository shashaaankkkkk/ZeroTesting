"""
Report views.
"""
import os
from django.http import FileResponse, Http404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.projects.models import Project
from .models import Report
from .serializers import ReportSerializer, GenerateReportSerializer
from .services import ReportService


class ReportListView(generics.ListAPIView):
    """List reports for a project."""
    serializer_class = ReportSerializer

    @extend_schema(tags=["Reports"])
    def get_queryset(self):
        return Report.objects.filter(
            project_id=self.kwargs["project_id"],
            project__owner=self.request.user,
        )


class ReportDetailView(generics.RetrieveAPIView):
    """Get report detail."""
    serializer_class = ReportSerializer

    @extend_schema(tags=["Reports"])
    def get_queryset(self):
        return Report.objects.filter(project__owner=self.request.user)


class GenerateReportView(APIView):
    """Generate a new report."""

    @extend_schema(tags=["Reports"], request=GenerateReportSerializer)
    def post(self, request, project_id):
        serializer = GenerateReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            project = Project.objects.get(id=project_id, owner=request.user)
            report = ReportService.generate_report(
                project,
                request.user,
                serializer.validated_data["report_type"],
                serializer.validated_data["format"],
                serializer.validated_data.get("filters"),
            )
            return Response(
                ReportSerializer(report, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportDownloadView(APIView):
    """Download a report file."""

    @extend_schema(tags=["Reports"])
    def get(self, request, pk):
        try:
            report = Report.objects.get(id=pk, project__owner=request.user)
            if os.path.exists(report.file_path):
                return FileResponse(
                    open(report.file_path, "rb"),
                    as_attachment=True,
                    filename=report.name,
                )
            raise Http404("Report file not found.")
        except Report.DoesNotExist:
            raise Http404
