"""
Project filters.
"""
import django_filters
from .models import Project


class ProjectFilter(django_filters.FilterSet):
    """Filter for projects."""
    name = django_filters.CharFilter(lookup_expr="icontains")
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = Project
        fields = ["name", "is_active"]
