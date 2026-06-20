"""
Business Test Case and Automation Test Case models.
"""
from django.db import models
from core.mixins import BaseModel
from apps.projects.models import Project


class AutomationTestCase(BaseModel):
    """Automation test case."""

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        RECORDER = "recorder", "Recorder"
        AI = "ai", "AI Generated"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="automation_test_cases",
    )
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
    )

    class Meta:
        db_table = "automation_test_cases"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class AutomationStep(BaseModel):
    """A single step in an automation test case."""

    class Action(models.TextChoices):
        NAVIGATE = "navigate", "Navigate"
        CLICK = "click", "Click"
        FILL = "fill", "Fill"
        SELECT = "select", "Select"
        UPLOAD = "upload", "Upload"
        WAIT = "wait", "Wait"
        VERIFY_TEXT = "verify_text", "Verify Text"
        VERIFY_URL = "verify_url", "Verify URL"
        VERIFY_ELEMENT = "verify_element", "Verify Element"
        SCREENSHOT = "screenshot", "Take Screenshot"

    test_case = models.ForeignKey(
        AutomationTestCase,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    order = models.PositiveIntegerField()
    action = models.CharField(max_length=20, choices=Action.choices)
    target = models.CharField(max_length=500, null=True, blank=True)
    value = models.CharField(max_length=1000, null=True, blank=True)
    object_ref = models.ForeignKey(
        "objects.ObjectRepository",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="used_in_steps",
    )
    description = models.CharField(max_length=500, blank=True, default="")
    wait_timeout = models.IntegerField(default=30000, help_text="Timeout in milliseconds")

    class Meta:
        db_table = "automation_steps"
        ordering = ["order"]
        unique_together = ["test_case", "order"]

    def __str__(self):
        return f"Step {self.order}: {self.action}"

    def get_resolved_target(self):
        """Resolve the target: object_ref takes precedence over raw target."""
        if self.object_ref:
            return self.object_ref.get_playwright_locator()
        return self.target


class TestCaseGroup(BaseModel):
    """Group of test cases for batch execution or organization."""

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="test_case_groups",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    test_cases = models.ManyToManyField(
        AutomationTestCase,
        related_name="test_case_groups",
        blank=True,
    )

    class Meta:
        db_table = "test_case_groups"
        ordering = ["-created_at"]
        unique_together = ["project", "name"]

    def __str__(self):
        return f"{self.name} ({self.project.name})"


