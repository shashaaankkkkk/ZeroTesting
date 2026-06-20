"""
Test case views.
"""
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.projects.models import Project
from .models import BusinessTestCase, AutomationTestCase, AutomationStep, TestCaseGroup
from .serializers import (
    BusinessTestCaseSerializer,
    BusinessTestCaseCreateSerializer,
    AutomationTestCaseListSerializer,
    AutomationTestCaseDetailSerializer,
    AutomationTestCaseCreateSerializer,
    AutomationStepSerializer,
    StepReorderSerializer,
    ExcelImportSerializer,
    TestCaseGroupListSerializer,
    TestCaseGroupDetailSerializer,
    TestCaseGroupCreateUpdateSerializer,
)
from .filters import BusinessTestCaseFilter, AutomationTestCaseFilter
from .services import ScriptGeneratorService
from .excel_parser import parse_excel


# ── Business Test Cases ──────────────────────────────────────────────

@extend_schema_view(
    list=extend_schema(tags=["Business Test Cases"]),
    create=extend_schema(tags=["Business Test Cases"]),
)
class BusinessTestCaseListCreateView(generics.ListCreateAPIView):
    """List and create business test cases for a project."""
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = BusinessTestCaseFilter
    search_fields = ["title", "tc_id", "module", "sub_module"]
    ordering_fields = ["tc_id", "title", "priority", "created_at"]
    ordering = ["module", "tc_id"]

    def get_queryset(self):
        return BusinessTestCase.objects.filter(
            project_id=self.kwargs["project_id"],
            project__owner=self.request.user,
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BusinessTestCaseCreateSerializer
        return BusinessTestCaseSerializer

    def perform_create(self, serializer):
        project = Project.objects.get(
            id=self.kwargs["project_id"],
            owner=self.request.user,
        )
        serializer.save(project=project)


@extend_schema_view(
    retrieve=extend_schema(tags=["Business Test Cases"]),
    update=extend_schema(tags=["Business Test Cases"]),
    partial_update=extend_schema(tags=["Business Test Cases"]),
    destroy=extend_schema(tags=["Business Test Cases"]),
)
class BusinessTestCaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a business test case."""
    serializer_class = BusinessTestCaseSerializer

    def get_queryset(self):
        return BusinessTestCase.objects.filter(project__owner=self.request.user)


class ExcelImportView(generics.CreateAPIView):
    """Import business test cases from an Excel file."""
    serializer_class = ExcelImportSerializer

    @extend_schema(tags=["Business Test Cases"])
    def create(self, request, project_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = Project.objects.get(id=project_id, owner=request.user)
        file = serializer.validated_data["file"]
        group_id = serializer.validated_data.get("group_id")
        group_name = serializer.validated_data.get("group_name")

        group = None
        if group_id:
            try:
                group = TestCaseGroup.objects.get(id=group_id, project=project)
            except TestCaseGroup.DoesNotExist:
                return Response({"error": "Specified group not found in this project."}, status=status.HTTP_404_NOT_FOUND)
        elif group_name:
            group, _ = TestCaseGroup.objects.get_or_create(
                project=project,
                name=group_name,
                defaults={"description": f"Created automatically during Excel import of {file.name}"}
            )

        result = parse_excel(file, project, group=group)

        return Response(result, status=status.HTTP_200_OK)


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


class SingleGenerateAutomationView(generics.CreateAPIView):
    """Generate automated test case for a single business case synchronously."""

    @extend_schema(tags=["Business Test Cases"])
    def create(self, request, pk):
        from .services import generate_automation_for_business_case
        try:
            business_tc = BusinessTestCase.objects.get(id=pk, project__owner=request.user)
        except BusinessTestCase.DoesNotExist:
            return Response({"error": "Business test case not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            auto_tc = generate_automation_for_business_case(business_tc)
            if auto_tc:
                from .serializers import AutomationTestCaseDetailSerializer
                serializer = AutomationTestCaseDetailSerializer(auto_tc)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"AI step generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"error": "AI generation failed or is disabled."}, status=status.HTTP_400_BAD_REQUEST)


class GroupBulkGenerateAutomationView(generics.CreateAPIView):
    """Bulk generate automated test cases for a group of business test cases in background."""

    @extend_schema(tags=["TestCase Groups"])
    def create(self, request, pk):
        from .tasks import generate_automation_for_cases_task
        try:
            group = TestCaseGroup.objects.get(id=pk, project__owner=request.user)
        except TestCaseGroup.DoesNotExist:
            return Response({"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND)

        test_case_ids = list(group.test_cases.values_list("id", flat=True))
        if not test_case_ids:
            return Response({"error": "Group contains no test cases."}, status=status.HTTP_400_BAD_REQUEST)

        task = generate_automation_for_cases_task.delay(test_case_ids)
        return Response({
            "message": f"Bulk automation generation started for {len(test_case_ids)} test cases.",
            "task_id": task.id
        }, status=status.HTTP_202_ACCEPTED)


class ProjectBulkGenerateAutomationView(generics.CreateAPIView):
    """Bulk generate automated test cases from a list of business case IDs in background."""

    @extend_schema(tags=["Business Test Cases"])
    def create(self, request, project_id):
        from .tasks import generate_automation_for_cases_task
        test_case_ids = request.data.get("test_case_ids", [])
        if not test_case_ids:
            return Response({"error": "No test case IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify ownership/existence
        valid_ids = list(BusinessTestCase.objects.filter(
            id__in=test_case_ids,
            project_id=project_id,
            project__owner=request.user
        ).values_list("id", flat=True))

        if not valid_ids:
            return Response({"error": "No valid test cases found for the given IDs in this project."}, status=status.HTTP_400_BAD_REQUEST)

        task = generate_automation_for_cases_task.delay(valid_ids)
        return Response({
            "message": f"Bulk automation generation started for {len(valid_ids)} test cases.",
            "task_id": task.id
        }, status=status.HTTP_202_ACCEPTED)


class TestCaseGroupAddTestCasesView(generics.CreateAPIView):
    """Add business test cases to a group."""

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
        valid_cases = BusinessTestCase.objects.filter(id__in=test_case_ids, project=group.project)
        group.test_cases.add(*valid_cases)

        return Response({"message": f"Successfully added {valid_cases.count()} test cases to group."})


