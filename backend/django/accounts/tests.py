from django.test import TestCase
from rest_framework.test import APIClient


class RegistrationAPITests(TestCase):
    def test_register_creates_user_and_profile(self):
        client = APIClient()
        payload = {
            'email': 'newstudent@example.com',
            'username': 'newstudent',
            'password': 'StrongPass123',
            'password_confirm': 'StrongPass123',
            'first_name': 'New',
            'last_name': 'Student',
            'role': 'student',
        }

        response = client.post('/accounts/api/register/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)
