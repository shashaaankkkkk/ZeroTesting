"""
Test case filters.
"""
import django_filters
from .models import AutomationTestCase


class AutomationTestCaseFilter(django_filters.FilterSet):
    """Filter for automation test cases."""
    name = django_filters.CharFilter(lookup_expr="icontains")
    source = django_filters.ChoiceFilter(choices=AutomationTestCase.Source.choices)
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = AutomationTestCase
        fields = ["name", "source", "is_active"]

