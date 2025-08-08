"""
Custom authentication for Order Management API.

This module defines custom authentication classes for handling
JWT tokens in the Order Management API.
"""
import jwt
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed

# Import the EcommUserCredential model directly
from ecomm_auth.models import EcommUserCredential

logger = logging.getLogger(__name__)

User = get_user_model()


class JWTAuthentication(authentication.BaseAuthentication):
    """
    Custom JWT authentication for Order Management API.
    
    This authentication class validates JWT tokens and
    extracts user information from them.
    """
    def authenticate(self, request):
        """Authenticate the request and return a two-tuple of (user, token)."""
        # Get the token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None  # Allow other authentication methods to try

        try:
            # Split 'Bearer <token>'
            parts = auth_header.split()
            if parts[0].lower() != 'bearer':
                raise AuthenticationFailed('Authorization header must start with Bearer')
            if len(parts) == 1:
                raise AuthenticationFailed('Token not found')
            elif len(parts) > 2:
                raise AuthenticationFailed('Authorization header must be Bearer <token>')

            token = parts[1]
            
            # Get the same JWT settings used in EcommLoginView
            from erp_backend.settings import SIMPLE_JWT
            secret_key = SIMPLE_JWT.get('SIGNING_KEY', 'Qu1ckAss1st@123')
            algorithm = SIMPLE_JWT.get('ALGORITHM', 'HS256')
            
            # Decode the JWT token with the same key used to sign it
            payload = jwt.decode(
                token, 
                secret_key, 
                algorithms=[algorithm],
                options={"verify_exp": True}
            )
            
            # Extract user info
            user_id = payload.get('user_id')
            client_id = payload.get('client_id')
            contact_id = payload.get('contact_id')
            account_id = payload.get('account_id')
            print("user_id:", user_id)
            print("client_id:", client_id)
            print("contact_id:", contact_id)
            print("account_id:", account_id)
            
            if not user_id:
                raise AuthenticationFailed('Invalid token payload')
            
            try:
                # Create a user object from the token data without database lookup
                email = payload.get('email', f"user_{user_id}@example.com")
                user = User(id=user_id, username=email, email=email, is_active=True)
                logger.info(f"Successfully authenticated user {user_id} from token")
                
            except Exception as e:
                error_msg = f'Error processing token: {str(e)}'
                logger.error(error_msg, exc_info=True)
                raise AuthenticationFailed(error_msg)
            
            # Set additional information on the request object
            request.client_id = client_id
            request.auth_tenant_id = client_id  # For backward compatibility
            request.tenant_id = client_id  # For backward compatibility
            request.contact_id = contact_id
            request.account_id = account_id
            request.auth_user_id = user_id
            
            # Return authenticated user and token
            return (user, token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except Exception as e:
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')
            
    def authenticate_header(self, request):
        """Return the authentication header format."""
        return 'Bearer'
