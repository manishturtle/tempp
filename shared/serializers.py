"""
Serializers for shared models.

These serializers handle the conversion of shared models to/from JSON for the API.
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Country, Currency


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model.
    
    Used for nested serialization of created_by and updated_by fields.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class CountrySerializer(serializers.ModelSerializer):
    """
    Serializer for the Country model.
    
    Converts Country model instances to/from JSON representations.
    """
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Country
        fields = [
            'id', 
            'iso_code', 
            'iso_code_3',
            'name', 
            'flag_url', 
            'phone_code', 
            'is_active',
            'client_id',
            'company_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CurrencySerializer(serializers.ModelSerializer):
    """
    Serializer for the Currency model.
    
    Converts Currency model instances to/from JSON representations.
    """
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Currency
        fields = [
            'id',
            'code',
            'name',
            'symbol',
            'exchange_rate_to_usd',
            'is_active',
            'client_id',
            'company_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
