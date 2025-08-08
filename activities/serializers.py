"""
Serializers for the activities app.

This module defines serializers for the Activity and Task models,
handling validation and serialization of activity and task data.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from customers.models import Account, Contact
from customers.serializers import AccountSerializer, ContactSerializer
from .models import Activity, Task

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model.
    
    This serializer provides a simplified representation of User objects
    for use in nested serialization.
    """
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = fields


class ActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for the Activity model.
    
    This serializer handles validation and serialization of Activity objects,
    including nested representation of related entities.
    """
    # Nested serializers for read operations
    assigned_to = UserSerializer(read_only=True)
    related_account = AccountSerializer(read_only=True)
    related_contact = ContactSerializer(read_only=True)
    
    # Write-only fields for relations
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assigned_to',
        write_only=True,
        required=False,
        allow_null=True
    )
    related_account_id = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        source='related_account',
        write_only=True,
        required=False,
        allow_null=True
    )
    related_contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source='related_contact',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Activity
        fields = [
            'id', 'title', 'description', 'activity_type', 'priority', 'status',
            'due_date', 'completed_date', 'assigned_to', 'related_account',
            'related_contact', 'assigned_to_id', 'related_account_id',
            'related_contact_id', 'created_at', 'updated_at', 'created_by',
            'updated_by'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by', 'updated_by'
        ]


class TaskSerializer(serializers.ModelSerializer):
    """
    Serializer for the Task model.
    
    This serializer handles validation and serialization of Task objects,
    including nested representation of related entities.
    """
    # Nested serializers for read operations
    assignee = UserSerializer(read_only=True)
    related_account = AccountSerializer(read_only=True)
    related_contact = ContactSerializer(read_only=True)
    
    # Write-only fields for relations
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assignee',
        write_only=True,
        required=False,
        allow_null=True
    )
    related_account_id = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        source='related_account',
        write_only=True,
        required=False,
        allow_null=True
    )
    related_contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source='related_contact',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Task
        fields = [
            'id', 'subject', 'description', 'due_date', 'status', 'priority',
            'assignee', 'related_account', 'related_contact', 'completed_date',
            'assignee_id', 'related_account_id', 'related_contact_id',
            'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
