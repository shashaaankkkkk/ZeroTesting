"""
Object Repository serializers.
"""
from rest_framework import serializers
from .models import ObjectRepository


class ObjectRepositorySerializer(serializers.ModelSerializer):
    """Object repository serializer."""
    playwright_locator = serializers.SerializerMethodField()
    usage_count = serializers.SerializerMethodField()

    class Meta:
        model = ObjectRepository
        fields = [
            "id", "name", "element_type", "locator_strategy",
            "locator_value", "playwright_locator", "description",
            "page_url", "usage_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_playwright_locator(self, obj):
        return obj.get_playwright_locator()

    def get_usage_count(self, obj):
        return obj.used_in_steps.count()
