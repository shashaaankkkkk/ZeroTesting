"""
Project views.
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.accounts.permissions import IsOwner
from .models import Project, Environment
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectCreateSerializer,
    EnvironmentSerializer,
)
from .services import ProjectService
from .filters import ProjectFilter


@extend_schema_view(
    list=extend_schema(tags=["Projects"]),
    create=extend_schema(tags=["Projects"]),
    retrieve=extend_schema(tags=["Projects"]),
    update=extend_schema(tags=["Projects"]),
    partial_update=extend_schema(tags=["Projects"]),
    destroy=extend_schema(tags=["Projects"]),
)
class ProjectViewSet(viewsets.ModelViewSet):
    """CRUD operations for projects."""
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProjectFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ProjectService.get_user_projects(self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        if self.action in ("create",):
            return ProjectCreateSerializer
        return ProjectDetailSerializer

    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_active = False
        instance.save()

    @extend_schema(tags=["Projects"])
    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Get project dashboard stats."""
        project = self.get_object()
        stats = ProjectService.get_project_stats(project)
        return Response(stats)


@extend_schema_view(
    list=extend_schema(tags=["Environments"]),
    create=extend_schema(tags=["Environments"]),
)
class EnvironmentListCreateView(generics.ListCreateAPIView):
    """List and create environments for a project."""
    serializer_class = EnvironmentSerializer
    pagination_class = None

    def get_queryset(self):
        return Environment.objects.filter(
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
    retrieve=extend_schema(tags=["Environments"]),
    update=extend_schema(tags=["Environments"]),
    partial_update=extend_schema(tags=["Environments"]),
    destroy=extend_schema(tags=["Environments"]),
)
class EnvironmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete an environment."""
    serializer_class = EnvironmentSerializer

    def get_queryset(self):
        return Environment.objects.filter(project__owner=self.request.user)
