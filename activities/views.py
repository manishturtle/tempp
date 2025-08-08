"""
Views for the activities app.

This module defines ViewSets for task and activity tracking.
"""
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from core.views import BaseTenantViewSet
from .models import Activity, Task
from .serializers import ActivitySerializer, TaskSerializer


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    Admins can edit any object.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Check if user is admin/staff
        if request.user.is_staff:
            return True
            
        # Write permissions are only allowed to the owner
        if hasattr(obj, 'assignee'):
            return obj.assignee == request.user
        elif hasattr(obj, 'assigned_to'):
            return obj.assigned_to == request.user
            
        # Default to deny permission
        return False


class ActivityViewSet(BaseTenantViewSet):
    """
    ViewSet for managing activities.
    
    This ViewSet provides CRUD operations for activities, with proper
    filtering, sorting, and permission handling.
    """
    queryset = Activity.objects.select_related(
        'assigned_to', 'related_account', 'related_contact', 'created_by', 'updated_by'
    )
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activity_type', 'status', 'priority', 'assigned_to', 'related_account', 'related_contact']
    search_fields = ['title', 'description', 'related_account__name', 'related_contact__first_name', 'related_contact__last_name']
    ordering_fields = ['title', 'due_date', 'priority', 'status', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Filter queryset based on current user if not admin.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Admin users can see all activities
        if user.is_staff:
            return queryset
            
        # Regular users can only see activities assigned to them or created by them
        return queryset.filter(
            Q(assigned_to=user) | Q(created_by=user)
        )
    
    def perform_create(self, serializer):
        """
        Set the created_by and updated_by fields on create.
        Reset sequence to the lowest available ID to ensure gaps are filled.
        """
        # Reset the sequence to the lowest available ID
        from django.db import connection
        with connection.cursor() as cursor:
            # If no records exist, reset to 1
            if not Activity.objects.exists():
                cursor.execute("SELECT setval(pg_get_serial_sequence('activities_activity', 'id'), 1, false);")
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Activity.objects.values_list('id', flat=True))
                
                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1
                
                # Reset the sequence to the lowest available ID
                cursor.execute(f"SELECT setval(pg_get_serial_sequence('activities_activity', 'id'), {next_id - 1}, true);")
        
        # In development environment, use default client_id=1
        # In production, this would use request.tenant.id
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user,
            client_id=1  # Default to 1 for development
        )
    
    def perform_update(self, serializer):
        """
        Set the updated_by field on update.
        """
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to return a success message and reset sequence to the lowest available ID.
        """
        instance = self.get_object()
        activity_title = instance.title
        
        # Delete the instance
        instance.delete()
        
        # Reset the sequence to the lowest available ID
        from django.db import connection
        with connection.cursor() as cursor:
            # If no records remain, reset to 1
            if not Activity.objects.exists():
                cursor.execute("SELECT setval(pg_get_serial_sequence('activities_activity', 'id'), 1, false);")
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Activity.objects.values_list('id', flat=True))
                
                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1
                
                # Reset the sequence to the lowest available ID
                cursor.execute(f"SELECT setval(pg_get_serial_sequence('activities_activity', 'id'), {next_id - 1}, true);")
        
        # Return a success message instead of 204 No Content
        from rest_framework.response import Response
        from rest_framework import status
        return Response(
            {"message": f"Activity successfully deleted"},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def my_activities(self, request):
        """
        Return a list of activities assigned to the current user.
        """
        activities = self.get_queryset().filter(assigned_to=request.user)
        page = self.paginate_queryset(activities)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)


class TaskViewSet(BaseTenantViewSet):
    """
    ViewSet for managing tasks.
    
    This ViewSet provides CRUD operations for tasks, with proper
    filtering, sorting, and permission handling.
    """
    queryset = Task.objects.select_related(
        'assignee', 'related_account', 'related_contact', 'created_by', 'updated_by'
    )
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'assignee', 'related_account', 'related_contact']
    search_fields = ['subject', 'description', 'related_account__name', 'related_contact__first_name', 'related_contact__last_name']
    ordering_fields = ['subject', 'due_date', 'priority', 'status', 'created_at', 'updated_at']
    ordering = ['due_date', 'priority']
    
    def get_queryset(self):
        """
        Filter queryset based on current user if not admin.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Admin users can see all tasks
        if user.is_staff:
            return queryset
            
        # Regular users can only see tasks assigned to them or created by them
        return queryset.filter(
            Q(assignee=user) | Q(created_by=user)
        )
    
    def perform_create(self, serializer):
        """
        Set the created_by and updated_by fields on create.
        Reset sequence to the lowest available ID to ensure gaps are filled.
        """
        # Reset the sequence to the lowest available ID
        from django.db import connection
        with connection.cursor() as cursor:
            # If no records exist, reset to 1
            if not Activity.objects.exists():
                cursor.execute("SELECT setval(pg_get_serial_sequence('activities_activity', 'id'), 1, false);")
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Activity.objects.values_list('id', flat=True))
                
                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1
                
                # Reset the sequence to the lowest available ID
                cursor.execute(f"SELECT setval(pg_get_serial_sequence('activities_activity', 'id'), {next_id - 1}, true);")
        
        # In development environment, use default client_id=1
        # In production, this would use request.tenant.id
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user,
            client_id=1  # Default to 1 for development
        )
    
    def perform_update(self, serializer):
        """
        Set the updated_by field on update.
        """
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to return a success message and reset sequence to the lowest available ID.
        """
        instance = self.get_object()
        task_subject = instance.subject
        
        # Delete the instance
        instance.delete()
        
        # Reset the sequence to the lowest available ID
        from django.db import connection
        with connection.cursor() as cursor:
            # If no records remain, reset to 1
            if not Task.objects.exists():
                cursor.execute("SELECT setval(pg_get_serial_sequence('activities_task', 'id'), 1, false);")
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Task.objects.values_list('id', flat=True))
                
                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1
                
                # Reset the sequence to the lowest available ID
                # Ensure we don't try to set the sequence to 0, which is invalid in PostgreSQL
                cursor.execute(f"SELECT setval(pg_get_serial_sequence('activities_task', 'id'), {max(1, next_id - 1)}, true);")
        
        # Return a success message instead of 204 No Content
        from rest_framework.response import Response
        from rest_framework import status
        return Response(
            {"message": f"Task successfully deleted"},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """
        Return a list of tasks assigned to the current user.
        """
        tasks = self.get_queryset().filter(assignee=request.user)
        page = self.paginate_queryset(tasks)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        Return a list of overdue tasks assigned to the current user.
        """
        now = timezone.now()
        tasks = self.get_queryset().filter(
            assignee=request.user,
            due_date__lt=now,
            status__in=['not_started', 'in_progress']
        )
        page = self.paginate_queryset(tasks)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)
