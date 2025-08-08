"""
Serializers for the attributes app.

This module defines serializers for attribute-related models such as AttributeGroup,
Attribute, and AttributeOption.
"""
from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User
from .models import AttributeGroup, Attribute, AttributeOption


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model."""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = ['id', 'username', 'email']


class AttributeOptionSerializer(serializers.ModelSerializer):
    """Serializer for the AttributeOption model."""
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    
    class Meta:
        model = AttributeOption
        fields = ['id', 'client_id', 'company_id', 'option_label', 'option_value', 'sort_order', 
                 'created_at', 'updated_at', 'created_by', 'updated_by']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def validate(self, data):
        """Ensure the option belongs to the correct client."""
        if hasattr(self, 'instance') and self.instance:
            if self.instance.client_id != 1:  
                raise serializers.ValidationError("This attribute option does not belong to your client.")
        return data


class AttributeGroupSerializer(serializers.ModelSerializer):
    """Serializer for the AttributeGroup model."""
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    is_active = serializers.BooleanField(default=True)
    
    class Meta:
        model = AttributeGroup
        fields = ['id', 'client_id', 'company_id', 'name', 'display_order', 'is_active',
                 'created_at', 'updated_at', 'created_by', 'updated_by']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']


class AttributeSerializer(serializers.ModelSerializer):
    """Serializer for the Attribute model."""
    data_type_display = serializers.CharField(source='get_data_type_display', read_only=True)
    groups = serializers.PrimaryKeyRelatedField(
        queryset=AttributeGroup.objects.all(),
        many=True,
        required=False
    )
    # Include nested options for read operations
    options = AttributeOptionSerializer(many=True, read_only=True)
    # Write-only field for managing options
    options_input = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
    )
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    is_active = serializers.BooleanField(default=True)
    
    class Meta:
        model = Attribute
        fields = [
            'id', 'client_id', 'company_id', 'name', 'code', 'label', 'description', 'data_type',
            'data_type_display', 'validation_rules', 'is_required', 'is_active', 'is_filterable', 'use_for_variants',
            'show_on_pdp', 'groups', 'options', 'options_input',
            'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'options', 'created_by', 'updated_by']
    
    def validate_groups(self, value):
        """Ensure groups belong to the same client."""
        for group in value:
            if group.client_id != 1:  # Hardcoded client_id as 1
                raise serializers.ValidationError("One or more attribute groups do not belong to this client.")
        return value
    
    def create(self, validated_data):
        """Create an attribute with nested options."""
        options_input = validated_data.pop('options_input', [])
        groups_data = validated_data.pop('groups', None)
        
        # Set client and company IDs
        validated_data['client_id'] = 1  # Hardcoded client_id
        validated_data['company_id'] = 1  # Hardcoded company_id
        
        # Create attribute instance
        attribute = Attribute.objects.create(**validated_data)
        
        # Set groups if provided
        if groups_data is not None:
            attribute.groups.set(groups_data)
        
        # Create options if provided
        if options_input and attribute.data_type in [
            Attribute.AttributeDataType.SELECT,
            Attribute.AttributeDataType.MULTI_SELECT
        ]:
            options_to_create = []
            for option_data in options_input:
                option_obj = {
                    'option_label': option_data.get('option_label'),
                    'option_value': option_data.get('option_value', option_data.get('option_label')),
                    'sort_order': option_data.get('sort_order', 0)
                }
                options_to_create.append(
                    AttributeOption(
                        client_id=1,  # Hardcoded client_id
                        company_id=1,  # Hardcoded company_id
                        attribute=attribute,
                        **option_obj
                    )
                )
            if options_to_create:
                AttributeOption.objects.bulk_create(options_to_create)
        
        return attribute
    
    def update(self, instance, validated_data):
        """Update an attribute with nested options."""
        options_input = validated_data.pop('options_input', None)
        groups_data = validated_data.pop('groups', None)
        
        # Update the attribute instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Always ensure client_id and company_id are set to 1
        instance.client_id = 1
        instance.company_id = 1
        
        instance.save()
        
        # Update groups if provided
        if groups_data is not None:
            instance.groups.set(groups_data)
        
        # Update options if provided and attribute is a SELECT or MULTI_SELECT type
        if options_input is not None and instance.data_type in [
            Attribute.AttributeDataType.SELECT,
            Attribute.AttributeDataType.MULTI_SELECT
        ]:
            with transaction.atomic():
                # Get existing options
                existing_options = {
                    option.option_value: option 
                    for option in instance.options.all()
                }
                
                # Track which options to keep
                options_to_keep = set()
                
                # Process each option in the input
                options_to_create_data = []
                for option_data in options_input:
                    option_value = option_data.get('option_value', option_data.get('option_label'))
                    
                    if option_value in existing_options:
                        # Update existing option
                        option = existing_options[option_value]
                        option.option_label = option_data.get('option_label')
                        option.sort_order = option_data.get('sort_order', 0)
                        option.save()
                        options_to_keep.add(option_value)
                    else:
                        # Prepare data for new option
                        options_to_create_data.append({
                            'option_label': option_data.get('option_label'),
                            'option_value': option_value,
                            'sort_order': option_data.get('sort_order', 0)
                        })
                
                # Create new options
                if options_to_create_data:
                    options_to_create = [
                        AttributeOption(
                            client_id=1,  # Hardcoded client_id
                            company_id=1,  # Hardcoded company_id
                            attribute=instance,
                            **option_data
                        ) for option_data in options_to_create_data
                    ]
                    AttributeOption.objects.bulk_create(options_to_create)
                
                # Delete options that weren't in the input
                options_to_delete = set(existing_options.keys()) - options_to_keep
                if options_to_delete:
                    instance.options.filter(option_value__in=options_to_delete).delete()
        
        return instance
