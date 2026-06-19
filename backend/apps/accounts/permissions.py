"""
Account permissions.
"""
from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Object-level permission: only the owner can access."""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "owner"):
            return obj.owner == request.user
        if hasattr(obj, "project"):
            return obj.project.owner == request.user
        return False
