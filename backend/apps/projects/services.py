"""
Project service layer.
"""
import logging
from django.db.models import Count, Q
from .models import Project

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for project-related operations."""

    @staticmethod
    def get_user_projects(user):
        """Get all projects for a user with annotated counts."""
        return Project.objects.filter(
            owner=user, is_active=True
        ).annotate(
            environment_count=Count("environments", distinct=True),
            test_case_count=Count("automation_test_cases", distinct=True),
            execution_count=Count("execution_runs", distinct=True),
        )

    @staticmethod
    def get_project_stats(project):
        """Get dashboard stats for a project."""
        from apps.executions.models import ExecutionRun
        from apps.testcases.models import BusinessTestCase, AutomationTestCase
        from apps.failures.models import FailureRecord

        total_business_tests = BusinessTestCase.objects.filter(project=project).count()
        total_automation_tests = AutomationTestCase.objects.filter(project=project, is_active=True).count()
        total_executions = ExecutionRun.objects.filter(project=project).count()
        total_failures = FailureRecord.objects.filter(project=project, status="open").count()

        recent_runs = list(ExecutionRun.objects.filter(project=project).order_by("-created_at")[:10])
        passed_runs = sum(1 for run in recent_runs if run.status == "passed")
        pass_rate = (passed_runs / len(recent_runs) * 100) if len(recent_runs) > 0 else 0

        return {
            "total_business_tests": total_business_tests,
            "total_automation_tests": total_automation_tests,
            "total_executions": total_executions,
            "total_environments": project.environments.filter(is_active=True).count(),
            "open_failures": total_failures,
            "pass_rate": round(pass_rate, 1),
        }
