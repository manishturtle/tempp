"""Celery tasks for the activities app.

This module defines asynchronous tasks related to activity management,
such as task scheduling, notifications, and reminders.
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from celery import shared_task

from activities.models import Task

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_task_reminders(self) -> Dict[str, Any]:
    """Send reminders for upcoming tasks.
    
    This task checks for tasks that are due soon and sends reminders
    to the assigned users.
    
    Args:
        self: The task instance (automatically injected by Celery)
        
    Returns:
        A dictionary with the task result information
        
    Raises:
        Retry: If the task fails temporarily and should be retried
    """
    logger.info("Sending task reminders", extra={
        'tenant_id': 1,  # Default tenant ID for Phase 1
        'task_name': 'send_task_reminders',
    })
    
    try:
        # Get tasks that are due in the next 24 hours and haven't had reminders sent
        reminder_window = timezone.now() + timedelta(hours=24)
        upcoming_tasks = Task.objects.filter(
            due_date__lte=reminder_window,
            due_date__gt=timezone.now(),
            reminder_sent=False,
            is_completed=False
        )
        
        reminder_count = 0
        
        for task in upcoming_tasks:
            try:
                # In a real implementation, we would send an email or notification here
                # For Phase 1, this is a placeholder implementation
                
                # Update task to mark reminder as sent
                task.reminder_sent = True
                task.reminder_sent_at = timezone.now()
                task.save(update_fields=['reminder_sent', 'reminder_sent_at', 'updated_at'])
                
                reminder_count += 1
                
                logger.info(f"Sent reminder for task '{task.title}' (ID: {task.id})", extra={
                    'tenant_id': task.client_id,
                    'task_name': 'send_task_reminders',
                    'task_id': str(task.id),
                    'assigned_to': str(task.assigned_to_id) if task.assigned_to_id else None,
                })
                
            except Exception as e:
                logger.error(f"Failed to send reminder for task {task.id}: {str(e)}", extra={
                    'tenant_id': task.client_id,
                    'task_name': 'send_task_reminders',
                    'task_id': str(task.id),
                    'error': str(e),
                })
                # Continue with other tasks even if one fails
        
        logger.info(f"Sent {reminder_count} task reminders", extra={
            'tenant_id': 1,  # Default tenant ID for Phase 1
            'task_name': 'send_task_reminders',
            'reminder_count': reminder_count,
        })
        
        return {
            "success": True,
            "reminder_count": reminder_count,
            "timestamp": timezone.now().isoformat(),
        }
        
    except Exception as e:
        logger.error(f"Failed to send task reminders: {str(e)}", extra={
            'tenant_id': 1,  # Default tenant ID for Phase 1
            'task_name': 'send_task_reminders',
            'error': str(e),
        })
        
        # Retry the task if it's a temporary failure
        retry_in_seconds = 60 * (2 ** self.request.retries)  # Exponential backoff
        raise self.retry(
            exc=e,
            countdown=retry_in_seconds,
            max_retries=3
        )


@shared_task(bind=True)
def cleanup_completed_tasks(self, days_old: int = 30) -> Dict[str, Any]:
    """Archive or clean up old completed tasks.
    
    This task archives or cleans up completed tasks that are older than
    the specified number of days.
    
    Args:
        self: The task instance (automatically injected by Celery)
        days_old: Number of days after which completed tasks should be archived
        
    Returns:
        A dictionary with the task result information
    """
    logger.info(f"Cleaning up completed tasks older than {days_old} days", extra={
        'tenant_id': 1,  # Default tenant ID for Phase 1
        'task_name': 'cleanup_completed_tasks',
        'days_old': days_old,
    })
    
    try:
        # Calculate the cutoff date
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        # Get completed tasks older than the cutoff date
        old_tasks = Task.objects.filter(
            is_completed=True,
            completed_at__lt=cutoff_date
        )
        
        # Count tasks before archiving
        task_count = old_tasks.count()
        
        if task_count > 0:
            # In a real implementation, we might archive these tasks to another storage
            # For Phase 1, we'll just mark them as archived
            old_tasks.update(
                is_archived=True,
                archived_at=timezone.now()
            )
        
        logger.info(f"Archived {task_count} completed tasks", extra={
            'tenant_id': 1,  # Default tenant ID for Phase 1
            'task_name': 'cleanup_completed_tasks',
            'task_count': task_count,
        })
        
        return {
            "success": True,
            "archived_count": task_count,
            "timestamp": timezone.now().isoformat(),
        }
        
    except Exception as e:
        logger.error(f"Failed to clean up completed tasks: {str(e)}", extra={
            'tenant_id': 1,  # Default tenant ID for Phase 1
            'task_name': 'cleanup_completed_tasks',
            'error': str(e),
        })
        
        return {
            "success": False,
            "error": str(e),
            "timestamp": timezone.now().isoformat(),
        }
