"""
Custom exception handler for DRF.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Custom exception handler that standardizes error responses."""
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "error": True,
            "status_code": response.status_code,
            "message": _get_error_message(response),
            "details": response.data if isinstance(response.data, dict) else {"detail": response.data},
        }
        response.data = error_data
    else:
        logger.exception("Unhandled exception", exc_info=exc)
        response = Response(
            {
                "error": True,
                "status_code": 500,
                "message": "An unexpected error occurred.",
                "details": {},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _get_error_message(response):
    """Extract a human-readable error message from the response."""
    if isinstance(response.data, dict):
        if "detail" in response.data:
            return str(response.data["detail"])
        if "non_field_errors" in response.data:
            errors = response.data["non_field_errors"]
            return str(errors[0]) if isinstance(errors, list) else str(errors)
    if isinstance(response.data, list) and len(response.data) > 0:
        return str(response.data[0])
    return "Request failed."


class ServiceError(Exception):
    """Base exception for service layer errors."""

    def __init__(self, message, code=None, status_code=400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)
