"""
Report generators (PDF and CSV).
"""
import csv
import io
import os
import logging
from datetime import datetime
from pathlib import Path

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from apps.executions.models import ExecutionRun
from core.utils import ensure_dir

logger = logging.getLogger(__name__)


def generate_csv_report(project, filters=None, report_type="summary"):
    """Generate a CSV report for a project."""
    runs = ExecutionRun.objects.filter(project=project).select_related(
        "test_case", "environment"
    ).order_by("-created_at")

    if filters:
        if filters.get("status"):
            runs = runs.filter(status=filters["status"])
        if filters.get("environment_id"):
            runs = runs.filter(environment_id=filters["environment_id"])

    report_dir = ensure_dir(settings.REPORTS_DIR)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{project.name}_{report_type}_{timestamp}.csv"
    file_path = os.path.join(report_dir, filename)

    with open(file_path, "w", newline="") as f:
        writer = csv.writer(f)

        if report_type == "summary":
            writer.writerow([
                "Run ID", "Test Case", "Environment", "Status",
                "Total Steps", "Passed", "Failed", "Duration (ms)",
                "Started At", "Finished At",
            ])
            for run in runs:
                writer.writerow([
                    str(run.id), run.test_case.name, run.environment.name,
                    run.status, run.total_steps, run.passed_steps,
                    run.failed_steps, run.duration_ms or 0,
                    run.started_at or "", run.finished_at or "",
                ])
        else:  # detailed
            writer.writerow([
                "Run ID", "Test Case", "Environment", "Status",
                "Step Order", "Step Action", "Step Status",
                "Expected", "Actual", "Error", "Duration (ms)",
            ])
            for run in runs:
                for step in run.step_results.all().order_by("order"):
                    writer.writerow([
                        str(run.id), run.test_case.name, run.environment.name,
                        run.status, step.order, step.action, step.status,
                        step.expected, step.actual, step.error_message,
                        step.duration_ms,
                    ])

    total = runs.count()
    passed = runs.filter(status="passed").count()

    return {
        "file_path": file_path,
        "file_name": filename,
        "total_runs": total,
        "pass_rate": round(passed / total * 100, 2) if total > 0 else 0,
    }


def generate_pdf_report(project, filters=None, report_type="summary"):
    """Generate a PDF report for a project."""
    runs = ExecutionRun.objects.filter(project=project).select_related(
        "test_case", "environment"
    ).order_by("-created_at")

    if filters:
        if filters.get("status"):
            runs = runs.filter(status=filters["status"])
        if filters.get("environment_id"):
            runs = runs.filter(environment_id=filters["environment_id"])

    report_dir = ensure_dir(settings.REPORTS_DIR)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{project.name}_{report_type}_{timestamp}.pdf"
    file_path = os.path.join(report_dir, filename)

    doc = SimpleDocTemplate(file_path, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=20,
    )
    elements.append(Paragraph(f"Test Report: {project.name}", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
    elements.append(Paragraph(f"Report Type: {report_type.title()}", styles["Normal"]))
    elements.append(Spacer(1, 10 * mm))

    # Summary stats
    total = runs.count()
    passed = runs.filter(status="passed").count()
    failed = runs.filter(status="failed").count()
    pass_rate = round(passed / total * 100, 1) if total > 0 else 0

    summary_data = [
        ["Total Runs", "Passed", "Failed", "Pass Rate"],
        [str(total), str(passed), str(failed), f"{pass_rate}%"],
    ]
    summary_table = Table(summary_data, colWidths=[100, 100, 100, 100])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 10 * mm))

    # Run details
    elements.append(Paragraph("Execution Runs", styles["Heading2"]))
    run_data = [["Test Case", "Environment", "Status", "Duration", "Date"]]
    for run in runs[:50]:  # Limit to 50 rows
        run_data.append([
            run.test_case.name[:30],
            run.environment.name,
            run.status.upper(),
            f"{(run.duration_ms or 0) / 1000:.1f}s",
            run.created_at.strftime("%Y-%m-%d %H:%M") if run.created_at else "",
        ])

    if len(run_data) > 1:
        run_table = Table(run_data, colWidths=[140, 80, 60, 60, 100])
        run_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ]))
        elements.append(run_table)

    doc.build(elements)

    return {
        "file_path": file_path,
        "file_name": filename,
        "total_runs": total,
        "pass_rate": pass_rate,
    }
