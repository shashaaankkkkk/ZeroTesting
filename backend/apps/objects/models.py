"""
Object Repository model.
"""
from django.db import models
from core.mixins import BaseModel
from apps.projects.models import Project


class ObjectRepository(BaseModel):
    """Reusable UI element locator."""

    class ElementType(models.TextChoices):
        BUTTON = "button", "Button"
        INPUT = "input", "Input"
        SELECT = "select", "Select"
        LINK = "link", "Link"
        TEXT = "text", "Text"
        IMAGE = "image", "Image"
        CHECKBOX = "checkbox", "Checkbox"
        RADIO = "radio", "Radio"
        OTHER = "other", "Other"

    class LocatorStrategy(models.TextChoices):
        CSS = "css", "CSS Selector"
        XPATH = "xpath", "XPath"
        ID = "id", "ID"
        NAME = "name", "Name"
        TEXT = "text", "Text"
        ROLE = "role", "Role"
        TEST_ID = "test_id", "Test ID (data-testid)"
        PLACEHOLDER = "placeholder", "Placeholder"
        LABEL = "label", "Label"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="object_repository",
    )
    name = models.CharField(max_length=200)
    element_type = models.CharField(
        max_length=20,
        choices=ElementType.choices,
        default=ElementType.OTHER,
    )
    locator_strategy = models.CharField(
        max_length=20,
        choices=LocatorStrategy.choices,
    )
    locator_value = models.CharField(max_length=500)
    description = models.CharField(max_length=500, blank=True, default="")
    page_url = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = "object_repository"
        ordering = ["name"]
        unique_together = ["project", "name"]
        verbose_name_plural = "Object Repository"

    def __str__(self):
        return f"{self.name} ({self.locator_strategy}: {self.locator_value})"

    def get_playwright_locator(self):
        """Return the Playwright-compatible locator string."""
        strategy_map = {
            "css": self.locator_value,
            "xpath": self.locator_value,
            "id": f"#{self.locator_value}",
            "name": f'[name="{self.locator_value}"]',
            "text": f"text={self.locator_value}",
            "role": f'role={self.locator_value}',
            "test_id": f'[data-testid="{self.locator_value}"]',
            "placeholder": f'[placeholder="{self.locator_value}"]',
            "label": f'label={self.locator_value}',
        }
        return strategy_map.get(self.locator_strategy, self.locator_value)
