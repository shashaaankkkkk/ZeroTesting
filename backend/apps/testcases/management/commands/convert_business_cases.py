from django.core.management.base import BaseCommand
from apps.testcases.models import BusinessTestCase, AutomationTestCase, AutomationStep
from apps.ai.services import GeminiService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Bulk convert all manual business test cases to structured automation tests using Gemini AI"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-generate automation test cases even if they already exist",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting bulk conversion of business test cases to automation..."))

        business_cases = BusinessTestCase.objects.select_related("project").all()
        total = business_cases.count()
        self.stdout.write(f"Found {total} business test cases.")

        success_count = 0
        skipped_count = 0
        failed_count = 0

        for idx, tc in enumerate(business_cases, 1):
            self.stdout.write(f"[{idx}/{total}] Processing TC: {tc.tc_id} - {tc.title}...")

            # Check if automation mapping already exists
            existing_automations = AutomationTestCase.objects.filter(business_test_case=tc)
            if existing_automations.exists() and not options["force"]:
                self.stdout.write(self.style.WARNING(f"  Skipping: Automation test case already exists (use --force to overwrite)"))
                skipped_count += 1
                continue

            # Format natural language description for Gemini
            nl_input = f"""
Title: {tc.title}
Module: {tc.module} / {tc.sub_module}
Preconditions: {tc.preconditions}
Manual Steps:
{tc.steps}
Expected Result: {tc.expected_result}
"""
            context = f"Project name: {tc.project.name}. Description: {tc.project.description}"

            try:
                # Call Gemini to generate steps
                self.stdout.write("  Calling Gemini to generate structured automation steps...")
                steps_json = GeminiService.generate_test_steps(nl_input, context=context)

                if not steps_json or not isinstance(steps_json, list):
                    self.stdout.write(self.style.ERROR(f"  Failed: Gemini returned invalid steps format: {steps_json}"))
                    failed_count += 1
                    continue

                # Delete existing automation test cases if force
                if existing_automations.exists():
                    self.stdout.write("  Deleting existing automation test case...")
                    existing_automations.delete()

                # Create AutomationTestCase
                auto_tc = AutomationTestCase.objects.create(
                    project=tc.project,
                    business_test_case=tc,
                    name=f"Auto - {tc.title}",
                    description=f"AI-generated from business test case {tc.tc_id}. Preconditions: {tc.preconditions}",
                    source=AutomationTestCase.Source.AI,
                    is_active=True
                )

                # Create AutomationSteps
                for order_idx, step_data in enumerate(steps_json, 1):
                    # Ensure action is valid
                    action = step_data.get("action", "wait")
                    if action not in [choice[0] for choice in AutomationStep.Action.choices]:
                        action = "wait"

                    AutomationStep.objects.create(
                        test_case=auto_tc,
                        order=order_idx,
                        action=action,
                        target=step_data.get("target", ""),
                        value=step_data.get("value", ""),
                        description=step_data.get("description", f"Step {order_idx}")
                    )

                self.stdout.write(self.style.SUCCESS(f"  Successfully created Automation Test: '{auto_tc.name}' with {len(steps_json)} steps."))
                success_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Error converting test case {tc.tc_id}: {str(e)}"))
                failed_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nConversion Completed!\n"
            f"Successfully created: {success_count}\n"
            f"Skipped (already exists): {skipped_count}\n"
            f"Failed: {failed_count}"
        ))
