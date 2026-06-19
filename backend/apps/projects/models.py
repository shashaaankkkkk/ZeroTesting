"""
Project and Environment models.
"""
from django.conf import settings
from django.db import models
from core.mixins import BaseModel


class Project(BaseModel):
    """A testing project owned by a user."""
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "projects"
        ordering = ["-created_at"]
        unique_together = ["owner", "name"]

    def __str__(self):
        return self.name


class Environment(BaseModel):
    """An environment (dev, staging, prod) for a project."""

    class EnvType(models.TextChoices):
        DEVELOPMENT = "development", "Development"
        STAGING = "staging", "Staging"
        PRODUCTION = "production", "Production"
        LOCALHOST = "localhost", "Localhost"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="environments",
    )
    name = models.CharField(max_length=100)
    base_url = models.CharField(max_length=500)
    env_type = models.CharField(
        max_length=20,
        choices=EnvType.choices,
        default=EnvType.DEVELOPMENT,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "environments"
        ordering = ["name"]
        unique_together = ["project", "name"]

    def __str__(self):
        return f"{self.project.name} - {self.name}"
