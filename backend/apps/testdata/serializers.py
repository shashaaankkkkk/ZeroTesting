"""
Test Data serializers.
"""
from rest_framework import serializers
from .models import TestData
from .generators import list_generators


class TestDataSerializer(serializers.ModelSerializer):
    """Test data serializer."""

    class Meta:
        model = TestData
        fields = [
            "id", "key", "value", "data_type", "generator",
            "description", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        if attrs.get("data_type") == "dynamic" and not attrs.get("generator"):
            raise serializers.ValidationError({"generator": "Generator is required for dynamic data."})
        if attrs.get("generator") and attrs["generator"] not in list_generators():
            raise serializers.ValidationError(
                {"generator": f"Unknown generator. Available: {', '.join(list_generators())}"}
            )
        return attrs


class GenerateValueSerializer(serializers.Serializer):
    """Generate a dynamic value."""
    generator = serializers.CharField(required=True)
