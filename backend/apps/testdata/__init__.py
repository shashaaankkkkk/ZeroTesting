"""TestData app config."""
from django.apps import AppConfig


class TestdataConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.testdata"
    verbose_name = "Test Data"
