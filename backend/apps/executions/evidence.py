"""
Evidence collection service.
"""
import os
import json
import logging
from pathlib import Path
from .models import Artifact
from core.utils import get_artifact_dir

logger = logging.getLogger(__name__)


class EvidenceCollector:
    """Collect and store execution evidence (screenshots, logs, etc.)."""

    @staticmethod
    def save_screenshot(execution_run, step_result, file_path):
        """Save a screenshot artifact."""
        if not file_path or not os.path.exists(file_path):
            return None

        file_size = os.path.getsize(file_path)
        file_name = os.path.basename(file_path)

        artifact = Artifact.objects.create(
            execution_run=execution_run,
            artifact_type="screenshot",
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            step_result=step_result,
        )
        return artifact

    @staticmethod
    def save_console_logs(execution_run, logs_json):
        """Save console logs as an artifact."""
        artifact_dir = get_artifact_dir(str(execution_run.id))
        file_path = os.path.join(artifact_dir, "console_logs.json")

        with open(file_path, "w") as f:
            f.write(logs_json)

        artifact = Artifact.objects.create(
            execution_run=execution_run,
            artifact_type="console_log",
            file_path=file_path,
            file_name="console_logs.json",
            file_size=os.path.getsize(file_path),
        )
        return artifact

    @staticmethod
    def save_network_logs(execution_run, logs_json):
        """Save network logs as an artifact."""
        artifact_dir = get_artifact_dir(str(execution_run.id))
        file_path = os.path.join(artifact_dir, "network_logs.json")

        with open(file_path, "w") as f:
            f.write(logs_json)

        artifact = Artifact.objects.create(
            execution_run=execution_run,
            artifact_type="network_log",
            file_path=file_path,
            file_name="network_logs.json",
            file_size=os.path.getsize(file_path),
        )
        return artifact

    @staticmethod
    def save_timeline(execution_run, step_results_data):
        """Save execution timeline as an artifact."""
        artifact_dir = get_artifact_dir(str(execution_run.id))
        file_path = os.path.join(artifact_dir, "timeline.json")

        timeline = {
            "run_id": str(execution_run.id),
            "started_at": execution_run.started_at.isoformat() if execution_run.started_at else None,
            "finished_at": execution_run.finished_at.isoformat() if execution_run.finished_at else None,
            "steps": step_results_data,
        }

        with open(file_path, "w") as f:
            json.dump(timeline, f, indent=2)

        artifact = Artifact.objects.create(
            execution_run=execution_run,
            artifact_type="timeline",
            file_path=file_path,
            file_name="timeline.json",
            file_size=os.path.getsize(file_path),
        )
        return artifact

    @staticmethod
    def save_video(execution_run):
        """Find the recorded webm video in the artifact directory and save it as an artifact."""
        artifact_dir = get_artifact_dir(str(execution_run.id))
        # Scan for any .webm file inside the directory
        if not os.path.exists(artifact_dir):
            return None

        for file in os.listdir(artifact_dir):
            if file.endswith(".webm"):
                file_path = os.path.join(artifact_dir, file)
                file_size = os.path.getsize(file_path)
                
                # Check if it already exists to avoid duplicates
                existing = Artifact.objects.filter(execution_run=execution_run, artifact_type="video")
                if existing.exists():
                    return existing.first()
                
                artifact = Artifact.objects.create(
                    execution_run=execution_run,
                    artifact_type="video",
                    file_path=file_path,
                    file_name=file,
                    file_size=file_size,
                )
                logger.info("Video artifact saved: %s", file)
                return artifact
        return None
