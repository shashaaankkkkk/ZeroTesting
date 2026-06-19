"""
Business Test Case and Automation Test Case models.
"""
from django.db import models
from core.mixins import BaseModel
from apps.projects.models import Project


class BusinessTestCase(BaseModel):
    """Business test case imported from Excel or created manually."""

    class Priority(models.TextChoices):
        CRITICAL = "critical", "Critical"
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DRAFT = "draft", "Draft"
        DEPRECATED = "deprecated", "Deprecated"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="business_test_cases",
    )
    module = models.CharField(max_length=200)
    sub_module = models.CharField(max_length=200, blank=True, default="")
    tc_id = models.CharField(max_length=50)
    title = models.CharField(max_length=500)
    preconditions = models.TextField(blank=True, default="")
    steps = models.TextField()
    expected_result = models.TextField()
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    source_file = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = "business_test_cases"
        ordering = ["module", "sub_module", "tc_id"]
        unique_together = ["project", "tc_id"]

    def __str__(self):
        return f"{self.tc_id} - {self.title}"


class AutomationTestCase(BaseModel):
    """Automation test case that maps to a business test case."""

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        RECORDER = "recorder", "Recorder"
        AI = "ai", "AI Generated"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="automation_test_cases",
    )
    business_test_case = models.ForeignKey(
        BusinessTestCase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="automation_mappings",
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
