"""
Feature flags for AI functionality.
"""
from django.conf import settings


def is_ai_enabled():
    """Check if AI integration is enabled."""
    return getattr(settings, "ENABLE_AI", False) and bool(getattr(settings, "GEMINI_API_KEY", ""))
