"""
Excel parser for business test cases.
"""
import logging
from openpyxl import load_workbook
from .models import BusinessTestCase

logger = logging.getLogger(__name__)

# Expected column mappings (case-insensitive)
COLUMN_MAPPING = {
    "module": ["module"],
    "sub_module": ["sub module", "sub_module", "submodule"],
    "tc_id": ["tc id", "tc_id", "tcid", "test case id", "id"],
    "title": ["title", "test case title", "test case name", "name"],
    "preconditions": ["preconditions", "precondition", "pre-conditions", "prerequisites"],
    "steps": ["steps", "test steps", "step description"],
    "expected_result": ["expected result", "expected_result", "expected", "expected outcome"],
    "priority": ["priority", "severity"],
    "status": ["status", "test status"],
}

PRIORITY_MAPPING = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "med": "medium",
    "low": "low",
    "p0": "critical",
    "p1": "high",
    "p2": "medium",
    "p3": "low",
}


def parse_excel(file, project):
    """
    Parse an Excel file and create BusinessTestCase records.

    Returns:
        dict with 'created', 'skipped', 'errors' counts and details.
    """
    result = {
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "errors": [],
        "total_rows": 0,
    }

    try:
        wb = load_workbook(file, read_only=True, data_only=True)
        ws = wb.active

        if ws is None:
            result["errors"].append("Excel file has no active worksheet.")
            return result

        # Read header row
        headers = []
        for cell in next(ws.iter_rows(min_row=1, max_row=1)):
            headers.append(str(cell.value).strip().lower() if cell.value else "")

        # Map headers to fields
        field_map = {}
        for field, aliases in COLUMN_MAPPING.items():
            for i, header in enumerate(headers):
                if header in aliases:
                    field_map[field] = i
                    break

        # Validate required fields
        required = ["tc_id", "title"]
        missing = [f for f in required if f not in field_map]
        if missing:
            result["errors"].append(f"Missing required columns: {', '.join(missing)}")
            return result

        # Process rows
        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            result["total_rows"] += 1

            try:
                row_data = {}
                for field, col_idx in field_map.items():
                    value = row[col_idx] if col_idx < len(row) else None
                    row_data[field] = str(value).strip() if value else ""

                tc_id = row_data.get("tc_id", "")
                if not tc_id:
                    result["skipped"] += 1
                    continue

                # Normalize priority
                raw_priority = row_data.get("priority", "medium").lower()
                priority = PRIORITY_MAPPING.get(raw_priority, "medium")

                # Normalize status
                raw_status = row_data.get("status", "active").lower()
                status_val = raw_status if raw_status in ("active", "draft", "deprecated") else "active"

                defaults = {
                    "module": row_data.get("module", ""),
                    "sub_module": row_data.get("sub_module", ""),
                    "title": row_data.get("title", ""),
                    "preconditions": row_data.get("preconditions", ""),
                    "steps": row_data.get("steps", ""),
                    "expected_result": row_data.get("expected_result", ""),
                    "priority": priority,
                    "status": status_val,
                    "source_file": file.name if hasattr(file, "name") else "uploaded_file.xlsx",
                }

                obj, created = BusinessTestCase.objects.update_or_create(
                    project=project,
                    tc_id=tc_id,
                    defaults=defaults,
                )

                if created:
                    result["created"] += 1
                else:
                    result["updated"] += 1

            except Exception as e:
                result["errors"].append(f"Row {row_num}: {str(e)}")
                logger.warning("Excel parse error at row %d: %s", row_num, e)

        wb.close()

    except Exception as e:
        result["errors"].append(f"Failed to parse Excel file: {str(e)}")
        logger.exception("Excel parse error")

    return result
