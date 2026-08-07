import jwt
from functools import wraps
from django.http import JsonResponse
from django.conf import settings
from accounts.models import User

JWT_SECRET = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', 'campushub_jwt_secret_key_2026')

def decode_jwt_token(request):
    auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
    if not auth_header:
        return None, "Authorization header missing"
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None, "Invalid authorization header format"
    
    token = parts[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload.get('id') or payload.get('user_id')
        if not user_id:
            return None, "Invalid token payload"
        user = User.objects.filter(id=user_id).first()
        if not user or not user.is_active:
            return None, "User not found or inactive"
        return user, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError as e:
        return None, f"Invalid token: {str(e)}"

def jwt_required(f):
    @wraps(f)
    def decorator(request, *args, **kwargs):
        user, error = decode_jwt_token(request)
        if error:
            return JsonResponse({'error': error}, status=401)
        request.user = user
        return f(request, *args, **kwargs)
    return decorator

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def wrapper(request, *args, **kwargs):
            user, error = decode_jwt_token(request)
            if error:
                return JsonResponse({'error': error}, status=401)
            request.user = user
            if user.role not in roles and not user.is_superuser:
                return JsonResponse({'error': 'Access denied: Unauthorized role'}, status=403)
            return f(request, *args, **kwargs)
        return wrapper
    return decorator
