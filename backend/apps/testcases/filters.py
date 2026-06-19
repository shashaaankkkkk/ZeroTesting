"""
Test case filters.
"""
import django_filters
from .models import BusinessTestCase, AutomationTestCase


class BusinessTestCaseFilter(django_filters.FilterSet):
    """Filter for business test cases."""
    module = django_filters.CharFilter(lookup_expr="icontains")
    sub_module = django_filters.CharFilter(lookup_expr="icontains")
    tc_id = django_filters.CharFilter(lookup_expr="icontains")
    title = django_filters.CharFilter(lookup_expr="icontains")
    priority = django_filters.ChoiceFilter(choices=BusinessTestCase.Priority.choices)
    status = django_filters.ChoiceFilter(choices=BusinessTestCase.Status.choices)

    class Meta:
        model = BusinessTestCase
        fields = ["module", "sub_module", "tc_id", "title", "priority", "status"]


class AutomationTestCaseFilter(django_filters.FilterSet):
    """Filter for automation test cases."""
    name = django_filters.CharFilter(lookup_expr="icontains")
    source = django_filters.ChoiceFilter(choices=AutomationTestCase.Source.choices)
    is_active = django_filters.BooleanFilter()
    business_test_case = django_filters.UUIDFilter()

    class Meta:
        model = AutomationTestCase
        fields = ["name", "source", "is_active", "business_test_case"]
