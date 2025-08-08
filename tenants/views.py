"""
Views for the tenants app.

This module defines views for tenant-related functionality such as tenant settings.
"""
from django.http import Http404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import TenantSetting
from .serializers import TenantSettingSerializer


class TenantSettingView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for retrieving and updating tenant settings.
    
    This view provides GET and PUT/PATCH methods to retrieve and update
    the settings for the current tenant.
    """
    # permission_classes = [IsAuthenticated]
    permission_classes = []  # Authentication temporarily disabled
    serializer_class = TenantSettingSerializer
    
    def get_object(self):
        """
        Return the TenantSetting object for the current tenant.
        
        Raises Http404 if the settings do not exist (which shouldn't happen
        due to the post_save signal on Tenant model).
        """
        try:
            # Assumes TenantSetting is automatically created via signal
            return TenantSetting.objects.get(tenant=self.request.tenant)
        except TenantSetting.DoesNotExist:
            # Handle case where settings might not exist (shouldn't happen with signal)
            raise Http404("Tenant settings not found.")
