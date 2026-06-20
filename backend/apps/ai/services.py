"""
Gemini AI service for test step generation and failure analysis.
"""
import logging
import json
from django.conf import settings
from .feature_flags import is_ai_enabled

logger = logging.getLogger(__name__)


class GeminiService:
    """Optional Gemini AI integration."""

    @staticmethod
    def _get_client():
        """Get the Gemini client."""
        if not is_ai_enabled():
            raise RuntimeError("AI integration is not enabled.")

        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        return genai.GenerativeModel("gemini-2.5-flash")

    @classmethod
    def generate_test_steps(cls, natural_language_input, context=""):
        """Convert natural language to structured automation steps with Playwright code."""
        model = cls._get_client()

        prompt = f"""You are a senior QA automation engineer who writes Playwright test scripts.

Convert the following test description into EXECUTABLE automation steps that will run against a real web application using Playwright.

CRITICAL RULES:
1. The FIRST step MUST be a 'navigate' action to load the target URL
2. Use REAL, specific CSS selectors — not placeholder text. Use common patterns like:
   - '#id' for IDs
   - '[name="fieldname"]' for form fields
   - 'button:has-text("Submit")' for buttons with text
   - '[type="email"]', '[type="password"]' for standard inputs
   - '[placeholder="Enter email"]' for placeholder-based selection
   - '.classname' for class-based selectors
   - 'text=Button Text' for Playwright text selectors
3. For 'fill' actions, always provide both a CSS target selector AND a realistic test value
4. For 'click' actions, provide a precise selector that Playwright can resolve
5. For 'verify_text' / 'verify_url' / 'verify_element', provide the expected value or target selector
6. Do NOT use vague descriptions as targets — targets must be valid CSS/Playwright selectors
7. The 'value' for navigate must be the full URL (https://...)

Each step must have:
- action: one of [navigate, click, fill, select, upload, wait, verify_text, verify_url, verify_element, screenshot]
- target: A valid CSS selector or Playwright locator string (empty string for navigate)
- value: The input value (URL for navigate, text for fill, expected text for verify_text)
- description: Human-readable description of what this step does

{f"Application context: {context}" if context else ""}

Test description: {natural_language_input}

Return ONLY a valid JSON array. Example:
[
    {{"action": "navigate", "target": "", "value": "https://app.example.com/login", "description": "Navigate to login page"}},
    {{"action": "fill", "target": "#username", "value": "testuser@company.com", "description": "Enter username"}},
    {{"action": "fill", "target": "#password", "value": "TestPass123!", "description": "Enter password"}},
    {{"action": "click", "target": "button:has-text(\\"Sign In\\")", "description": "Click sign in button"}},
    {{"action": "verify_url", "target": "", "value": "/dashboard", "description": "Verify redirected to dashboard"}},
    {{"action": "verify_element", "target": ".welcome-message", "value": "", "description": "Verify welcome message is visible"}}
]

Return ONLY the JSON array, no markdown formatting, no code fences, no explanation."""

        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                lines = text.split("\n")
                # Remove first and last fence lines
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                text = "\n".join(lines)
                if text.startswith("json"):
                    text = text[4:]
            steps = json.loads(text.strip())

            # Validate & clean steps
            valid_actions = {"navigate", "click", "fill", "select", "upload",
                             "wait", "verify_text", "verify_url", "verify_element", "screenshot"}
            cleaned_steps = []
            for step in steps:
                action = step.get("action", "").lower()
                if action not in valid_actions:
                    continue
                cleaned_steps.append({
                    "action": action,
                    "target": step.get("target", ""),
                    "value": step.get("value", ""),
                    "description": step.get("description", f"{action} step"),
                })

            return cleaned_steps
        except json.JSONDecodeError as e:
            logger.error("Failed to parse AI response as JSON: %s | Response: %s", e, text[:500])
            raise ValueError(f"AI returned invalid JSON. Please try again with a clearer description.")
        except Exception as e:
            logger.error("Gemini step generation failed: %s", e)
            raise

    @classmethod
    def generate_playwright_script(cls, steps, test_name="ai_generated_test"):
        """Generate executable Playwright Python script from structured steps."""
        ACTION_TEMPLATES = {
            "navigate": '    await page.goto("{value}", wait_until="networkidle")',
            "click": "    await page.click('{target}', timeout=30000)",
            "fill": "    await page.fill('{target}', \"{value}\")",
            "select": "    await page.select_option('{target}', \"{value}\")",
            "upload": "    await page.set_input_files('{target}', \"{value}\")",
            "wait": "    await page.wait_for_timeout({value})",
            "verify_text": "    await expect(page.locator('{target}')).to_contain_text(\"{value}\")",
            "verify_url": '    expect(page.url).to_contain("{value}")',
            "verify_element": "    await expect(page.locator('{target}')).to_be_visible()",
            "screenshot": '    await page.screenshot(path="screenshot_{order}.png", full_page=True)',
        }

        sanitized_name = "".join(c if c.isalnum() or c == "_" else "_" for c in test_name.lower()).strip("_")

        lines = [
            '"""',
            f'Auto-generated Playwright test: {test_name}',
            f'Generated by ZeroTesting AI',
            '"""',
            'import asyncio',
            'from playwright.async_api import async_playwright, expect',
            '',
            '',
            f'async def test_{sanitized_name}():',
            '    async with async_playwright() as p:',
            '        browser = await p.chromium.launch(headless=True)',
            '        context = await browser.new_context(viewport={"width": 1920, "height": 1080})',
            '        page = await context.new_page()',
            '',
        ]

        for i, step in enumerate(steps):
            action = step.get("action", "")
            target = step.get("target", "")
            value = step.get("value", "")
            desc = step.get("description", f"Step {i + 1}")

            lines.append(f'        # Step {i + 1}: {desc}')

            template = ACTION_TEMPLATES.get(action, "")
            if template:
                code = template.format(target=target, value=value, order=i + 1)
                lines.append(f'    {code}')
            else:
                lines.append(f'        # Unknown action: {action}')
            lines.append('')

        lines.extend([
            '        await context.close()',
            '        await browser.close()',
            '        print("Test completed successfully!")',
            '',
            '',
            f'if __name__ == "__main__":',
            f'    asyncio.run(test_{sanitized_name}())',
        ])

        return "\n".join(lines)

    @classmethod
    def generate_failure_summary(cls, expected, actual, error_message="", console_logs=""):
        """Generate a concise failure analysis summary."""
        model = cls._get_client()

        prompt = f"""You are a QA expert analyzing a test failure. Provide a concise 2-3 sentence summary 
explaining what went wrong and possible causes.

Expected Result: {expected}
Actual Result: {actual}
Error Message: {error_message}
Console Logs (last 500 chars): {console_logs[-500:] if console_logs else 'None'}

Provide ONLY the summary, no formatting or headers."""

        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error("Gemini failure summary failed: %s", e)
            raise
