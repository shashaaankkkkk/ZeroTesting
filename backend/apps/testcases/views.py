"""
Test case views.
"""
from rest_framework import generics, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.projects.models import Project
from .models import AutomationTestCase, AutomationStep, TestCaseGroup
from .serializers import (
    AutomationTestCaseListSerializer,
    AutomationTestCaseDetailSerializer,
    AutomationTestCaseCreateSerializer,
    AutomationStepSerializer,
    StepReorderSerializer,
    TestCaseGroupListSerializer,
    TestCaseGroupDetailSerializer,
    TestCaseGroupCreateUpdateSerializer,
)
from .filters import AutomationTestCaseFilter
from .services import ScriptGeneratorService


# ── Automation Test Cases ────────────────────────────────────────────

@extend_schema_view(
    list=extend_schema(tags=["Automation Test Cases"]),
    create=extend_schema(tags=["Automation Test Cases"]),
)
class AutomationTestCaseListCreateView(generics.ListCreateAPIView):
    """List and create automation test cases for a project."""
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AutomationTestCaseFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return AutomationTestCase.objects.filter(
            project_id=self.kwargs["project_id"],
            project__owner=self.request.user,
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AutomationTestCaseCreateSerializer
        return AutomationTestCaseListSerializer


@extend_schema_view(
    retrieve=extend_schema(tags=["Automation Test Cases"]),
    update=extend_schema(tags=["Automation Test Cases"]),
    partial_update=extend_schema(tags=["Automation Test Cases"]),
    destroy=extend_schema(tags=["Automation Test Cases"]),
)
class AutomationTestCaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete an automation test case."""

    def get_queryset(self):
        return AutomationTestCase.objects.filter(project__owner=self.request.user)

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AutomationTestCaseDetailSerializer
        return AutomationTestCaseCreateSerializer


class AutomationTestScriptView(generics.RetrieveAPIView):
    """Generate Playwright script for an automation test case."""

    def get_queryset(self):
        return AutomationTestCase.objects.filter(project__owner=self.request.user)

    @extend_schema(tags=["Automation Test Cases"])
    def retrieve(self, request, *args, **kwargs):
        test_case = self.get_object()
        script = ScriptGeneratorService.generate_script(test_case)
        readable = ScriptGeneratorService.generate_human_readable(test_case)
        return Response({
            "test_case_id": str(test_case.id),
            "test_case_name": test_case.name,
            "script": script,
            "human_readable_steps": readable,
        })


# ── Automation Steps ─────────────────────────────────────────────────

class StepCreateView(generics.CreateAPIView):
    """Add a step to an automation test case."""
    serializer_class = AutomationStepSerializer

    @extend_schema(tags=["Automation Steps"])
    def perform_create(self, serializer):
        test_case = AutomationTestCase.objects.get(
            id=self.kwargs["test_id"],
            project__owner=self.request.user,
        )
        # Auto-set order to next
        max_order = test_case.steps.order_by("-order").values_list("order", flat=True).first() or 0
        serializer.save(test_case=test_case, order=serializer.validated_data.get("order", max_order + 1))


class StepDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a step."""
    serializer_class = AutomationStepSerializer

    @extend_schema(tags=["Automation Steps"])
    def get_queryset(self):
        return AutomationStep.objects.filter(test_case__project__owner=self.request.user)


class StepReorderView(generics.UpdateAPIView):
    """Reorder steps in an automation test case."""
    serializer_class = StepReorderSerializer

    @extend_schema(tags=["Automation Steps"])
    def update(self, request, test_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        test_case = AutomationTestCase.objects.get(
            id=test_id,
            project__owner=request.user,
        )

        step_ids = serializer.validated_data["step_ids"]
        for order, step_id in enumerate(step_ids, start=1):
            AutomationStep.objects.filter(id=step_id, test_case=test_case).update(order=order)

        return Response({"message": "Steps reordered successfully."})


# ── Test Case Groups ─────────────────────────────────────────────────

@extend_schema_view(
    list=extend_schema(tags=["TestCase Groups"]),
    create=extend_schema(tags=["TestCase Groups"]),
)
class TestCaseGroupListCreateView(generics.ListCreateAPIView):
    """List and create test case groups for a project."""

    def get_queryset(self):
        return TestCaseGroup.objects.filter(
            project_id=self.kwargs["project_id"],
            project__owner=self.request.user,
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TestCaseGroupCreateUpdateSerializer
        return TestCaseGroupListSerializer

    def perform_create(self, serializer):
        project = Project.objects.get(
            id=self.kwargs["project_id"],
            owner=self.request.user,
        )
        serializer.save(project=project)


@extend_schema_view(
    retrieve=extend_schema(tags=["TestCase Groups"]),
    update=extend_schema(tags=["TestCase Groups"]),
    partial_update=extend_schema(tags=["TestCase Groups"]),
    destroy=extend_schema(tags=["TestCase Groups"]),
)
class TestCaseGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a testcase group."""

    def get_queryset(self):
        return TestCaseGroup.objects.filter(project__owner=self.request.user)

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return TestCaseGroupCreateUpdateSerializer
        return TestCaseGroupDetailSerializer




class TestCaseGroupAddTestCasesView(generics.CreateAPIView):
    """Add automation test cases to a group."""

    @extend_schema(tags=["TestCase Groups"])
    def create(self, request, pk):
        try:
            group = TestCaseGroup.objects.get(id=pk, project__owner=request.user)
        except TestCaseGroup.DoesNotExist:
            return Response({"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND)

        test_case_ids = request.data.get("test_case_ids", [])
        if not test_case_ids:
            return Response({"error": "No test case IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate test cases belong to project
        valid_cases = AutomationTestCase.objects.filter(id__in=test_case_ids, project=group.project)
        group.test_cases.add(*valid_cases)

        return Response({"message": f"Successfully added {valid_cases.count()} test cases to group."})



