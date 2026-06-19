"""
Recorder service - CDP-based action capture.
"""
import asyncio
import logging
import json
import uuid
from django.core.cache import cache

logger = logging.getLogger(__name__)


class RecorderService:
    """Service for browser action recording via CDP."""

    RECORDING_PREFIX = "recorder_session_"
    RECORDING_TTL = 600  # 10 minutes

    @staticmethod
    def create_session():
        """Create a new recording session."""
        session_id = str(uuid.uuid4())
        cache.set(
            f"{RecorderService.RECORDING_PREFIX}{session_id}",
            {"status": "created", "steps": [], "url": ""},
            RecorderService.RECORDING_TTL,
        )
        return session_id

    @staticmethod
    def get_session(session_id):
        """Get recording session data."""
        return cache.get(f"{RecorderService.RECORDING_PREFIX}{session_id}")

    @staticmethod
    def update_session(session_id, data):
        """Update recording session data."""
        cache.set(
            f"{RecorderService.RECORDING_PREFIX}{session_id}",
            data,
            RecorderService.RECORDING_TTL,
        )

    @staticmethod
    def delete_session(session_id):
        """Delete a recording session."""
        cache.delete(f"{RecorderService.RECORDING_PREFIX}{session_id}")
