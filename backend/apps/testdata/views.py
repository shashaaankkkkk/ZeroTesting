"""
Test Data views.
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter
from drf_spectacular.utils import extend_schema

from apps.projects.models import Project
from .models import TestData
from .serializers import TestDataSerializer, GenerateValueSerializer
from .generators import generate_value, list_generators


class TestDataListCreateView(generics.ListCreateAPIView):
    """List and create test data entries."""
    serializer_class = TestDataSerializer
    filter_backends = [SearchFilter]
    search_fields = ["key", "description"]

    @extend_schema(tags=["Test Data"])
    def get_queryset(self):
        return TestData.objects.filter(
            project_id=self.kwargs["project_id"],
            project__owner=self.request.user,
        )

    def perform_create(self, serializer):
        project = Project.objects.get(
            id=self.kwargs["project_id"],
            owner=self.request.user,
        )
        serializer.save(project=project)


class TestDataDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a test data entry."""
    serializer_class = TestDataSerializer

    @extend_schema(tags=["Test Data"])
    def get_queryset(self):
        return TestData.objects.filter(project__owner=self.request.user)


class GenerateValueView(APIView):
    """Generate a dynamic value."""

    @extend_schema(tags=["Test Data"], request=GenerateValueSerializer)
    def post(self, request):
        serializer = GenerateValueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            value = generate_value(serializer.validated_data["generator"])
            return Response({"value": value})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ListGeneratorsView(APIView):
    """List available data generators."""

    @extend_schema(tags=["Test Data"])
    def get(self, request):
        return Response({"generators": list_generators()})
