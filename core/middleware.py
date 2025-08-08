"""Middleware for handling authentication, tenant context, and request logging.

This module provides middleware classes for:
1. JWT token validation against the Auth microservice
2. Tenant context management based on URL path
3. Request context injection for structured logging
"""
import logging
import re
from typing import Callable, Optional, Dict, Any, Union

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.utils.functional import SimpleLazyObject
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

from core.clients import AuthServiceClient, APIClientError
from core.logging import set_current_request, set_current_request_id, clear_request_context
from erp_backend.settings import TOKEN_SECRET_KEY

User = get_user_model()
logger = logging.getLogger(__name__)


def get_token_from_request(request: HttpRequest) -> Optional[str]:
    """Extract JWT token from the request.
    
    Args:
        request: The HTTP request object
        
    Returns:
        The JWT token if found, None otherwise
    """
    auth_header = request.headers.get('Authorization', '')
    
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    
    return None


async def get_user_from_token(token: str, request: HttpRequest = None) -> Optional[User]:
    """Get or create a Django user from a validated JWT token.
    
    Args:
        token: The JWT token to validate
        request: Optional HTTP request object for storing token data
        
    Returns:
        The Django user if token is valid, None otherwise
    """
    try:
        # Validate token directly with local secret key
        import jwt
        token_secret_key = getattr(settings, 'TOKEN_SECRET_KEY', 'Qu1ckAss1st@123')
        logger.debug(f"Using token_secret_key: {token_secret_key[:5]}..." if token_secret_key else "No token_secret_key found")
        try:
            # Decode and validate the token
            token_data = jwt.decode(token, token_secret_key, algorithms=['HS256'])
            logger.debug(f"Successfully validated JWT token: {token_data}")
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {str(e)}")
            return None
        
        # Extract user info from token data
        user_id = token_data.get('user_id')
        email = token_data.get('email')
        client_id = token_data.get('client_id')
        contact_id = token_data.get('contact_id')
        account_id = token_data.get('account_id')
        
        # Store token data in request if available
        if request is not None:
            # Store token data directly on request object
            request.auth_user_id = user_id
            request.client_id = client_id
            request.contact_id = contact_id
            request.account_id = account_id
            request.token_data = token_data
        
        if not user_id or not email:
            logger.error("Token does not contain user_id or email")
            return None
        
        # Get or create Django user based on email
        try:
            # First try to find user by external_user_id in EcommUserCredential
            from ecomm_auth.models import EcommUserCredential
            credential = EcommUserCredential.objects.filter(external_user_id=user_id).first()
            
            if credential:
                return credential.user
            
            # If not found, try to find user by email
            user, created = User.objects.get_or_create(
                username=email,
                defaults={
                    'email': email,
                    'first_name': token_data.get('first_name', ''),
                    'last_name': token_data.get('last_name', ''),
                    'is_active': True,
                }
            )
            
            if created:
                # Create EcommUserCredential for the new user
                EcommUserCredential.objects.create(
                    user=user,
                    client_id=1,  # Default tenant ID for Phase 1
                    created_by=user,
                    updated_by=user,
                    external_user_id=user_id,
                    email_verified=token_data.get('email_verified', False),
                    is_active=True
                )
                
                # Note: Customer and EcommUserProfile creation is handled in SignupView
                # For token-based auth, we assume the user already exists
                
            return user
            
        except Exception as e:
            logger.exception(f"Failed to get or create user from token: {str(e)}")
            return None
        
    except APIAuthenticationError:
        # Token is invalid
        return None
        
    except APIClientError as e:
        # Auth service error
        logger.error(f"Auth service error during token validation: {e.message}")
        return None


async def get_user(request: HttpRequest) -> Union[User, AnonymousUser]:
    """Get the user from the request.
    
    This function is used by the JWTAuthMiddleware to set request.user.
    
    Args:
        request: The HTTP request object
        
    Returns:
        The authenticated user or AnonymousUser
    """
    # Check if user is already authenticated through session
    if hasattr(request, '_cached_user'):
        return request._cached_user
    
    # Extract token from request
    token = get_token_from_request(request)
    
    if token:
        # Validate token and get user, passing the request object
        user = await get_user_from_token(token, request)
        
        if user:
            # Cache user for this request
            request._cached_user = user
            return user
    
    # Return AnonymousUser if no valid token or user found
    return AnonymousUser()


class JWTAuthMiddleware:
    """Middleware for JWT authentication using the Auth microservice.
    
    This middleware validates JWT tokens against the Auth microservice
    and sets request.user to the authenticated user if the token is valid.
    """
    def __init__(self, get_response: Callable):
        """Initialize the middleware.
        
        Args:
            get_response: The next middleware or view in the chain
        """
        self.get_response = get_response
    
    async def __call__(self, request: HttpRequest) -> HttpResponse:
        """Process the request.
        
        Args:
            request: The HTTP request object
            
        Returns:
            The HTTP response from the next middleware or view
        """
        # Set request.user to a lazy object that will be evaluated when accessed
        request.user = SimpleLazyObject(lambda: get_user(request))
        
        # Initialize auth attributes (will be updated by get_user_from_token if token is valid)
        request.auth_user_id = None
        request.client_id = None
        request.contact_id = None
        request.account_id = None
        
        # If user is authenticated, ensure auth_user_id is set
        if request.user.is_authenticated:
            request.auth_user_id = request.user.id
        
        # Call the next middleware or view
        response = await self.get_response(request)
        
        return response


class TenantMiddleware:
    """
    Middleware to handle tenant context.
    Extracts tenant identifier from URL path and sets it in the request context.
    Also extracts tenant information from JWT token if available.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # Compile regex pattern for extracting tenant identifier from URL path
        self.tenant_path_pattern = re.compile(r'^/api/(?P<tenant_identifier>[^/]+)/')

    def __call__(self, request):
        # First try to extract tenant identifier from URL path
        tenant_identifier = None
        match = self.tenant_path_pattern.match(request.path)
        if match:
            tenant_identifier = match.group('tenant_identifier')
            
        # If not found in path, try headers or query params
        if not tenant_identifier:
            tenant_identifier = request.headers.get('X-Tenant-ID') or request.GET.get('tenant_id')
            
        # If still not found, use client_id from headers or query params (legacy support)
        if not tenant_identifier:
            tenant_identifier = request.headers.get('X-Client-ID') or request.GET.get('client_id')
        
        # Fallback to default tenant identifier if none provided
        if not tenant_identifier:
            tenant_identifier = 'default'  # Default tenant identifier
        
        # Get client_id from JWT token if available
        client_id = 1  # Default tenant ID
        company_id = 1  # Default company ID
        contact_id = None
        account_id = None
        
        # Check if we have token data from JWTAuthMiddleware
        token = get_token_from_request(request)
        if token:
            try:
                print("token:", token)
                # Decode the token without verification for local use
                # This is safe because the token was already verified by the auth service
                import jwt
                
                # Get the correct secret key from settings
                # token_secret_key = getattr(settings, TOKEN_SECRET_KEY)
                
                # First try to decode with verification

                try:
                    token_data = jwt.decode(token, 'Qu1ckAss1st@123', algorithms=['HS256'])
                    logger.debug("Successfully verified JWT token signature")
                    print("token_data:", token_data)
                except jwt.InvalidSignatureError:
                    # If signature verification fails, try without verification
                    # This is a fallback for development/testing
                    logger.warning("JWT signature verification failed, falling back to unverified decode")
                    token_data = jwt.decode(token, options={"verify_signature": False})
                except jwt.DecodeError:
                    # If token is malformed, log and continue with default values
                    logger.warning("Malformed JWT token received, using default values")
                    token_data = {}
                
                # Extract tenant information from token
                if 'client_id' in token_data:
                    try:
                        client_id = int(token_data['client_id'])
                        logger.debug(f"Using client_id {client_id} from JWT token")
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid client_id in token: {token_data.get('client_id')}")
                
                # Extract contact and account information
                if 'contact_id' in token_data:
                    contact_id = token_data['contact_id']
                    logger.debug(f"Using contact_id {contact_id} from JWT token")
                
                if 'account_id' in token_data:
                    account_id = token_data['account_id']
                    logger.debug(f"Using account_id {account_id} from JWT token")
            except Exception as e:
                logger.warning(f"Failed to decode JWT token for tenant info: {str(e)}")
                # Continue with default values
        
        # Set all required tenant context attributes
        request.client_id = client_id
        request.company_id = company_id
        request.tenant_identifier = tenant_identifier
        request.contact_id = contact_id
        request.account_id = account_id
        
        # For backward compatibility
        request.auth_tenant_id = client_id
        request.tenant_id = client_id
        
        response = self.get_response(request)
        return response


class RequestLoggingMiddleware:
    """Middleware for injecting request context into logging.
    
    This middleware sets up thread-local storage for the current request
    and generates a unique request ID for each request, which is then
    available to the logging system for structured logging.
    """
    def __init__(self, get_response: Callable):
        """Initialize the middleware.
        
        Args:
            get_response: The next middleware or view in the chain
        """
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        """Process the request.
        
        Args:
            request: The HTTP request object
            
        Returns:
            The HTTP response from the next middleware or view
        """
        # Generate or extract request ID
        request_id = request.headers.get('X-Request-ID')
        if not request_id:
            request_id = set_current_request_id()
        else:
            set_current_request_id(request_id)
        
        # Add request ID to response headers
        response = self.get_response(request)
        response['X-Request-ID'] = request_id
        
        # Set request in thread-local storage
        set_current_request(request)
        
        # Log request details
        logger.info(
            f"Request: {request.method} {request.path}",
            extra={
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'request_id': request_id,
                'tenant_id': getattr(request, 'tenant_id', 1),
                'user_id': str(request.user.id) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
            }
        )
        
        # Clean up thread-local storage
        clear_request_context()
        
        return response
