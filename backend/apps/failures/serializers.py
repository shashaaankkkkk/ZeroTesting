"""
Failure serializers.
"""
from rest_framework import serializers
from .models import FailureRecord


class FailureRecordSerializer(serializers.ModelSerializer):
    """Failure record serializer."""
    test_case_name = serializers.CharField(source="test_case.name", read_only=True)
    environment_name = serializers.CharField(source="environment.name", read_only=True)
    execution_run_id = serializers.UUIDField(source="execution_run.id", read_only=True)
    failed_step_order = serializers.IntegerField(source="failed_step.order", read_only=True, default=None)

    class Meta:
        model = FailureRecord
        fields = [
            "id", "project", "execution_run_id",
            "test_case", "test_case_name",
            "environment", "environment_name",
            "failed_step", "failed_step_order",
            "expected_result", "actual_result",
            "screenshot_path", "console_logs", "network_logs",
            "status", "notes", "ai_summary",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "project", "execution_run_id", "test_case",
            "environment", "failed_step", "expected_result",
            "actual_result", "screenshot_path", "console_logs",
            "network_logs", "created_at",
        ]


class FailureUpdateSerializer(serializers.ModelSerializer):
    """Update failure status and notes only."""

    class Meta:
        model = FailureRecord
        fields = ["status", "notes"]
