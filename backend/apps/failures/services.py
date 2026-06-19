"""
Failure service layer.
"""
import logging
from .models import FailureRecord

logger = logging.getLogger(__name__)


class FailureService:
    """Service for failure-related operations."""

    @staticmethod
    def create_from_execution(execution_run):
        """Auto-create a failure record from a failed execution run."""
        failed_steps = execution_run.step_results.filter(status="failed").order_by("order")
        first_failed = failed_steps.first()

        if not first_failed:
            return None

        # Get console/network logs from artifacts
        console_logs = ""
        network_logs = ""
        for artifact in execution_run.artifacts.all():
            if artifact.artifact_type == "console_log":
                try:
                    with open(artifact.file_path, "r") as f:
                        console_logs = f.read()
                except Exception:
                    pass
            elif artifact.artifact_type == "network_log":
                try:
                    with open(artifact.file_path, "r") as f:
                        network_logs = f.read()
                except Exception:
                    pass

        failure = FailureRecord.objects.create(
            project=execution_run.project,
            execution_run=execution_run,
            test_case=execution_run.test_case,
            environment=execution_run.environment,
            failed_step=first_failed,
            expected_result=first_failed.expected or "Step should pass",
            actual_result=first_failed.actual or first_failed.error_message,
            screenshot_path=first_failed.screenshot_path,
            console_logs=console_logs,
            network_logs=network_logs,
            status=FailureRecord.Status.OPEN,
        )

        logger.info("Failure record created: %s for run %s", failure.id, execution_run.id)
        return failure
