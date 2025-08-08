from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from products.catalogue.models import Division, Category, Subcategory
from products.catalogue.serializers import DivisionSerializer, CategorySerializer, SubcategorySerializer
from .models import HeaderConfiguration, HeaderDivisionOrder


class HeaderDivisionOrderSerializer(serializers.ModelSerializer):
    """
    Serializer for the HeaderDivisionOrder model.
    """
    class Meta:
        model = HeaderDivisionOrder
        fields = ['id', 'division', 'order']


class DivisionWithCategoriesSerializer(DivisionSerializer):
    """
    Serializer for the Division model that includes nested categories and subcategories.
    This provides the full navigation tree for the mega menu.
    """
    categories = serializers.SerializerMethodField()
    
    class Meta(DivisionSerializer.Meta):
        fields = DivisionSerializer.Meta.fields + ['categories']
    
    def get_categories(self, obj):
        """
        Get categories with their subcategories for this division.
        """
        categories = Category.objects.filter(
            division=obj,
            is_active=True,
            client_id=obj.client_id
        ).prefetch_related('subcategories')
        
        return CategoryWithSubcategoriesSerializer(categories, many=True).data


class CategoryWithSubcategoriesSerializer(CategorySerializer):
    """
    Serializer for the Category model that includes nested subcategories.
    """
    subcategories = SubcategorySerializer(many=True, read_only=True)
    
    class Meta(CategorySerializer.Meta):
        fields = CategorySerializer.Meta.fields + ['subcategories']


class SimpleDivisionSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for Division model with only basic information.
    """
    class Meta:
        model = Division
        fields = ['id', 'name']


class HeaderConfigurationSimpleSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for retrieving header configuration with only basic division info.
    """
    divisions = serializers.SerializerMethodField()
    
    class Meta:
        model = HeaderConfiguration
        fields = ['id', 'name', 'divisions']
    
    def get_divisions(self, obj):
        """
        Get divisions ordered by the HeaderDivisionOrder model with only basic info.
        """
        # Get the ordered divisions
        ordered_divisions = HeaderDivisionOrder.objects.filter(
            header_config=obj,
            client_id=obj.client_id
        ).select_related('division').order_by('order')
        
        # Map to the actual Division objects
        divisions = [order.division for order in ordered_divisions if order.division.is_active]
        
        # Serialize with the simplified serializer
        return SimpleDivisionSerializer(divisions, many=True).data


class HeaderConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving header configuration with ordered divisions.
    """
    divisions = serializers.SerializerMethodField()
    
    class Meta:
        model = HeaderConfiguration
        fields = ['id', 'name', 'divisions']
    
    def get_divisions(self, obj):
        """
        Get divisions ordered by the HeaderDivisionOrder model.
        """
        # Get the ordered divisions
        ordered_divisions = HeaderDivisionOrder.objects.filter(
            header_config=obj,
            client_id=obj.client_id
        ).select_related('division').order_by('order')
        
        # Map to the actual Division objects
        divisions = [order.division for order in ordered_divisions if order.division.is_active]
        
        # Serialize with the nested serializer that includes categories and subcategories
        return DivisionWithCategoriesSerializer(divisions, many=True).data


class HeaderConfigurationUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating header configuration with a list of division IDs.
    """
    division_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text=_("List of division IDs in the desired order")
    )
    
    def validate_division_ids(self, value):
        """
        Validate that all division IDs exist and belong to the same client.
        """
        client_id = self.context.get('client_id', 1)
        
        # Ensure all division IDs exist
        found_divisions = Division.objects.filter(
            id__in=value,
            client_id=client_id
        )
        
        if len(found_divisions) != len(value):
            found_ids = set(div.id for div in found_divisions)
            missing_ids = set(value) - found_ids
            raise serializers.ValidationError(
                _("The following division IDs do not exist: {}").format(list(missing_ids))
            )
        
        return value
