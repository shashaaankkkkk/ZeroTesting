"""
Shared model mixins.
"""
import uuid
from django.db import models


class UUIDMixin(models.Model):
    """Adds UUID primary key."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimestampMixin(models.Model):
    """Adds created_at and updated_at timestamps."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseModel(UUIDMixin, TimestampMixin):
    """Base model with UUID primary key and timestamps."""

    class Meta:
        abstract = True
        ordering = ["-created_at"]
