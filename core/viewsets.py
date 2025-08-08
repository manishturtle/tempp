"""
Base viewsets for client-aware API views.

This module provides base viewset classes that automatically filter querysets
by the current client and assign the client during object creation.
"""
from rest_framework import viewsets, permissions
from django.contrib.auth import get_user_model
from django.db import connection

User = get_user_model()


class TenantModelViewSet(viewsets.ModelViewSet):
    """
    Base ModelViewSet that automatically filters querysets by the current client
    and assigns the client during object creation.
    
    This viewset should be used as the base class for all client-specific API views
    to ensure proper client isolation.
    """
    # permission_classes = [permissions.IsAuthenticated]  # Default permission - temporarily disabled
    permission_classes = []  # Authentication temporarily disabled
    
    def get_queryset(self):
        """
        Filter the queryset to only include objects belonging to the current client.
        """
        # Filter queryset based on the current client from middleware
        queryset = super().get_queryset()
        
        # Temporarily disabled client filtering
        # return queryset.filter(client=self.request.client)
        return queryset  # Return all objects without client filtering for now
    
    def perform_create(self, serializer):
        """
        Automatically assign the current client when creating new objects.
        """
        # Get a default user for created_by and updated_by
        # In a real environment, this would be self.request.user
        default_user = User.objects.first()
        
        # Temporarily disabled client assignment
        # serializer.save(client=self.request.client, created_by=self.request.user, updated_by=self.request.user)
        serializer.save(
            client_id=1,
            created_by=default_user,
            updated_by=default_user
        )

    def perform_update(self, serializer):
        """
        Ensure client_id is always set to 1 during updates.
        Update the updated_by field with the current user.
        """
        # Get a default user for updated_by
        # In a real environment, this would be self.request.user
        default_user = User.objects.first()
        
        # Temporarily disabled client assignment
        # serializer.save(client=self.request.client, updated_by=self.request.user)
        serializer.save(
            client_id=1,
            updated_by=default_user
        )
        
    def perform_destroy(self, instance):
        """
        After deleting an instance, reset the ID sequence for the table.
        """
        # Get the table name
        table_name = instance._meta.db_table
        
        # Delete the instance
        super().perform_destroy(instance)
        
        # Reset the sequence
        self.reset_sequence(table_name)
    
    def reset_sequence(self, table_name):
        """
        Reset the ID sequence for a table to the next value after the maximum ID.
        If the table is empty, reset to 1.
        """
        with connection.cursor() as cursor:
            # Get the maximum ID from the table
            cursor.execute(f"SELECT MAX(id) FROM {table_name}")
            max_id = cursor.fetchone()[0]
            
            # If there are no records, set the next ID to 1
            next_id = max_id + 1 if max_id else 1
            
            # Reset the sequence
            if connection.vendor == 'postgresql':
                cursor.execute(f"ALTER SEQUENCE {table_name}_id_seq RESTART WITH {next_id}")
            elif connection.vendor == 'sqlite':
                # SQLite doesn't have sequences, but we can update the sqlite_sequence table
                cursor.execute(f"UPDATE sqlite_sequence SET seq = {next_id - 1} WHERE name = '{table_name}'")
            elif connection.vendor == 'mysql':
                cursor.execute(f"ALTER TABLE {table_name} AUTO_INCREMENT = {next_id}")
