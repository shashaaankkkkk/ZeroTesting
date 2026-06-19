"""
Project and Environment serializers.
"""
from rest_framework import serializers
from .models import Project, Environment


class EnvironmentSerializer(serializers.ModelSerializer):
    """Environment serializer."""

    class Meta:
        model = Environment
        fields = [
            "id", "name", "base_url", "env_type", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProjectListSerializer(serializers.ModelSerializer):
    """Project list serializer with summary counts."""
    environment_count = serializers.IntegerField(read_only=True, default=0)
    test_case_count = serializers.IntegerField(read_only=True, default=0)
    execution_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "is_active",
            "environment_count", "test_case_count", "execution_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProjectDetailSerializer(serializers.ModelSerializer):
    """Project detail serializer with nested environments."""
    environments = EnvironmentSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "is_active",
            "environments", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Project creation serializer."""

    class Meta:
        model = Project
        fields = ["name", "description"]

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)

    def validate_name(self, value):
        user = self.context["request"].user
        if Project.objects.filter(owner=user, name=value).exists():
            raise serializers.ValidationError("You already have a project with this name.")
        return value
