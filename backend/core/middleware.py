"""
Custom middleware.
"""
import logging
import time

logger = logging.getLogger("apps")


class RequestLoggingMiddleware:
    """Logs request method, path, status code, and duration."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.monotonic()
        response = self.get_response(request)
        duration = time.monotonic() - start_time

        if not request.path.startswith(("/static/", "/media/", "/health/")):
            logger.info(
                "%s %s %s %.3fs",
                request.method,
                request.path,
                response.status_code,
                duration,
            )

        return response
