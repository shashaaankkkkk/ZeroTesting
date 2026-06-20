"""
Celery tasks for testcase automation generation.
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0, time_limit=900)
def generate_automation_for_cases_task(self, test_case_ids):
    """
    Celery task to bulk generate automation cases from business cases using Gemini AI.
    """
    from apps.testcases.models import BusinessTestCase
    from apps.testcases.services import generate_automation_for_business_case

    success_count = 0
    failed_count = 0
    errors = []

    logger.info("Starting bulk automation generation for %d cases", len(test_case_ids))

    for tc_id in test_case_ids:
        try:
            business_tc = BusinessTestCase.objects.get(id=tc_id)
            logger.info("Generating steps for TC: %s (%s)", business_tc.tc_id, business_tc.title)
            auto_tc = generate_automation_for_business_case(business_tc)
            if auto_tc:
                success_count += 1
            else:
                failed_count += 1
                errors.append(f"TC {business_tc.tc_id}: AI did not return steps or AI is disabled.")
        except Exception as e:
            logger.error("Bulk generation failed for business test case %s: %s", tc_id, e)
            failed_count += 1
            errors.append(f"TC {tc_id}: {str(e)}")

    logger.info("Bulk generation complete. Success: %d, Failed: %d", success_count, failed_count)
    return {
        "success": success_count,
        "failed": failed_count,
        "errors": errors,
    }
