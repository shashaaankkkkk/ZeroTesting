"""
Execution models.
"""
from django.conf import settings
from django.db import models
from core.mixins import BaseModel
from apps.projects.models import Project, Environment
from apps.testcases.models import AutomationTestCase, AutomationStep


class ExecutionRun(BaseModel):
    """A single execution run of an automation test case."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"
        ERROR = "error", "Error"
        CANCELLED = "cancelled", "Cancelled"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="execution_runs",
    )
    test_case = models.ForeignKey(
        AutomationTestCase,
        on_delete=models.CASCADE,
        related_name="execution_runs",
    )
    environment = models.ForeignKey(
        Environment,
        on_delete=models.CASCADE,
        related_name="execution_runs",
    )
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="execution_runs",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.BigIntegerField(null=True, blank=True)
    total_steps = models.IntegerField(default=0)
    passed_steps = models.IntegerField(default=0)
    failed_steps = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    celery_task_id = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "execution_runs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Run {self.id} - {self.test_case.name} ({self.status})"


class ExecutionStepResult(BaseModel):
    """Result of a single step within an execution run."""

    class Status(models.TextChoices):
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"
        ERROR = "error", "Error"
        SKIPPED = "skipped", "Skipped"

    execution_run = models.ForeignKey(
        ExecutionRun,
        on_delete=models.CASCADE,
        related_name="step_results",
    )
    step = models.ForeignKey(
        AutomationStep,
        on_delete=models.CASCADE,
        related_name="execution_results",
    )
    order = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices)
    action = models.CharField(max_length=50)
    target = models.CharField(max_length=500, blank=True, default="")
    expected = models.TextField(blank=True, default="")
    actual = models.TextField(blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    screenshot_path = models.CharField(max_length=500, null=True, blank=True)
    duration_ms = models.IntegerField(default=0)
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "execution_step_results"
        ordering = ["order"]

    def __str__(self):
        return f"Step {self.order}: {self.action} - {self.status}"


class Artifact(BaseModel):
    """File artifact from an execution run."""

    class ArtifactType(models.TextChoices):
        SCREENSHOT = "screenshot", "Screenshot"
        CONSOLE_LOG = "console_log", "Console Log"
        NETWORK_LOG = "network_log", "Network Log"
        VIDEO = "video", "Video"
        TIMELINE = "timeline", "Timeline"
        OTHER = "other", "Other"

    execution_run = models.ForeignKey(
        ExecutionRun,
        on_delete=models.CASCADE,
        related_name="artifacts",
    )
    artifact_type = models.CharField(
        max_length=20,
        choices=ArtifactType.choices,
    )
    file_path = models.CharField(max_length=500)
    file_name = models.CharField(max_length=200)
    file_size = models.BigIntegerField(default=0)
    step_result = models.ForeignKey(
        ExecutionStepResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="artifacts",
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "artifacts"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.artifact_type}: {self.file_name}"
