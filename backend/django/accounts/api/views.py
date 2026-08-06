"""
Accounts API - Views

API views for authentication and user management.
"""

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from .serializers import (
    UserSerializer, StudentProfileSerializer, FacultyProfileSerializer,
    RegisterSerializer, LoginSerializer
)
from accounts.models import StudentProfile, FacultyProfile

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    API endpoint for user registration.

    POST /api/accounts/register/
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create appropriate profile based on role
        if user.role == 'student':
            StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'roll_number': f"STU{user.id}",
                    'department': 'General',
                    'year': 1,
                    'semester': 1,
                },
            )
        elif user.role == 'faculty':
            FacultyProfile.objects.get_or_create(
                user=user,
                defaults={
                    'employee_id': f"FAC{user.id}",
                    'department': 'General',
                    'designation': 'Instructor',
                },
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'Registration successful!'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    API endpoint for user login.

    POST /api/accounts/login/
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class LogoutView(APIView):
    """
    API endpoint for user logout.

    POST /api/accounts/logout/
    """
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'message': 'Logged out'})


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint to get/update user profile.

    GET /api/accounts/profile/
    PUT /api/accounts/profile/
    """
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class StudentProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for student profile.

    GET /api/accounts/student-profile/
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.student_profile


class FacultyProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for faculty profile.

    GET /api/accounts/faculty-profile/
    """
    serializer_class = FacultyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.faculty_profile


class UserListView(generics.ListAPIView):
    """
    API endpoint to list users (admin only).

    GET /api/accounts/users/
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    """
    Get current user info.

    GET /api/accounts/me/
    """
    return Response(UserSerializer(request.user).data)
