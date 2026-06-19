"""
Report service layer.
"""
import logging
from .models import Report
from .generators import generate_csv_report, generate_pdf_report

logger = logging.getLogger(__name__)


class ReportService:
    """Service for report generation."""

    @staticmethod
    def generate_report(project, user, report_type, format_type, filters=None):
        """Generate a report and save the record."""
        if format_type == "csv":
            result = generate_csv_report(project, filters, report_type)
        else:
            result = generate_pdf_report(project, filters, report_type)

        report = Report.objects.create(
            project=project,
            name=result["file_name"],
            report_type=report_type,
            format=format_type,
            file_path=result["file_path"],
            filters=filters or {},
            generated_by=user,
            total_runs=result["total_runs"],
            pass_rate=result["pass_rate"],
        )

        logger.info("Report generated: %s", report.id)
        return report
