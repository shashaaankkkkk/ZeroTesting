"""
Object Repository views.
"""
from rest_framework import generics
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.projects.models import Project
from .models import ObjectRepository
from .serializers import ObjectRepositorySerializer


@extend_schema_view(
    list=extend_schema(tags=["Object Repository"]),
    create=extend_schema(tags=["Object Repository"]),
)
class ObjectRepositoryListCreateView(generics.ListCreateAPIView):
    """List and create object repository entries."""
    serializer_class = ObjectRepositorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "locator_value", "description"]
    ordering_fields = ["name", "element_type", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return ObjectRepository.objects.filter(
            project_id=self.kwargs["project_id"],
            project__owner=self.request.user,
        )

    def perform_create(self, serializer):
        project = Project.objects.get(
            id=self.kwargs["project_id"],
            owner=self.request.user,
        )
        serializer.save(project=project)


@extend_schema_view(
    retrieve=extend_schema(tags=["Object Repository"]),
    update=extend_schema(tags=["Object Repository"]),
    partial_update=extend_schema(tags=["Object Repository"]),
    destroy=extend_schema(tags=["Object Repository"]),
)
class ObjectRepositoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete an object repository entry."""
    serializer_class = ObjectRepositorySerializer

    def get_queryset(self):
        return ObjectRepository.objects.filter(project__owner=self.request.user)
