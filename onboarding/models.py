"""
Models for the onboarding app.
"""
from django.db import models


class OnboardingStatus(models.Model):
    """
    Tracks the onboarding status for a tenant schema.
    There should be exactly one record per schema with id=1.
    """
    is_onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'onboarding_status'
        verbose_name = 'Onboarding Status'
        verbose_name_plural = 'Onboarding Status'
