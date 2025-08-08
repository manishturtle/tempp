"""Authentication utilities for JWT token validation and user management.

This module provides utilities for:
1. JWT token validation against the Auth microservice
2. User creation and retrieval based on token data
3. Permission classes for API endpoint authorization
"""
import logging
from typing import Dict, Any, Optional, Tuple, Union, cast

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils.translation import gettext_lazy as _

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

from core.clients import AuthServiceClient, APIAuthenticationError, APIClientError
from ecomm_auth.models import EcommUserCredential

User = get_user_model()
logger = logging.getLogger(__name__)


class ExternalJWTAuthentication(JWTAuthentication):
    """JWT authentication that validates tokens against the Auth microservice.
    
    This class extends the standard JWTAuthentication to validate tokens
    against the external Auth microservice instead of validating them locally.
    """
    
    async def authenticate(self, request: Request) -> Optional[Tuple[User, Dict[str, Any]]]:
        """Authenticate the request and return a user and token data.
        
        Args:
            request: The HTTP request object
            
        Returns:
            A tuple of (user, token_data) if authentication succeeds, None otherwise
            
        Raises:
            AuthenticationFailed: If authentication fails
        """
        # Extract raw token from request
        raw_token = self.get_raw_token(request)
        
        if raw_token is None:
            return None
        
        # Convert bytes to string if necessary
        if isinstance(raw_token, bytes):
            raw_token = raw_token.decode()
        
        # Initialize Auth microservice client
        auth_client = AuthServiceClient()
        
        try:
            # Validate token with Auth microservice
            token_data = await auth_client.validate_token(raw_token)
            
            # Extract user info from token data
            user_id = token_data.get('user_id')
            email = token_data.get('email')
            
            if not user_id or not email:
                logger.error("Auth service did not return user_id or email")
                raise AuthenticationFailed(_('Invalid token'))
            
            # Get or create Django user based on token data
            user = await self._get_or_create_user(user_id, email, token_data)
            
            if not user:
                raise AuthenticationFailed(_('User not found or inactive'))
            
            # Return authenticated user and token data
            return (user, token_data)
            
        except APIAuthenticationError as e:
            # Token is invalid
            logger.warning(f"Token validation failed: {e.message}")
            raise InvalidToken(_('Token is invalid or expired'))
            
        except APIClientError as e:
            # Auth service error
            logger.error(f"Auth service error during token validation: {e.message}")
            raise AuthenticationFailed(_('Authentication service unavailable'))
    
    async def _get_or_create_user(self, external_user_id: str, email: str, token_data: Dict[str, Any]) -> Optional[User]:
        """Get or create a Django user based on token data.
        
        Args:
            external_user_id: The user ID from the Auth microservice
            email: The user's email address
            token_data: Additional user data from the token
            
        Returns:
            The Django user if found or created, None otherwise
        """
        try:
            # First try to find user by external_user_id in EcommUserCredential
            credential = await EcommUserCredential.objects.filter(external_user_id=external_user_id).afirst()
            
            if credential:
                return credential.user
            
            # If not found, try to find user by email
            user = await User.objects.filter(username=email).afirst()
            
            if user:
                # Create EcommUserCredential for existing user
                await EcommUserCredential.objects.acreate(
                    user=user,
                    client_id=1,  # Default tenant ID for Phase 1
                    created_by=user,
                    updated_by=user,
                    external_user_id=external_user_id,
                    email_verified=token_data.get('email_verified', False),
                    is_active=True
                )
                
                return user
            
            # If user not found, create a new user
            user = await User.objects.acreate(
                username=email,
                email=email,
                first_name=token_data.get('first_name', ''),
                last_name=token_data.get('last_name', ''),
                is_active=True,
            )
            
            # Create EcommUserCredential for the new user
            await EcommUserCredential.objects.acreate(
                user=user,
                client_id=1,  # Default tenant ID for Phase 1
                created_by=user,
                updated_by=user,
                external_user_id=external_user_id,
                email_verified=token_data.get('email_verified', False),
                is_active=True
            )
            
            # Note: Customer and EcommUserProfile creation is handled in SignupView
            # For token-based auth, we assume the user already exists
            
            return user
            
        except Exception as e:
            logger.exception(f"Failed to get or create user from token: {str(e)}")
            return None


class IsAuthenticated(permissions.BasePermission):
    """Permission class that requires the user to be authenticated.
    
    This class replaces the standard IsAuthenticated permission to work
    with the ExternalJWTAuthentication authentication class.
    """
    
    def has_permission(self, request: Request, view) -> bool:
        """Check if the user is authenticated.
        
        Args:
            request: The HTTP request object
            view: The view being accessed
            
        Returns:
            True if the user is authenticated, False otherwise
        """
        return bool(request.user and request.user.is_authenticated)


class IsAdminUser(permissions.BasePermission):
    """Permission class that requires the user to be an admin.
    
    This class replaces the standard IsAdminUser permission to work
    with the ExternalJWTAuthentication authentication class.
    """
    
    def has_permission(self, request: Request, view) -> bool:
        """Check if the user is an admin.
        
        Args:
            request: The HTTP request object
            view: The view being accessed
            
        Returns:
            True if the user is an admin, False otherwise
        """
        return bool(request.user and request.user.is_staff)
