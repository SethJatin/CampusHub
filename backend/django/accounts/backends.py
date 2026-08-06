"""
Custom Authentication Backend

Allows users to login using their email address instead of username.
"""

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to login with email.

    This extends Django's ModelBackend to support email-based authentication.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate user using email and password.

        Args:
            request: HTTP request object
            username: Email address (used as username)
            password: User's password

        Returns:
            User object if authentication successful, None otherwise
        """
        # If username is actually an email, try to find user
        try:
            # Try to get user by email
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            # Run default password validation to prevent timing attacks
            User().set_password(password)
            return None

        # Check if password is correct
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
