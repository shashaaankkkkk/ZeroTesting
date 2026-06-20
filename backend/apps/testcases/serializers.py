"""
Test case serializers.
"""
from rest_framework import serializers
from .models import AutomationTestCase, AutomationStep


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

    class Meta:
        model = AutomationTestCase
        fields = [
            "id", "name", "description", "tags", "is_active",
            "source", "step_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_step_count(self, obj):
        return obj.steps.count()


class AutomationTestCaseDetailSerializer(serializers.ModelSerializer):
    """Automation test case detail with nested steps."""
    steps = AutomationStepSerializer(many=True, read_only=True)

    class Meta:
        model = AutomationTestCase
        fields = [
            "id", "name", "description", "tags", "is_active",
            "source", "steps", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AutomationTestCaseCreateSerializer(serializers.ModelSerializer):
    """Create automation test case with optional steps."""
    steps = AutomationStepSerializer(many=True, required=False)

    class Meta:
        model = AutomationTestCase
        fields = [
            "name", "description", "tags", "is_active",
            "source", "steps",
        ]

    def create(self, validated_data):
        steps_data = validated_data.pop("steps", [])
        project_id = self.context["view"].kwargs.get("project_id")
        validated_data["project_id"] = project_id

        test_case = AutomationTestCase.objects.create(**validated_data)

        # Create steps if provided
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
    test_cases = AutomationTestCaseListSerializer(many=True, read_only=True)

    class Meta:
        model = TestCaseGroup
        fields = ["id", "name", "description", "test_cases", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TestCaseGroupCreateUpdateSerializer(serializers.ModelSerializer):
    """Create/Update serializer for test case groups."""
    test_case_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=AutomationTestCase.objects.all(),
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


