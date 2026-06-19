"""
Test Data model.
"""
from django.db import models
from core.mixins import BaseModel
from apps.projects.models import Project


class TestData(BaseModel):
    """Reusable test data: static values or dynamic generators."""

    class DataType(models.TextChoices):
        STATIC = "static", "Static"
        DYNAMIC = "dynamic", "Dynamic"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="test_data",
    )
    key = models.CharField(max_length=200)
    value = models.CharField(max_length=1000, blank=True, default="")
    data_type = models.CharField(
        max_length=10,
        choices=DataType.choices,
        default=DataType.STATIC,
    )
    generator = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Generator function name for dynamic data (e.g., random_email)",
    )
    description = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        db_table = "test_data"
        ordering = ["key"]
        unique_together = ["project", "key"]

    def __str__(self):
        return f"{self.key}: {self.value}"
