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
        """Convert natural language to structured automation steps."""
        model = cls._get_client()

        prompt = f"""You are a QA automation expert. Convert the following natural language test description 
into structured automation test steps.

Each step should have:
- action: one of [navigate, click, fill, select, upload, wait, verify_text, verify_url, verify_element, screenshot]
- target: CSS selector or locator (if applicable)
- value: input value (if applicable)
- description: human-readable description

Context: {context}

Test description: {natural_language_input}

Return a JSON array of steps. Example:
[
    {{"action": "navigate", "target": "", "value": "https://app.example.com", "description": "Navigate to app"}},
    {{"action": "click", "target": "#login-btn", "value": "", "description": "Click login button"}},
    {{"action": "fill", "target": "#email", "value": "user@example.com", "description": "Enter email"}},
    {{"action": "verify_text", "target": ".success-msg", "value": "Welcome", "description": "Verify success message"}}
]

Return ONLY the JSON array, no other text."""

        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            # Try to parse JSON from response
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            steps = json.loads(text.strip())
            return steps
        except Exception as e:
            logger.error("Gemini step generation failed: %s", e)
            raise

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
