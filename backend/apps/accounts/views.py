"""
Account views.
"""
from django.contrib.auth import get_user_model
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)
from .services import AccountService

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user account."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(tags=["Authentication"])
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": str(tokens.access_token),
                    "refresh": str(tokens),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """Authenticate and obtain JWT tokens."""
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(tags=["Authentication"])
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Add user data to response
            user = User.objects.get(email=request.data.get("email"))
            response.data["user"] = UserSerializer(user).data
        return response


class LogoutView(APIView):
    """Blacklist the refresh token to logout."""
    permission_classes = [permissions.AllowAny]

    @extend_schema(tags=["Authentication"])
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update user profile."""
    serializer_class = UserSerializer

    @extend_schema(tags=["Authentication"])
    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Change user password."""

    @extend_schema(tags=["Authentication"], request=ChangePasswordSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        AccountService.change_password(
            request.user,
            serializer.validated_data["old_password"],
            serializer.validated_data["new_password"],
        )
        return Response({"message": "Password changed successfully."})


class ForgotPasswordView(APIView):
    """Request a password reset token."""
    permission_classes = [permissions.AllowAny]

    @extend_schema(tags=["Authentication"], request=ForgotPasswordSerializer)
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = AccountService.request_password_reset(serializer.validated_data["email"])
        return Response(result)


class ResetPasswordView(APIView):
    """Reset password using token."""
    permission_classes = [permissions.AllowAny]

    @extend_schema(tags=["Authentication"], request=ResetPasswordSerializer)
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AccountService.reset_password(
            serializer.validated_data["token"],
            serializer.validated_data["new_password"],
            request.data.get("user_id"),
        )
        return Response({"message": "Password reset successfully."})
