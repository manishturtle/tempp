from django.db import transaction
from rest_framework import serializers
from .models import PincodeMaster, ShippingZone, PincodeZoneAssignment

class PincodeMasterSerializer(serializers.ModelSerializer):
    is_assigned = serializers.SerializerMethodField()

    class Meta:
        model = PincodeMaster
        fields = ['id', 'pincode', 'city', 'district', 'state', 'country_code', 'is_assigned']
        read_only_fields = ['id', 'pincode', 'city', 'district', 'state', 'country_code', 'is_assigned']

    def get_is_assigned(self, obj):
        # Pass through the value from the raw SQL (can be 'auto-selected', 'disable', or '')
        return getattr(obj, 'is_assigned', '')

class PincodeZoneAssignmentSerializer(serializers.ModelSerializer):
    # For write operations
    pincode = serializers.CharField(write_only=True)
    
    # For read operations - these fields come from the related pincode
    id = serializers.IntegerField(source='pincode.id', read_only=True)
    pincode_value = serializers.CharField(source='pincode.pincode', read_only=True)
    city = serializers.CharField(source='pincode.city', read_only=True)
    district = serializers.CharField(source='pincode.district', read_only=True)
    state = serializers.CharField(source='pincode.state', read_only=True)
    country_code = serializers.CharField(source='pincode.country_code', read_only=True)
    
    class Meta:
        model = PincodeZoneAssignment
        fields = ['id', 'pincode', 'pincode_value', 'city', 'district', 'state', 'country_code']
        read_only_fields = ('created_at', 'updated_at')
    
    def to_representation(self, instance):
        # Get base representation
        ret = super().to_representation(instance)
        # Rename pincode_value to pincode for the output
        if 'pincode_value' in ret:
            ret['pincode'] = ret.pop('pincode_value')
        return ret
    
    def to_internal_value(self, data):
        # Handle both pincode string and full object
        if isinstance(data, dict):
            pincode_value = None
            
            # If id is provided
            if 'id' in data:
                try:
                    pincode = PincodeMaster.objects.get(id=data['id'])
                    return {'pincode': pincode}
                except PincodeMaster.DoesNotExist:
                    raise serializers.ValidationError({
                        'id': f'Pincode with id {data["id"]} does not exist.'
                    })
            
            # If pincode string is provided
            if 'pincode' in data:
                pincode_value = data['pincode']
            elif isinstance(data.get('pincode_details'), dict) and 'pincode' in data['pincode_details']:
                pincode_value = data['pincode_details']['pincode']
                
            if pincode_value:
                try:
                    pincode = PincodeMaster.objects.get(pincode=pincode_value)
                    return {'pincode': pincode}
                except PincodeMaster.DoesNotExist:
                    raise serializers.ValidationError({
                        'pincode': f'Pincode {pincode_value} does not exist.'
                    })
        
        # Handle simple string case (backwards compatibility)
        if isinstance(data, str) or (isinstance(data, dict) and 'pincode' in data and isinstance(data['pincode'], str)):
            pincode_value = data if isinstance(data, str) else data['pincode']
            try:
                pincode = PincodeMaster.objects.get(pincode=pincode_value)
                return {'pincode': pincode}
            except PincodeMaster.DoesNotExist:
                raise serializers.ValidationError({
                    'pincode': f'Pincode {pincode_value} does not exist.'
                })
                
        return super().to_internal_value(data)

class ShippingZoneSerializer(serializers.ModelSerializer):
    pincodes = PincodeZoneAssignmentSerializer(
        source='assigned_pincodes',
        many=True,
        required=False
    )
    
    class Meta:
        model = ShippingZone
        fields = ['id', 'zone_name', 'description', 'is_active', 'pincodes', 'created_at', 'updated_at']
        read_only_fields = ('created_at', 'updated_at')
    
    def create(self, validated_data):
        pincodes_data = validated_data.pop('assigned_pincodes', [])
        
        with transaction.atomic():
            # First create the zone
            instance = super().create(validated_data)
            
            # Create new assignments
            for pincode_data in pincodes_data:
                PincodeZoneAssignment.objects.create(
                    zone=instance,
                    pincode=pincode_data['pincode'],
                    client_id=instance.client_id,
                    company_id=instance.company_id,
                    created_by=self.context['request'].user.id,
                    updated_by=self.context['request'].user.id
                )
        
        return instance
    
    def update(self, instance, validated_data):
        pincodes_data = validated_data.pop('assigned_pincodes', None)
        instance = super().update(instance, validated_data)
        
        if pincodes_data is not None:
            with transaction.atomic():
                # Get existing assignments
                existing_assignments = instance.assigned_pincodes.select_related('pincode').all()
                existing_pincodes = {str(ass.pincode.pincode): ass for ass in existing_assignments}
                
                # Get new pincodes from request
                new_pincodes = {}
                for pcode_data in pincodes_data:
                    pcode = pcode_data['pincode']  # This is now a PincodeMaster object
                    new_pincodes[str(pcode.pincode)] = pcode
                
                # Find pincodes to remove (in existing but not in new)
                pincodes_to_remove = set(existing_pincodes.keys()) - set(new_pincodes.keys())
                if pincodes_to_remove:
                    instance.assigned_pincodes.filter(
                        pincode__pincode__in=pincodes_to_remove
                    ).delete()
                
                # Find pincodes to add (in new but not in existing)
                pincodes_to_add = set(new_pincodes.keys()) - set(existing_pincodes.keys())
                
                # Create new assignments
                for pincode_str in pincodes_to_add:
                    pincode = new_pincodes[pincode_str]
                    PincodeZoneAssignment.objects.create(
                        zone=instance,
                        pincode=pincode,
                        client_id=instance.client_id,
                        company_id=instance.company_id,
                        created_by=self.context['request'].user.id,
                        updated_by=self.context['request'].user.id
                    )
        
        return instance