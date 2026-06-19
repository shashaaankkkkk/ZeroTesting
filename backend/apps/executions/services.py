"""
Execution service layer.
"""
import logging
from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

from .models import ExecutionRun

logger = logging.getLogger(__name__)


class ExecutionService:
    """Service for execution operations."""

    @staticmethod
    def trigger_execution(user, test_case_id, environment_id):
        """Create an execution run and dispatch to Celery."""
        from apps.testcases.models import AutomationTestCase
        from apps.projects.models import Environment
        from .tasks import execute_test_task

        test_case = AutomationTestCase.objects.get(id=test_case_id, project__owner=user)
        environment = Environment.objects.get(id=environment_id, project=test_case.project)

        run = ExecutionRun.objects.create(
            project=test_case.project,
            test_case=test_case,
            environment=environment,
            triggered_by=user,
            status=ExecutionRun.Status.PENDING,
        )

        # Dispatch to Celery
        task = execute_test_task.delay(str(run.id))
        run.celery_task_id = task.id
        run.save()

        logger.info("Execution triggered: run=%s, task=%s", run.id, task.id)
        return run

    @staticmethod
    def cancel_execution(run):
        """Cancel a running execution."""
        from config.celery import app

        if run.celery_task_id and run.status in ("pending", "running"):
            app.control.revoke(run.celery_task_id, terminate=True)
            run.status = ExecutionRun.Status.CANCELLED
            run.finished_at = timezone.now()
            run.save()
            return True
        return False

    @staticmethod
    def get_dashboard_stats(user):
        """Get aggregated dashboard stats for a user."""
        runs = ExecutionRun.objects.filter(project__owner=user)
        total = runs.count()
        passed = runs.filter(status="passed").count()
        failed = runs.filter(status="failed").count()

        return {
            "total_projects": user.projects.filter(is_active=True).count(),
            "total_test_cases": sum(
                p.automation_test_cases.filter(is_active=True).count()
                for p in user.projects.filter(is_active=True)
            ),
            "total_executions": total,
            "pass_rate": round(passed / total * 100, 1) if total > 0 else 0,
            "failed_runs": failed,
        }

    @staticmethod
    def get_execution_trends(user, days=30):
        """Get execution trends over the last N days."""
        since = timezone.now() - timedelta(days=days)
        runs = ExecutionRun.objects.filter(
            project__owner=user,
            created_at__gte=since,
        ).annotate(
            date=TruncDate("created_at")
        ).values("date").annotate(
            total=Count("id"),
            passed=Count("id", filter=Q(status="passed")),
            failed=Count("id", filter=Q(status="failed")),
        ).order_by("date")

        return list(runs)

    @staticmethod
    def get_recent_executions(user, limit=10):
        """Get recent execution runs."""
        return ExecutionRun.objects.filter(
            project__owner=user
        ).select_related(
            "test_case", "environment", "project"
        ).order_by("-created_at")[:limit]

    @staticmethod
    def get_recent_failures(user, limit=10):
        """Get recent failed execution runs."""
        return ExecutionRun.objects.filter(
            project__owner=user,
            status__in=["failed", "error"],
        ).select_related(
            "test_case", "environment", "project"
        ).order_by("-created_at")[:limit]
