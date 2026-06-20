"""
Playwright execution engine.
"""
import logging
import time
import json
import os
from pathlib import Path
from datetime import datetime

from django.conf import settings
from core.utils import get_artifact_dir, get_screenshot_path

logger = logging.getLogger(__name__)


class PlaywrightEngine:
    """Execute automation test steps using Playwright."""

    def __init__(self, execution_run, environment):
        self.run = execution_run
        self.base_url = environment.base_url
        self.browser = None
        self.context = None
        self.page = None
        self.console_logs = []
        self.network_logs = []
        self.artifact_dir = get_artifact_dir(str(execution_run.id))
        self.is_navigated = False

    async def setup(self):
        """Launch browser and set up page."""
        from playwright.async_api import async_playwright

        self.playwright_manager = async_playwright()
        self.playwright = await self.playwright_manager.__aenter__()
        self.browser = await self.playwright.chromium.launch(
            headless=settings.PLAYWRIGHT_HEADLESS,
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(self.artifact_dir),
        )
        self.page = await self.context.new_page()

        # Capture console logs
        self.page.on("console", lambda msg: self.console_logs.append({
            "type": msg.type,
            "text": msg.text,
            "timestamp": datetime.now().isoformat(),
        }))

        # Capture network requests
        self.page.on("response", lambda res: self.network_logs.append({
            "url": res.url,
            "method": res.request.method,
            "status": res.status,
            "timestamp": datetime.now().isoformat(),
        }))

        self.page.on("requestfailed", lambda req: self.network_logs.append({
            "url": req.url,
            "method": req.method,
            "status": "FAILED",
            "failure": req.failure,
            "timestamp": datetime.now().isoformat(),
        }))

        logger.info("Playwright browser launched for run %s", self.run.id)

    async def teardown(self):
        """Close browser and clean up."""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright_manager:
                await self.playwright_manager.__aexit__(None, None, None)
        except Exception as e:
            logger.warning("Error during teardown: %s", e)

    async def execute_step(self, step):
        """Execute a single automation step and return the result."""
        start_time = time.monotonic()
        result = {
            "status": "passed",
            "action": step.action,
            "target": step.get_resolved_target() or "",
            "expected": "",
            "actual": "",
            "error_message": "",
            "screenshot_path": None,
            "duration_ms": 0,
        }

        try:
            timeout = step.wait_timeout or settings.PLAYWRIGHT_TIMEOUT
            target = step.get_resolved_target()
            value = self._resolve_test_data(step.value) if step.value else ""

            if not self.is_navigated and step.action != "navigate":
                logger.info("First step is not navigate. Performing auto-navigation to base URL: %s", self.base_url)
                await self.page.goto(self.base_url, timeout=timeout)
                self.is_navigated = True

            if step.action == "navigate":
                self.is_navigated = True
                url = value
                if not url.startswith(("http://", "https://")):
                    url = f"{self.base_url.rstrip('/')}/{url.lstrip('/')}"
                await self.page.goto(url, timeout=timeout)
                result["actual"] = f"Navigated to {url}"

            elif step.action == "click":
                await self.page.click(target, timeout=timeout)
                result["actual"] = f"Clicked {target}"

            elif step.action == "fill":
                await self.page.fill(target, value, timeout=timeout)
                result["actual"] = f"Filled {target} with value"

            elif step.action == "select":
                await self.page.select_option(target, value, timeout=timeout)
                result["actual"] = f"Selected {value} from {target}"

            elif step.action == "upload":
                await self.page.set_input_files(target, value, timeout=timeout)
                result["actual"] = f"Uploaded file to {target}"

            elif step.action == "wait":
                wait_ms = int(value) if value else 1000
                await self.page.wait_for_timeout(wait_ms)
                result["actual"] = f"Waited {wait_ms}ms"

            elif step.action == "verify_text":
                element = self.page.locator(target)
                text = await element.text_content(timeout=timeout)
                result["expected"] = value
                result["actual"] = text or ""
                if value and value not in (text or ""):
                    raise AssertionError(f"Expected text '{value}' not found. Got: '{text}'")

            elif step.action == "verify_url":
                current_url = self.page.url
                result["expected"] = value
                result["actual"] = current_url
                if value and value not in current_url:
                    raise AssertionError(f"Expected URL to contain '{value}'. Got: '{current_url}'")

            elif step.action == "verify_element":
                element = self.page.locator(target)
                is_visible = await element.is_visible(timeout=timeout)
                result["expected"] = "Element visible"
                result["actual"] = "Visible" if is_visible else "Not visible"
                if not is_visible:
                    raise AssertionError(f"Element '{target}' is not visible")

            elif step.action == "screenshot":
                screenshot_path = get_screenshot_path(str(self.run.id), step.order)
                await self.page.screenshot(path=screenshot_path, full_page=True)
                result["screenshot_path"] = screenshot_path
                result["actual"] = "Screenshot captured"

            # Always take screenshot after each step for evidence
            step_screenshot = get_screenshot_path(str(self.run.id), step.order, f"step_{step.order}.png")
            await self.page.screenshot(path=step_screenshot)
            result["screenshot_path"] = step_screenshot

        except Exception as e:
            result["status"] = "failed"
            result["error_message"] = str(e)
            result["actual"] = str(e)

            # Capture error screenshot
            try:
                error_screenshot = get_screenshot_path(
                    str(self.run.id), step.order, f"step_{step.order}_error.png"
                )
                await self.page.screenshot(path=error_screenshot)
                result["screenshot_path"] = error_screenshot
            except Exception:
                pass

        result["duration_ms"] = int((time.monotonic() - start_time) * 1000)
        return result

    def _resolve_test_data(self, value):
        """Resolve {{variable}} placeholders with test data."""
        if not value:
            return value

        import re
        from apps.testdata.models import TestData
        from apps.testdata.generators import generate_value

        def replace_match(match):
            key = match.group(1).strip()
            try:
                td = TestData.objects.get(project=self.run.project, key=key)
                if td.data_type == "dynamic" and td.generator:
                    return generate_value(td.generator)
                return td.value
            except TestData.DoesNotExist:
                return match.group(0)

        return re.sub(r"\{\{(\w+)\}\}", replace_match, value)

    def get_console_logs(self):
        """Return collected console logs as JSON string."""
        return json.dumps(self.console_logs, indent=2)

    def get_network_logs(self):
        """Return collected network logs as JSON string."""
        return json.dumps(self.network_logs, indent=2)
