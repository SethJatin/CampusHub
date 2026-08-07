"""
Custom Authentication Backend

Allows users to login using their email address instead of username.
"""

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q
import bcrypt

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to login with email,
    username, roll number, or employee ID, supporting both Django PBKDF2
    and bcrypt password hashes.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        # Look up user by email, username, student roll number, or faculty employee ID
        user = User.objects.filter(
            Q(email__iexact=username) |
            Q(username__iexact=username) |
            Q(student_profile__roll_number__iexact=username) |
            Q(faculty_profile__employee_id__iexact=username)
        ).first()

        if not user:
            User().set_password(password)
            return None

        if self._verify_password(user, password) and self.user_can_authenticate(user):
            return user
        return None

    def _verify_password(self, user, password):
        # 1. Check if user password uses bcrypt ($2a$, $2b$, $2y$)
        if user.password.startswith(('$2a$', '$2b$', '$2y$')):
            try:
                if bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
                    # Re-hash with Django's native set_password for future efficiency
                    user.set_password(password)
                    user.save(update_fields=['password'])
                    return True
            except Exception as e:
                pass

        # 2. Native Django check_password
        return user.check_password(password)

