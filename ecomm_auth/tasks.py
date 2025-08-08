"""Celery tasks for the ecomm_auth app.

This module defines asynchronous tasks related to e-commerce authentication,
such as sending verification emails, handling password resets, etc.
"""
import logging
from typing import Dict, Any, Optional

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from celery import shared_task

from core.clients import AuthServiceClient, APIClientError
from ecomm_auth.models import EcommUserCredential

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
async def send_verification_email(
    self, 
    user_id: str, 
    email: str, 
    tenant_id: int,
    initiating_user_id: Optional[int] = None
) -> Dict[str, Any]:
    """Send a verification email to a newly registered user.
    
    This task interacts with the Auth microservice to trigger an email
    verification process for a newly registered user.
    
    Args:
        self: The task instance (automatically injected by Celery)
        user_id: The ID of the user in the local database
        email: The user's email address
        
    Returns:
        A dictionary with the task result information
        
    Raises:
        Retry: If the task fails temporarily and should be retried
    """
    # Create context for logging
    log_context = {
        'tenant_id': tenant_id,
        'user_id': initiating_user_id,
        'email': email,
        'user_id': user_id
    }
    
    logger.info(
        f"Sending verification email to user {user_id} at {email}", 
        extra=log_context
    )
    
    # Set tenant context
    from core.utils.tenant import set_tenant_context
    try:
        set_tenant_context(tenant_id)
        logger.info(f"Tenant context activated for email verification", extra=log_context)
    except Exception as e:
        logger.error(
            f"Failed to set tenant context: {str(e)}", 
            extra=log_context,
            exc_info=True
        )
        raise
    
    try:
        # Initialize Auth microservice client
        auth_client = AuthServiceClient()
        
        # Call Auth microservice to send verification email
        response = await auth_client.send_verification_email(email)
        
        # Update user record to reflect pending verification
        try:
            user = await User.objects.aget(id=user_id)
            credential = await EcommUserCredential.objects.filter(user=user).afirst()
            
            if credential:
                credential.email_verification_sent_at = timezone.now()
                await credential.asave(update_fields=['email_verification_sent_at'])
                
        except Exception as e:
            logger.error(f"Failed to update user record: {str(e)}")
            # Continue with task, as the email was still sent
        
        logger.info(f"Verification email successfully sent to {email}")
        return {
            "success": True,
            "email": email,
            "timestamp": timezone.now().isoformat(),
        }
        
    except APIClientError as e:
        logger.error(f"Failed to send verification email to {email}: {str(e)}")
        
        # Retry the task if it's a temporary failure
        # After max_retries, the task will fail permanently
        retry_in_seconds = 60 * (2 ** self.request.retries)  # Exponential backoff
        raise self.retry(
            exc=e,
            countdown=retry_in_seconds,
            max_retries=3
        )


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
async def process_account_verification(self, token: str) -> Dict[str, Any]:
    """Process an account verification token.
    
    This task verifies a user's email address by validating the token
    with the Auth microservice and updating the local user record.
    
    Args:
        self: The task instance (automatically injected by Celery)
        token: The verification token from the email link
        
    Returns:
        A dictionary with the verification result
        
    Raises:
        Retry: If the task fails temporarily and should be retried
    """
    logger.info(f"Processing account verification with token")
    
    try:
        # Initialize Auth microservice client
        auth_client = AuthServiceClient()
        
        # Validate token with Auth microservice
        response = await auth_client.verify_email(token)
        
        # Extract email from response
        email = response.get('email')
        
        if not email:
            logger.error("Auth service did not return email for verification token")
            return {
                "success": False,
                "error": "Invalid verification token",
            }
        
        # Update user record to reflect successful verification
        try:
            user = await User.objects.filter(username=email).afirst()
            
            if not user:
                logger.error(f"User with email {email} not found")
                return {
                    "success": False,
                    "error": "User not found",
                }
                
            credential = await EcommUserCredential.objects.filter(user=user).afirst()
            
            if not credential:
                logger.error(f"Credential for user {email} not found")
                return {
                    "success": False,
                    "error": "User credential not found",
                }
                
            credential.email_verified = True
            credential.email_verified_at = timezone.now()
            await credential.asave(update_fields=['email_verified', 'email_verified_at'])
            
        except Exception as e:
            logger.error(f"Failed to update user verification status: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }
        
        logger.info(f"Email {email} successfully verified")
        return {
            "success": True,
            "email": email,
            "timestamp": timezone.now().isoformat(),
        }
        
    except APIClientError as e:
        logger.error(f"Failed to process verification token: {str(e)}")
        
        # Retry the task if it's a temporary failure
        retry_in_seconds = 60 * (2 ** self.request.retries)  # Exponential backoff
        raise self.retry(
            exc=e,
            countdown=retry_in_seconds,
            max_retries=3
        )
