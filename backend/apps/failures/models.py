"""
Failure Record model.
"""
from django.db import models
from core.mixins import BaseModel
from apps.projects.models import Project, Environment
from apps.testcases.models import AutomationTestCase
from apps.executions.models import ExecutionRun, ExecutionStepResult


class FailureRecord(BaseModel):
    """Record of a test failure."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        INVESTIGATING = "investigating", "Investigating"
        FIXED = "fixed", "Fixed"
        CLOSED = "closed", "Closed"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="failures",
    )
    execution_run = models.ForeignKey(
        ExecutionRun,
        on_delete=models.CASCADE,
        related_name="failure_records",
    )
    test_case = models.ForeignKey(
        AutomationTestCase,
        on_delete=models.CASCADE,
        related_name="failures",
    )
    environment = models.ForeignKey(
        Environment,
        on_delete=models.CASCADE,
        related_name="failures",
    )
    failed_step = models.ForeignKey(
        ExecutionStepResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="failure_records",
    )
    expected_result = models.TextField()
    actual_result = models.TextField()
    screenshot_path = models.CharField(max_length=500, null=True, blank=True)
    console_logs = models.TextField(blank=True, default="")
    network_logs = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    notes = models.TextField(blank=True, default="")
    ai_summary = models.TextField(blank=True, default="")

    class Meta:
        db_table = "failure_records"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Failure: {self.test_case.name} - {self.status}"
