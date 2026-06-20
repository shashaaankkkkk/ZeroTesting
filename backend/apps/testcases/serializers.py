"""
Test case serializers.
"""
from rest_framework import serializers
from .models import BusinessTestCase, AutomationTestCase, AutomationStep


class BusinessTestCaseSerializer(serializers.ModelSerializer):
    """Business test case serializer."""
    automation_count = serializers.SerializerMethodField()

    class Meta:
        model = BusinessTestCase
        fields = [
            "id", "module", "sub_module", "tc_id", "title",
            "preconditions", "steps", "expected_result",
            "priority", "status", "source_file", "automation_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_automation_count(self, obj):
        return obj.automation_mappings.count()


class BusinessTestCaseCreateSerializer(serializers.ModelSerializer):
    """Create business test case."""

    class Meta:
        model = BusinessTestCase
        fields = [
            "module", "sub_module", "tc_id", "title",
            "preconditions", "steps", "expected_result",
            "priority", "status",
        ]

    def validate_tc_id(self, value):
        project_id = self.context["view"].kwargs.get("project_id")
        if BusinessTestCase.objects.filter(project_id=project_id, tc_id=value).exists():
            if not self.instance:  # Only on create
                raise serializers.ValidationError(f"Test case ID '{value}' already exists in this project.")
        return value


class AutomationStepSerializer(serializers.ModelSerializer):
    """Automation step serializer."""
    object_name = serializers.CharField(source="object_ref.name", read_only=True, default=None)
    resolved_target = serializers.SerializerMethodField()

    class Meta:
        model = AutomationStep
        fields = [
            "id", "order", "action", "target", "value",
            "object_ref", "object_name", "resolved_target",
            "description", "wait_timeout",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_resolved_target(self, obj):
        return obj.get_resolved_target()


class AutomationTestCaseListSerializer(serializers.ModelSerializer):
    """Automation test case list serializer."""
    step_count = serializers.SerializerMethodField()
    business_test_title = serializers.CharField(
        source="business_test_case.title", read_only=True, default=None
    )

    class Meta:
        model = AutomationTestCase
        fields = [
            "id", "name", "description", "tags", "is_active",
            "source", "business_test_case", "business_test_title",
            "step_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_step_count(self, obj):
        return obj.steps.count()


class AutomationTestCaseDetailSerializer(serializers.ModelSerializer):
    """Automation test case detail with nested steps."""
    steps = AutomationStepSerializer(many=True, read_only=True)
    business_test_title = serializers.CharField(
        source="business_test_case.title", read_only=True, default=None
    )
    business_test_case_detail = BusinessTestCaseSerializer(
        source="business_test_case", read_only=True, default=None
    )

    class Meta:
        model = AutomationTestCase
        fields = [
            "id", "name", "description", "tags", "is_active",
            "source", "business_test_case", "business_test_title",
            "business_test_case_detail", "steps", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AutomationTestCaseCreateSerializer(serializers.ModelSerializer):
    """Create automation test case with optional steps."""
    steps = AutomationStepSerializer(many=True, required=False)

    class Meta:
        model = AutomationTestCase
        fields = [
            "name", "description", "tags", "is_active",
            "source", "business_test_case", "steps",
        ]

    def create(self, validated_data):
        steps_data = validated_data.pop("steps", [])
        project_id = self.context["view"].kwargs.get("project_id")
        validated_data["project_id"] = project_id

        source = validated_data.get("source")
        business_tc = validated_data.get("business_test_case")

        test_case = AutomationTestCase.objects.create(**validated_data)

        # Automatically generate steps if source is AI and a business test case is linked
        if source == "ai" and business_tc:
            from apps.ai.feature_flags import is_ai_enabled
            from apps.ai.services import GeminiService
            import logging

            logger = logging.getLogger(__name__)

            if is_ai_enabled():
                nl_input = f"""
Title: {business_tc.title}
Module: {business_tc.module} / {business_tc.sub_module}
Preconditions: {business_tc.preconditions}
Manual Steps:
{business_tc.steps}
Expected Result: {business_tc.expected_result}
"""
                context = f"Project name: {test_case.project.name}. Description: {test_case.project.description}"
                try:
                    steps_json = GeminiService.generate_test_steps(nl_input, context=context)
                    if steps_json and isinstance(steps_json, list):
                        for order_idx, step_data in enumerate(steps_json, 1):
                            action = step_data.get("action", "wait")
                            if action not in [choice[0] for choice in AutomationStep.Action.choices]:
                                action = "wait"

                            AutomationStep.objects.create(
                                test_case=test_case,
                                order=order_idx,
                                action=action,
                                target=step_data.get("target", ""),
                                value=step_data.get("value", ""),
                                description=step_data.get("description", f"Step {order_idx}")
                            )
                except Exception as e:
                    logger.exception("Failed to auto-generate AI steps: %s", e)

        # Fallback to manual steps if provided and not generated by AI
        if not test_case.steps.exists():
            for i, step_data in enumerate(steps_data):
                step_data["order"] = step_data.get("order", i + 1)
                AutomationStep.objects.create(test_case=test_case, **step_data)

        return test_case


class StepReorderSerializer(serializers.Serializer):
    """Reorder steps."""
    step_ids = serializers.ListField(child=serializers.UUIDField())

    def validate_step_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate step IDs found.")
        return value


class ExcelImportSerializer(serializers.Serializer):
    """Excel file upload serializer."""
    file = serializers.FileField()
    group_id = serializers.UUIDField(required=False, allow_null=True)
    group_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_file(self, value):
        if not value.name.endswith((".xlsx", ".xls")):
            raise serializers.ValidationError("Only Excel files (.xlsx, .xls) are supported.")
        if value.size > 10 * 1024 * 1024:  # 10MB limit
            raise serializers.ValidationError("File size must not exceed 10MB.")
        return value


from .models import TestCaseGroup

class TestCaseGroupListSerializer(serializers.ModelSerializer):
    """List serializer for test case groups."""
    test_case_count = serializers.SerializerMethodField()

    class Meta:
        model = TestCaseGroup
        fields = ["id", "name", "description", "test_case_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_test_case_count(self, obj):
        return obj.test_cases.count()


class TestCaseGroupDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for a test case group including nested cases."""
    test_cases = BusinessTestCaseSerializer(many=True, read_only=True)

    class Meta:
        model = TestCaseGroup
        fields = ["id", "name", "description", "test_cases", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TestCaseGroupCreateUpdateSerializer(serializers.ModelSerializer):
    """Create/Update serializer for test case groups."""
    test_case_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=BusinessTestCase.objects.all(),
        source="test_cases",
        required=False,
    )

    class Meta:
        model = TestCaseGroup
        fields = ["name", "description", "test_case_ids"]

    def validate_name(self, value):
        view = self.context.get("view")
        if not view:
            return value
        project_id = view.kwargs.get("project_id")
        qs = TestCaseGroup.objects.filter(project_id=project_id, name__iexact=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError(f"Group with name '{value}' already exists in this project.")
        return value

