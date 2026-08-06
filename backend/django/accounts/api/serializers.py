"""
Accounts API - Serializers

Serializers convert Django models to JSON and vice versa.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from accounts.models import StudentProfile, FacultyProfile, Department

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model.
    """
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'role_display', 'profile_image', 'phone',
            'date_of_birth', 'bio', 'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']


class StudentProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Student Profile.
    """
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'user', 'user_id', 'roll_number', 'enrollment_number',
            'department', 'year', 'semester', 'section', 'batch',
            'cgpa', 'parent_name', 'parent_phone'
        ]


class FacultyProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Faculty Profile.
    """
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'user', 'user_id', 'employee_id', 'department',
            'designation', 'specialization', 'qualification',
            'experience_years', 'office_location', 'office_hours',
            'research_interests', 'publications'
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Department model.
    """
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'head', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm',
                  'first_name', 'last_name', 'role']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match!")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login.
    """
    email = serializers.EmailField()
    password = serializers.CharField()
