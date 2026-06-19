"""
Shared utility functions.
"""
import os
import uuid
from pathlib import Path
from django.conf import settings


def get_upload_path(instance, filename):
    """Generate unique upload path for files."""
    ext = Path(filename).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return os.path.join("uploads", unique_name)


def ensure_dir(path):
    """Ensure a directory exists."""
    Path(path).mkdir(parents=True, exist_ok=True)
    return path


def get_artifact_dir(execution_run_id):
    """Get the artifact directory for an execution run."""
    path = settings.ARTIFACTS_DIR / str(execution_run_id)
    ensure_dir(path)
    return path


def get_screenshot_path(execution_run_id, step_order, filename=None):
    """Get the screenshot path for a step."""
    artifact_dir = get_artifact_dir(execution_run_id)
    if filename is None:
        filename = f"step_{step_order}_{uuid.uuid4().hex[:8]}.png"
    path = artifact_dir / filename
    return str(path)
