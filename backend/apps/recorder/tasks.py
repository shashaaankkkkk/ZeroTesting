"""
Recorder Celery tasks.
"""
import asyncio
import logging
import json
from celery import shared_task
from .services import RecorderService

logger = logging.getLogger(__name__)

# JavaScript to inject for recording
RECORDER_SCRIPT = """
(function() {
    if (window.__recorder_active) return;
    window.__recorder_active = true;
    window.__recorded_steps = [];

    function getSelector(el) {
        if (el.id) return '#' + el.id;
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.name) return '[name="' + el.name + '"]';
        if (el.className && typeof el.className === 'string') {
            const classes = el.className.trim().split(/\\s+/).slice(0, 2).join('.');
            if (classes) return el.tagName.toLowerCase() + '.' + classes;
        }
        if (el.placeholder) return '[placeholder="' + el.placeholder + '"]';
        let path = el.tagName.toLowerCase();
        if (el.parentElement) {
            const siblings = Array.from(el.parentElement.children).filter(c => c.tagName === el.tagName);
            if (siblings.length > 1) {
                path += ':nth-child(' + (Array.from(el.parentElement.children).indexOf(el) + 1) + ')';
            }
        }
        return path;
    }

    document.addEventListener('click', function(e) {
        const sel = getSelector(e.target);
        window.__recorded_steps.push({
            action: 'click',
            target: sel,
            value: '',
            description: 'Click on ' + sel,
            timestamp: Date.now()
        });
    }, true);

    document.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            const sel = getSelector(e.target);
            // Debounce: update last input step for same target
            const last = window.__recorded_steps[window.__recorded_steps.length - 1];
            if (last && last.action === 'fill' && last.target === sel) {
                last.value = e.target.value;
            } else {
                window.__recorded_steps.push({
                    action: 'fill',
                    target: sel,
                    value: e.target.value,
                    description: 'Fill ' + sel,
                    timestamp: Date.now()
                });
            }
        }
    }, true);

    document.addEventListener('change', function(e) {
        if (e.target.tagName === 'SELECT') {
            const sel = getSelector(e.target);
            window.__recorded_steps.push({
                action: 'select',
                target: sel,
                value: e.target.value,
                description: 'Select ' + e.target.value + ' from ' + sel,
                timestamp: Date.now()
            });
        }
    }, true);

    // Track navigations
    const origPushState = history.pushState;
    history.pushState = function() {
        origPushState.apply(this, arguments);
        window.__recorded_steps.push({
            action: 'navigate',
            target: '',
            value: location.href,
            description: 'Navigate to ' + location.href,
            timestamp: Date.now()
        });
    };
})();
"""


@shared_task(bind=True, time_limit=300)
def start_recording_task(self, session_id, base_url):
    """Start a Playwright browser for recording."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(_record(session_id, base_url))
    except Exception as e:
        logger.exception("Recording task failed: %s", e)
        session = RecorderService.get_session(session_id)
        if session:
            session["status"] = "error"
            session["error"] = str(e)
            RecorderService.update_session(session_id, session)
    finally:
        loop.close()


async def _record(session_id, base_url):
    """Run Playwright browser, inject recorder script, wait for stop signal."""
    from playwright.async_api import async_playwright
    from django.conf import settings

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=settings.PLAYWRIGHT_HEADLESS)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        # Navigate to base URL
        await page.goto(base_url, wait_until="networkidle", timeout=30000)

        # Inject recording script
        await page.evaluate(RECORDER_SCRIPT)

        # Add navigation event listener
        initial_steps = [{
            "action": "navigate",
            "target": "",
            "value": base_url,
            "description": f"Navigate to {base_url}",
        }]

        # Update session status
        session = RecorderService.get_session(session_id)
        if session:
            session["status"] = "recording"
            session["url"] = base_url
            session["steps"] = initial_steps
            RecorderService.update_session(session_id, session)

        # Re-inject on navigation
        page.on("load", lambda: page.evaluate(RECORDER_SCRIPT))

        # Poll for stop signal
        max_wait = 300  # 5 minutes max
        elapsed = 0
        while elapsed < max_wait:
            await page.wait_for_timeout(2000)
            elapsed += 2

            session = RecorderService.get_session(session_id)
            if not session or session.get("status") == "stopping":
                break

            # Extract recorded steps
            try:
                recorded = await page.evaluate("window.__recorded_steps || []")
                if recorded:
                    session["steps"] = initial_steps + recorded
                    RecorderService.update_session(session_id, session)
            except Exception:
                pass

        # Final extraction
        try:
            recorded = await page.evaluate("window.__recorded_steps || []")
            session = RecorderService.get_session(session_id) or {"steps": initial_steps}
            session["steps"] = initial_steps + recorded
            session["status"] = "completed"
            RecorderService.update_session(session_id, session)
        except Exception:
            pass

        await context.close()
        await browser.close()

    logger.info("Recording session %s completed", session_id)
