"""
Account service layer.
"""
import logging
import uuid
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from core.exceptions import ServiceError

logger = logging.getLogger(__name__)
User = get_user_model()


class AccountService:
    """Service for account-related operations."""

    @staticmethod
    def register_user(validated_data):
        """Register a new user."""
        user = User.objects.create_user(**validated_data)
        logger.info("User registered: %s", user.email)
        return user

    @staticmethod
    def change_password(user, old_password, new_password):
        """Change user password."""
        if not user.check_password(old_password):
            raise ServiceError("Old password is incorrect.")
        user.set_password(new_password)
        user.save()
        logger.info("Password changed for user: %s", user.email)

    @staticmethod
    def request_password_reset(email):
        """Generate password reset token. In MVP, logs to console."""
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            # MVP: Log token to console instead of sending email
            logger.info(
                "Password reset token for %s: %s (user_id: %s)",
                email, token, user.id,
            )
            return {"message": "If the email exists, a reset link has been sent.", "token": token}
        except User.DoesNotExist:
            # Don't reveal if email exists
            return {"message": "If the email exists, a reset link has been sent."}

    @staticmethod
    def reset_password(token, new_password, user_id=None):
        """Reset password using token."""
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                if default_token_generator.check_token(user, token):
                    user.set_password(new_password)
                    user.save()
                    logger.info("Password reset for user: %s", user.email)
                    return True
            except User.DoesNotExist:
                pass
        raise ServiceError("Invalid or expired reset token.")
