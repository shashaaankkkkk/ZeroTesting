"""
Failure views.
"""
from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import FailureRecord
from .serializers import FailureRecordSerializer, FailureUpdateSerializer


@extend_schema(tags=["Failures"])
class FailureListView(generics.ListAPIView):
    """List failure records for a project."""
    serializer_class = FailureRecordSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status"]
    ordering_fields = ["created_at", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return FailureRecord.objects.filter(
            project_id=self.kwargs["project_id"],
            project__owner=self.request.user,
        ).select_related("test_case", "environment", "failed_step")


@extend_schema(tags=["Failures"])
class FailureDetailView(generics.RetrieveAPIView):
    """Get failure record detail."""
    serializer_class = FailureRecordSerializer

    def get_queryset(self):
        return FailureRecord.objects.filter(
            project__owner=self.request.user
        ).select_related("test_case", "environment", "failed_step")


@extend_schema(tags=["Failures"])
class FailureUpdateView(generics.UpdateAPIView):
    """Update failure status and notes."""
    serializer_class = FailureUpdateSerializer

    def get_queryset(self):
        return FailureRecord.objects.filter(project__owner=self.request.user)
