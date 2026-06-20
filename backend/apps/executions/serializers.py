"""
Execution serializers.
"""
from rest_framework import serializers
from .models import ExecutionRun, ExecutionStepResult, Artifact


class ArtifactSerializer(serializers.ModelSerializer):
    """Artifact serializer."""
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Artifact
        fields = [
            "id", "artifact_type", "file_name", "file_size",
            "step_result", "metadata", "download_url", "created_at",
        ]

    def get_download_url(self, obj):
        url = f"/api/v1/artifacts/{obj.id}/download/"
        request = self.context.get("request")
        if request:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                url = f"{url}?token={token}"
        return url


class ExecutionStepResultSerializer(serializers.ModelSerializer):
    """Execution step result serializer."""
    artifacts = ArtifactSerializer(many=True, read_only=True)

    class Meta:
        model = ExecutionStepResult
        fields = [
            "id", "order", "status", "action", "target",
            "expected", "actual", "error_message",
            "screenshot_path", "duration_ms", "artifacts",
            "executed_at",
        ]


class ExecutionRunListSerializer(serializers.ModelSerializer):
    """Execution run list serializer."""
    test_case_name = serializers.CharField(source="test_case.name", read_only=True)
    environment_name = serializers.CharField(source="environment.name", read_only=True)
    triggered_by_name = serializers.CharField(source="triggered_by.email", read_only=True)

    class Meta:
        model = ExecutionRun
        fields = [
            "id", "test_case", "test_case_name",
            "environment", "environment_name",
            "triggered_by_name", "status",
            "started_at", "finished_at", "duration_ms",
            "total_steps", "passed_steps", "failed_steps",
            "created_at",
        ]


class ExecutionRunDetailSerializer(serializers.ModelSerializer):
    """Execution run detail with step results."""
    test_case_name = serializers.CharField(source="test_case.name", read_only=True)
    environment_name = serializers.CharField(source="environment.name", read_only=True)
    environment_url = serializers.CharField(source="environment.base_url", read_only=True)
    triggered_by_name = serializers.CharField(source="triggered_by.email", read_only=True)
    step_results = ExecutionStepResultSerializer(many=True, read_only=True)
    artifacts = ArtifactSerializer(many=True, read_only=True)

    class Meta:
        model = ExecutionRun
        fields = [
            "id", "test_case", "test_case_name",
            "environment", "environment_name", "environment_url",
            "triggered_by_name", "status",
            "started_at", "finished_at", "duration_ms",
            "total_steps", "passed_steps", "failed_steps",
            "error_message", "celery_task_id",
            "step_results", "artifacts",
            "created_at",
        ]


class ExecutionRunStatusSerializer(serializers.ModelSerializer):
    """Lightweight status serializer for polling."""

    class Meta:
        model = ExecutionRun
        fields = [
            "id", "status", "total_steps", "passed_steps",
            "failed_steps", "duration_ms",
        ]


class TriggerExecutionSerializer(serializers.Serializer):
    """Trigger a test execution."""
    test_case_id = serializers.UUIDField()
    environment_id = serializers.UUIDField()
