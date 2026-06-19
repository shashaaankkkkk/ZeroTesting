"""
Report model.
"""
from django.conf import settings
from django.db import models
from core.mixins import BaseModel
from apps.projects.models import Project


class Report(BaseModel):
    """Generated test execution report."""

    class ReportType(models.TextChoices):
        SUMMARY = "summary", "Summary"
        DETAILED = "detailed", "Detailed"

    class Format(models.TextChoices):
        PDF = "pdf", "PDF"
        CSV = "csv", "CSV"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    name = models.CharField(max_length=300)
    report_type = models.CharField(max_length=20, choices=ReportType.choices)
    format = models.CharField(max_length=10, choices=Format.choices)
    file_path = models.CharField(max_length=500)
    filters = models.JSONField(default=dict, blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    total_runs = models.IntegerField(default=0)
    pass_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "reports"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
