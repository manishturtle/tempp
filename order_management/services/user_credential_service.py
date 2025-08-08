"""
User Credential Service.

This module provides functionality for managing user credentials
and portal access for contact persons in B2B/Gov customer accounts.
"""
from typing import Dict, Any, Optional, List, Tuple, Union
import logging
import secrets
import string
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from django.conf import settings

# Import models
from ecomm_auth.models import EcommUserCredential as EcommCredential
from order_management.models import PasswordResetToken
from order_management.integrations import notification_service

logger = logging.getLogger(__name__)

# Constants
PASSWORD_LENGTH = 12
PASSWORD_EXPIRY_DAYS = 7  # Initial password expires in 7 days


def generate_secure_password() -> str:
    """
    Generate a secure random password.
    
    Returns:
        A secure random password string
    """
    # Define character sets
    uppercase_letters = string.ascii_uppercase
    lowercase_letters = string.ascii_lowercase
    digits = string.digits
    special_chars = "!@#$%^&*()-_=+[]{}|;:,.<>?"
    
    # Ensure at least one character from each set
    password = [
        secrets.choice(uppercase_letters),
        secrets.choice(lowercase_letters),
        secrets.choice(digits),
        secrets.choice(special_chars)
    ]
    
    # Fill the rest of the password
    remaining_length = PASSWORD_LENGTH - len(password)
    all_chars = uppercase_letters + lowercase_letters + digits + special_chars
    password.extend(secrets.choice(all_chars) for _ in range(remaining_length))
    
    # Shuffle the password
    secrets.SystemRandom().shuffle(password)
    
    return ''.join(password)


def enable_portal_credential(user_id: int, email: str, 
                           created_by_user_id: int) -> Tuple[EcommCredential, str]:
    """
    Enable portal access for a user.
    
    This function finds or creates an EcommCredential record for the specified user
    and generates a secure initial password.
    
    Args:
        user_id: The user identifier (contact person ID)
        email: The user's email address
        created_by_user_id: The ID of the admin enabling access
        
    Returns:
        Tuple of (credential object, initial password)
        
    Raises:
        Exception: If there's an error creating or updating the credential
    """
    try:
        # Generate a secure initial password
        initial_password = generate_secure_password()
        
        # Set password expiry date
        password_expires_at = timezone.now() + timedelta(days=PASSWORD_EXPIRY_DAYS)
        
        # Try to find an existing credential
        try:
            credential = EcommCredential.objects.get(
                user_id=user_id
            )
            
            # Update the existing credential
            credential.email = email
            credential.is_active = True
            credential.password_hash = initial_password  # This would be hashed in a real implementation
            credential.password_expires_at = password_expires_at
            credential.updated_by_id = created_by_user_id
            credential.updated_at = timezone.now()
            credential.save()
            
            logger.info(f"Updated existing credential for user_id={user_id}")
            
        except EcommCredential.DoesNotExist:
            # Create a new credential
            credential = EcommCredential.objects.create(
                user_id=user_id,
                email=email,
                is_active=True,
                password_hash=initial_password,  # This would be hashed in a real implementation
                password_expires_at=password_expires_at,
                created_by_id=created_by_user_id,
                updated_by_id=created_by_user_id
            )
            
            logger.info(f"Created new credential for user_id={user_id}")
            
        return credential, initial_password
        
    except Exception as e:
        error_msg = f"Error enabling portal credential for user_id={user_id}: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg) from e


def disable_portal_credential(user_id: int) -> bool:
    """
    Disable portal access for a user.
    
    Args:
        user_id: The user identifier (contact person ID)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Find the credential
        try:
            credential = EcommCredential.objects.get(
                user_id=user_id
            )
            
            # Disable the credential
            credential.is_active = False
            credential.save(update_fields=['is_active', 'updated_at'])
            
            logger.info(f"Disabled credential for user_id={user_id}")
            return True
            
        except EcommCredential.DoesNotExist:
            logger.warning(f"No credential found to disable for user_id={user_id}")
            return False
            
    except Exception as e:
        logger.error(f"Error disabling portal credential for user_id={user_id}: {str(e)}")
        return False


def trigger_welcome_email(user_id: int, email: str, first_name: str, request=None) -> bool:
    """
    Trigger welcome email for a new user.
    
    Args:
        user_id: The user identifier
        email: The user's email address
        first_name: The user's first name
        request: The request object (optional)
        
    Returns:
        Boolean indicating success or failure
    """
    logger.info(f"Triggering welcome email for user {user_id}")
    
    recipient_email = email
    
    try:
        from order_management.integrations import notification_service
        
        # Prepare context data for the email template
        context = {
            "first_name": first_name,
            "login_url": settings.FRONTEND_URL + "/login",
            "help_url": settings.FRONTEND_URL + "/help",
            "company_name": settings.COMPANY_NAME,
            "current_year": datetime.now().year
        }
        
        # Send the welcome email
        success = notification_service.send_transactional_email(
            recipient_email=recipient_email,
            template_key="WELCOME_EMAIL",
            context=context
        )
        
        if success:
            logger.info(f"Welcome email sent to {recipient_email}")
            return True
        else:
            logger.warning(f"Failed to send welcome email to {recipient_email}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending welcome email to {recipient_email}: {str(e)}")
        return False


def generate_password_reset_token(user_id: int, initiating_user_id: int) -> PasswordResetToken:
    """
    Generate a secure password reset token for a user.
    
    This function creates a new password reset token, deleting any existing ones for the user,
    and returns the token object.
    
    Args:
        user_id: The user identifier (contact person ID) for whom to generate a token
        initiating_user_id: The ID of the admin initiating the password reset
        
    Returns:
        The created PasswordResetToken object
        
    Raises:
        Exception: If there's an error creating the token
    """
    try:
        # Delete any existing non-expired tokens for this user
        PasswordResetToken.objects.filter(
            user_id=user_id, 
            expires_at__gt=timezone.now()
        ).delete()
        
        # Generate a secure token
        token_str = secrets.token_urlsafe(32)
        
        # Calculate expiry time (default 24 hours if not specified in settings)
        expiry_hours = getattr(settings, 'PASSWORD_RESET_TIMEOUT_HOURS', 24)
        expiry_time = timezone.now() + timedelta(hours=expiry_hours)
        
        # Create new token
        token_obj = PasswordResetToken.objects.create(
            user_id=user_id,
            token=token_str,
            expires_at=expiry_time,
            created_by_id=initiating_user_id,
            updated_by_id=initiating_user_id
        )
        
        logger.info(f"Password reset token generated for user {user_id}")
        return token_obj
        
    except Exception as e:
        error_msg = f"Error generating password reset token for user {user_id}: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg) from e


def validate_password_reset_token(token: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Validate a password reset token.
    
    This function checks if the token exists and hasn't expired.
    If valid, it returns the user ID associated with the token.
    If invalid, it returns None and deletes the token (if found).
    
    Args:
        token: The token string to validate
        
    Returns:
        user_id if valid, None if invalid
    """
    try:
        # Find token
        token_obj = PasswordResetToken.objects.filter(token=token).first()
        
        # Check if token exists and hasn't expired
        if token_obj and not token_obj.is_expired():
            return token_obj.user_id
        
        # If token exists but is expired, delete it
        if token_obj:
            token_obj.delete()
            logger.info(f"Deleted expired token: {token}")
        else:
            logger.warning(f"Invalid token attempted: {token}")
            
        return None
        
    except Exception as e:
        logger.error(f"Error validating password reset token: {str(e)}")
        return None
