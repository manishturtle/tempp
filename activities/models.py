"""
Models for the activities app.

This module defines models for task and activity tracking related to customers
and other business entities.

Note: Future Implementation Requirements:
1. Logic to automatically populate created_by and updated_by fields based on the current user
   will be implemented via middleware or model save overrides.
2. Logic to dynamically set the correct client_id and company_id based on tenant context
   will be implemented in a later phase.
3. These fields provide the foundation for detailed audit trails as specified in
   Functional Specification Section 8.2.3.
"""
from django.db import models
from django.conf import settings
from core.models import BaseTenantModel


class Activity(BaseTenantModel):
    """
    Model for tracking activities related to business entities.
    
    This model stores information about activities such as calls, meetings,
    emails, etc. related to customers and other business entities.
    """
    ACTIVITY_TYPE_CHOICES = [
        ('call', 'Call'),
        ('meeting', 'Meeting'),
        ('email', 'Email'),
        ('task', 'Task'),
        ('note', 'Note'),
        ('other', 'Other'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('deferred', 'Deferred'),
        ('cancelled', 'Cancelled'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    due_date = models.DateTimeField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_activities'
    )
    related_account = models.ForeignKey(
        'customers.Account',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activities'
    )
    related_contact = models.ForeignKey(
        'customers.Contact',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activities'
    )
    # Content type fields for generic relations will be added later
    
    def __str__(self):
        return self.title


class ActivityComment(BaseTenantModel):
    """
    Model for comments on activities.
    
    This model allows users to add comments on activities for collaboration
    and tracking purposes.
    """
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    comment = models.TextField()
    
    def __str__(self):
        return f"Comment on {self.activity}"


class Task(BaseTenantModel):
    """
    Model for tracking tasks assigned to users.
    
    This model stores information about tasks that need to be completed,
    including due dates, priorities, and assignments.
    """
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('deferred', 'Deferred'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    subject = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )
    related_account = models.ForeignKey(
        'customers.Account',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tasks'
    )
    related_contact = models.ForeignKey(
        'customers.Contact',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tasks'
    )
    completed_date = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return self.subject
