"""
Celery tasks for test execution.
"""
import asyncio
import logging
from datetime import datetime
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0, time_limit=600)
def execute_test_task(self, execution_run_id):
    """Execute an automation test case asynchronously."""
    from .models import ExecutionRun, ExecutionStepResult
    from .engine import PlaywrightEngine
    from .evidence import EvidenceCollector
    from apps.failures.services import FailureService

    try:
        run = ExecutionRun.objects.select_related(
            "test_case", "environment", "project"
        ).get(id=execution_run_id)

        # Update status
        run.status = ExecutionRun.Status.RUNNING
        run.started_at = timezone.now()
        run.celery_task_id = self.request.id
        run.save()

        # Get steps
        steps = run.test_case.steps.all().order_by("order")
        run.total_steps = steps.count()
        run.save()

        if not steps.exists():
            run.status = ExecutionRun.Status.ERROR
            run.error_message = "No steps defined for this test case."
            run.finished_at = timezone.now()
            run.save()
            return

        # Execute
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            results = loop.run_until_complete(
                _run_steps(run, steps)
            )
        finally:
            loop.close()

        # Calculate results
        passed = sum(1 for r in results if r["status"] == "passed")
        failed = sum(1 for r in results if r["status"] == "failed")

        run.passed_steps = passed
        run.failed_steps = failed
        run.status = ExecutionRun.Status.PASSED if failed == 0 else ExecutionRun.Status.FAILED
        run.finished_at = timezone.now()
        run.duration_ms = int((run.finished_at - run.started_at).total_seconds() * 1000)
        run.save()

        # Create failure record if failed
        if failed > 0:
            FailureService.create_from_execution(run)

        logger.info(
            "Execution run %s completed: %s (%d/%d passed)",
            run.id, run.status, passed, run.total_steps,
        )

    except Exception as e:
        logger.exception("Execution task failed: %s", e)
        try:
            run = ExecutionRun.objects.get(id=execution_run_id)
            run.status = ExecutionRun.Status.ERROR
            run.error_message = str(e)
            run.finished_at = timezone.now()
            if run.started_at:
                run.duration_ms = int((run.finished_at - run.started_at).total_seconds() * 1000)
            run.save()
        except Exception:
            pass


async def _run_steps(run, steps):
    """Run all steps using PlaywrightEngine."""
    from .models import ExecutionStepResult
    from .engine import PlaywrightEngine
    from .evidence import EvidenceCollector

    engine = PlaywrightEngine(run, run.environment)
    results = []

    try:
        await engine.setup()

        failed = False
        for step in steps:
            if failed:
                # Skip remaining steps after first failure
                step_result = ExecutionStepResult.objects.create(
                    execution_run=run,
                    step=step,
                    order=step.order,
                    status=ExecutionStepResult.Status.SKIPPED,
                    action=step.action,
                    target=step.get_resolved_target() or "",
                )
                results.append({"status": "skipped", "order": step.order})
                continue

            result = await engine.execute_step(step)

            # Save step result
            step_result = ExecutionStepResult.objects.create(
                execution_run=run,
                step=step,
                order=step.order,
                status=result["status"],
                action=result["action"],
                target=result["target"],
                expected=result.get("expected", ""),
                actual=result.get("actual", ""),
                error_message=result.get("error_message", ""),
                screenshot_path=result.get("screenshot_path"),
                duration_ms=result.get("duration_ms", 0),
            )

            # Save screenshot artifact
            if result.get("screenshot_path"):
                EvidenceCollector.save_screenshot(run, step_result, result["screenshot_path"])

            results.append(result)

            if result["status"] == "failed":
                failed = True

        # Save logs
        EvidenceCollector.save_console_logs(run, engine.get_console_logs())
        EvidenceCollector.save_network_logs(run, engine.get_network_logs())
        EvidenceCollector.save_timeline(run, [
            {"order": r.get("order", i), "status": r["status"], "duration_ms": r.get("duration_ms", 0)}
            for i, r in enumerate(results)
        ])

    finally:
        await engine.teardown()

    # Save video after context teardown flushes the file to disk
    try:
        EvidenceCollector.save_video(run)
    except Exception as e:
        logger.warning("Failed to save video artifact: %s", e)

    return results
