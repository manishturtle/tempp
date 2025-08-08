from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from erp_backend.middleware import CustomJWTAuthentication
from .models import PincodeMaster, ShippingZone, PincodeZoneAssignment
from .serializers import PincodeMasterSerializer, ShippingZoneSerializer, PincodeZoneAssignmentSerializer

class PincodeMasterViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for managing pincodes.
    """
    queryset = PincodeMaster.objects.all()
    serializer_class = PincodeMasterSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = []
    search_fields = ['pincode', 'city', 'district', 'state']
    ordering_fields = ['pincode', 'city', 'state']
    ordering = ['pincode']
    pagination_class = None  # Disable pagination as requested
    
    @action(detail=False, methods=['get'])
    def unique_values(self, request):
        """
        Returns unique values for country_code, state, and district in a hierarchical structure:
        countries -> states -> districts
        """
        # Using raw SQL for better performance and hierarchical data structure
        from django.db import connection
        
        # Base SQL query to get hierarchical data
        sql_query = """
        WITH countries AS (
            SELECT DISTINCT country_code 
            FROM shipping_zones_pincode_master
            WHERE country_code IS NOT NULL
            ORDER BY country_code
        )
        SELECT 
            p.country_code,
            p.state,
            p.district
        FROM 
            shipping_zones_pincode_master p
        WHERE 
            p.country_code IS NOT NULL
            AND p.state IS NOT NULL
            AND p.district IS NOT NULL
        ORDER BY 
            p.country_code, p.state, p.district
        """
        
        # Execute raw query
        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            rows = cursor.fetchall()
        
        # Process results into hierarchical structure
        result = {}
        for row in rows:
            country_code, state, district = row
            
            # Initialize country if not exists
            if country_code not in result:
                result[country_code] = {}
            
            # Initialize state if not exists
            if state not in result[country_code]:
                result[country_code][state] = []
            
            # Add district to state if not already added
            if district not in result[country_code][state]:
                result[country_code][state].append(district)
        
        return Response(result)
    
    def _get_user_id_from_token(self):
        """Helper method to get user_id from the authenticated user."""
        return getattr(self.request.user, 'id', None) if hasattr(self.request, 'user') else None
    
    def perform_create(self, serializer):
        """Set created_by and updated_by from JWT token."""
        user_id = self._get_user_id_from_token()
        serializer.save(created_by=user_id, updated_by=user_id)

    def perform_update(self, serializer):
        """Set updated_by from JWT token on update."""
        user_id = self._get_user_id_from_token()
        serializer.save(updated_by=user_id)
        
    def destroy(self, request, *args, **kwargs):
        """Soft delete the pincode."""
        instance = self.get_object()
        user_id = self._get_user_id_from_token()
        instance.is_deleted = True
        instance.updated_by = user_id
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        from django.db import connection

        # Extract query parameters
        zone_id = self.request.query_params.get('zone_id')
        params = self.request.query_params
        pincode = params.get('pincode')
        states = params.get('state')
        districts = params.get('district')
        city = params.get('city')

        # Base SQL with CASE logic for is_assigned status
        sql = """
        SELECT 
            pm.id, 
            pm.pincode, 
            pm.city, 
            pm.district, 
            pm.state, 
            pm.country_code,
            CASE
                WHEN pza.zone_id = %s THEN 'auto-selected'
                WHEN pza.zone_id IS NOT NULL THEN 'disable'
                ELSE ''
            END AS is_assigned
        FROM 
            shipping_zones_pincode_master pm
        LEFT JOIN 
            shipping_zone_pincode_assignments pza ON pm.id = pza.pincode_id
        """

        # Initial param list (zone_id used in CASE)
        sql_params = [zone_id]

        # Log the count of pincodes assigned to this zone
        if zone_id:
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("SELECT COUNT(*) FROM shipping_zone_pincode_assignments WHERE zone_id = %s", [zone_id])
                    count = cursor.fetchone()[0]
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Pincodes assigned to zone_id={zone_id}: {count}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not get pincode count for zone_id={zone_id}: {e}")

        # Optional WHERE filters
        filters = []

        if pincode:
            filters.append("pm.pincode = %s")
            sql_params.append(pincode)

        if states:
            state_list = [s.strip() for s in states.split(',') if s.strip()]
            if state_list:
                placeholders = ', '.join(['%s'] * len(state_list))
                filters.append(f"pm.state IN ({placeholders})")
                sql_params.extend(state_list)

        if districts:
            district_list = [d.strip() for d in districts.split(',') if d.strip()]
            if district_list:
                placeholders = ', '.join(['%s'] * len(district_list))
                filters.append(f"pm.district IN ({placeholders})")
                sql_params.extend(district_list)

        if city:
            filters.append("LOWER(pm.city) LIKE LOWER(%s)")
            sql_params.append(f"%{city}%")

        # Append WHERE clause if needed
        if filters:
            sql += " WHERE " + " AND ".join(filters)

        # Order results
        sql += " ORDER BY pm.id"

        # Return RawQuerySet
        return PincodeMaster.objects.raw(sql, sql_params)


class ShippingZoneViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing shipping zones with pincode assignments.
    """
    serializer_class = ShippingZoneSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    ordering = ['-created_at']
    filter_backends = []  # Disable DRF filters since we're using raw SQL
    
    def list(self, request, *args, **kwargs):
        """
        Override list method to handle pagination with raw SQL query results
        """
        zones = self.get_zones_with_pincodes()
        page = self.paginate_queryset(zones)
        
        if page is not None:
            return self.get_paginated_response(page)
        
        return Response(zones)
        
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific zone with pincodes using raw SQL
        """
        zone_id = kwargs.get('pk')
        if not zone_id:
            return Response({"error": "No zone ID provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        zone = self.get_zone_by_id(zone_id)
        if not zone:
            return Response({"error": "Zone not found"}, status=status.HTTP_404_NOT_FOUND)
            
        return Response(zone)
    
    def get_queryset(self):
        """
        Return a Django queryset for operations that need it (like filter_queryset).
        This ensures compatibility with DRF's built-in methods.
        """
        queryset = ShippingZone.objects.all()
        
        # Filter by active status if provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
            
        return queryset
        
    def get_zones_with_pincodes(self):
        """
        Get shipping zones with their pincodes using raw SQL.
        Used for optimized list view.
        """
        from django.db import connection
        import json
        
        # Get query parameters
        is_active = self.request.query_params.get('is_active')
        
        # Base SQL query to get zones
        sql_query = """
        SELECT 
            sz.id, 
            sz.zone_name, 
            sz.description, 
            sz.is_active,
            sz.created_at,
            sz.updated_at
        FROM 
            shipping_zones sz
        """
        
        # Add filtering based on is_active parameter
        where_clauses = []
        params = []
        
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            where_clauses.append("sz.is_active = %s")
            params.append(is_active_bool)
        
        # Add WHERE clause if needed
        if where_clauses:
            sql_query += " WHERE " + " AND ".join(where_clauses)
        
        # Add ordering
        sql_query += " ORDER BY sz.id"
        
        # Execute query to get shipping zones
        with connection.cursor() as cursor:
            cursor.execute(sql_query, params)
            columns = [col[0] for col in cursor.description]
            zones = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # For each zone, fetch its pincodes
        for zone in zones:
            zone['pincodes'] = self.get_pincodes_for_zone(zone['id'])
            
        # Convert datetime objects to strings for JSON serialization
        for zone in zones:
            if 'created_at' in zone and zone['created_at']:
                zone['created_at'] = zone['created_at'].isoformat()
            if 'updated_at' in zone and zone['updated_at']:
                zone['updated_at'] = zone['updated_at'].isoformat()
        
        return zones
        
    def get_zone_by_id(self, zone_id):
        """
        Get a specific shipping zone by ID using raw SQL.
        Used for optimized retrieve view.
        """
        from django.db import connection
        
        # SQL query to get a specific zone
        zone_query = """
        SELECT 
            id, 
            zone_name, 
            description, 
            is_active,
            created_at,
            updated_at
        FROM 
            shipping_zones
        WHERE 
            id = %s
        """
        
        # Execute query
        with connection.cursor() as cursor:
            cursor.execute(zone_query, [zone_id])
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()
            
        if not results:
            return None
            
        # Convert to dict
        zone = dict(zip(columns, results[0]))
        
        # Get pincodes for this zone
        zone['pincodes'] = self.get_pincodes_for_zone(zone_id)
        
        # Convert datetime objects to strings
        if 'created_at' in zone and zone['created_at']:
            zone['created_at'] = zone['created_at'].isoformat()
        if 'updated_at' in zone and zone['updated_at']:
            zone['updated_at'] = zone['updated_at'].isoformat()
            
        return zone
        
    def get_pincodes_for_zone(self, zone_id):
        """
        Get all pincodes for a specific zone using raw SQL.
        """
        from django.db import connection
        
        pincode_query = """
        SELECT 
            pm.id,
            pm.city,
            pm.district,
            pm.state,
            pm.country_code,
            pm.pincode
        FROM 
            shipping_zone_pincode_assignments pza
        JOIN 
            shipping_zones_pincode_master pm ON pza.pincode_id = pm.id
        WHERE 
            pza.zone_id = %s
        """
        
        # Execute query to get pincodes for this zone
        with connection.cursor() as cursor:
            cursor.execute(pincode_query, [zone_id])
            columns = [col[0] for col in cursor.description]
            pincodes = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
        return pincodes
    
    # Pincode assignment logic has been moved to the serializer
    
    def _get_user_id_from_token(self):
        """Helper method to get user_id from the authenticated user."""
        return getattr(self.request.user, 'id', None) if hasattr(self.request, 'user') else None
    
    def perform_create(self, serializer):
        """Set created_by and updated_by from JWT token."""
        user_id = self._get_user_id_from_token()
        serializer.save(created_by=user_id, updated_by=user_id)

    def perform_update(self, serializer):
        """Set updated_by from JWT token on update."""
        user_id = self._get_user_id_from_token()
        serializer.save(updated_by=user_id)

    def create(self, request, *args, **kwargs):
        """
        Create a shipping zone with optional pincode assignments.
        Expected payload:
        {
            "zone_name": "Mumbai Metro",
            "description": "Mumbai and surrounding areas",
            "is_active": true,
            "pincodes": [{"pincode": "400001"}, {"pincode": "400002"}]
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        pincodes_data = request.data.get('pincodes', [])
        user_id = self._get_user_id_from_token()
        
        with transaction.atomic():
            # Create the zone with user_id
            zone = serializer.save(created_by=user_id, updated_by=user_id)
            
            # Create pincode assignments if provided
            if pincodes_data:
                self._update_pincode_assignments(zone, pincodes_data, user_id)
            
            # Re-fetch the zone to include the assigned pincodes in the response
            zone = self.get_queryset().get(pk=zone.pk)
            
        headers = self.get_success_headers(serializer.data)
        return Response(
            self.get_serializer(zone).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def _update_pincode_assignments(self, zone, pincodes_data, user_id):
        """
        Helper method to update pincode assignments for a zone.
        
        Args:
            zone: ShippingZone instance
            pincodes_data: List of pincode data dictionaries
            user_id: ID of the user making the request
        """
        if not pincodes_data:
            return
            
        # Get existing assignments
        existing_assignments = zone.assigned_pincodes.select_related('pincode').all()
        existing_pincodes = {str(ass.pincode.pincode): ass for ass in existing_assignments}
        
        # Get new pincodes from request
        new_pincodes = {}
        for pcode_data in pincodes_data:
            if isinstance(pcode_data, dict) and 'pincode' in pcode_data:
                pcode_str = pcode_data['pincode']
                try:
                    # Build a filter with all available fields to uniquely identify the pincode
                    filter_kwargs = {'pincode': pcode_str}
                    
                    # Add additional filters if they exist in the payload
                    if 'district' in pcode_data and pcode_data['district']:
                        filter_kwargs['district'] = pcode_data['district']
                    if 'state' in pcode_data and pcode_data['state']:
                        filter_kwargs['state'] = pcode_data['state']
                    if 'country_code' in pcode_data and pcode_data['country_code']:
                        filter_kwargs['country_code'] = pcode_data['country_code']
                    
                    # Try to get a unique pincode with the given filters
                    try:
                        pincode = PincodeMaster.objects.get(**filter_kwargs)
                    except PincodeMaster.MultipleObjectsReturned:
                        # If still multiple results, add more logging and pick the first one
                        pincodes = PincodeMaster.objects.filter(**filter_kwargs)
                        print(f"Multiple pincodes found for {filter_kwargs}, using first one: {pincodes.first()}")
                        pincode = pincodes.first()
                    
                    # Use a composite key for the dict to avoid overwriting
                    composite_key = f"{pcode_str}_{pincode.district}_{pincode.state}_{pincode.country_code}"
                    new_pincodes[composite_key] = pincode
                except PincodeMaster.DoesNotExist:
                    continue
        
        # Convert existing pincode keys to composite keys for comparison
        existing_composite_keys = {}
        for pincode_str, assignment in existing_pincodes.items():
            pincode_obj = assignment.pincode
            composite_key = f"{pincode_obj.pincode}_{pincode_obj.district}_{pincode_obj.state}_{pincode_obj.country_code}"
            existing_composite_keys[composite_key] = assignment
        
        # Find pincodes to remove (in existing but not in new)
        pincodes_to_remove = set(existing_composite_keys.keys()) - set(new_pincodes.keys())
        
        # Delete removed assignments
        if pincodes_to_remove:
            for composite_key in pincodes_to_remove:
                assignment = existing_composite_keys[composite_key]
                assignment.delete()
        
        # Find pincodes to add (in new but not in existing)
        pincodes_to_add = set(new_pincodes.keys()) - set(existing_composite_keys.keys())
        
        # Create new assignments
        for composite_key in pincodes_to_add:
            pincode = new_pincodes[composite_key]
            PincodeZoneAssignment.objects.create(
                zone=zone,
                pincode=pincode,
                client_id=zone.client_id,
                company_id=zone.company_id,
                created_by=user_id,
                updated_by=user_id
            )
    
    def update(self, request, *args, **kwargs):
        """
        Update a shipping zone and its pincode assignments using raw SQL.
        If pincodes are provided, they will replace all existing assignments.
        """
        from django.db import connection, transaction
        import json
        
        zone_id = kwargs.get('pk')
        if not zone_id:
            return Response({"error": "No zone ID provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        # First get the original zone to confirm it exists
        instance = self.get_zone_by_id(zone_id)
        if not instance:
            return Response({"error": "Zone not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Get data from request
        zone_name = request.data.get('zone_name')
        description = request.data.get('description')
        is_active = request.data.get('is_active')
        pincodes_data = request.data.get('pincodes', [])
        
        user_id = self._get_user_id_from_token()
        
        # Begin transaction
        with transaction.atomic():
            # Update zone
            update_query = """
            UPDATE shipping_zones
            SET 
              updated_at = NOW(),
              updated_by = %s
            """
            
            params = [user_id]
            set_clauses = []
            
            if zone_name is not None:
                set_clauses.append("zone_name = %s")
                params.append(zone_name)
                
            if description is not None:
                set_clauses.append("description = %s")
                params.append(description)
                
            if is_active is not None:
                set_clauses.append("is_active = %s")
                params.append(is_active)
                
            if set_clauses:
                update_query += ", " + ", ".join(set_clauses)
                
            update_query += " WHERE id = %s"
            params.append(zone_id)
            
            # Execute update query
            with connection.cursor() as cursor:
                cursor.execute(update_query, params)
            
            # Handle pincode assignments if provided
            if pincodes_data:
                # First delete existing assignments
                delete_query = "DELETE FROM shipping_zone_pincode_assignments WHERE zone_id = %s"
                with connection.cursor() as cursor:
                    cursor.execute(delete_query, [zone_id])
                
                # Then create new assignments
                for pincode_data in pincodes_data:
                    pincode = pincode_data.get('pincode')
                    if not pincode:
                        continue
                        
                    # Find the pincode in the master table
                    pincode_query = """
                    SELECT id FROM shipping_zones_pincode_master 
                    WHERE pincode = %s LIMIT 1
                    """
                    
                    pincode_id = None
                    with connection.cursor() as cursor:
                        cursor.execute(pincode_query, [pincode])
                        result = cursor.fetchone()
                        if result:
                            pincode_id = result[0]
                    
                    if pincode_id:
                        # Insert assignment
                        insert_query = """
                        INSERT INTO shipping_zone_pincode_assignments 
                        (zone_id, pincode_id, client_id, company_id, created_by, updated_by, created_at, updated_at) 
                        VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                        """
                        
                        # Get client_id and company_id from zone
                        client_id = 1  # Default, replace with actual logic to get client_id
                        company_id = 1  # Default, replace with actual logic to get company_id
                        
                        with connection.cursor() as cursor:
                            cursor.execute(insert_query, [zone_id, pincode_id, client_id, company_id, user_id, user_id])
        
        # Get updated zone
        updated_zone = self.get_zone_by_id(zone_id)
        return Response(updated_zone)
        
    def _get_user_id_from_token(self):
        """
        Extract user ID from JWT token in the request.
        """
        user = self.request.user
        if user and user.is_authenticated:
            return user.id
        return None
    
    @action(detail=True, methods=['get'])
    def pincodes(self, request, pk=None):
        """
        Get all pincodes assigned to this zone.
        """
        zone = self.get_object()
        pincodes = zone.assigned_pincodes.select_related('pincode').all()
        return Response([{
            'pincode': pa.pincode.pincode,
            'city': pa.pincode.city,
            'district': pa.pincode.district,
            'state': pa.pincode.state,
            'country_code': pa.pincode.country_code
        } for pa in pincodes])
        
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get shipping zone statistics.
        
        Response includes:
        - total: Total number of zones
        - active: Number of active zones
        - inactive: Number of inactive zones
        """
        from django.db import connection
        
        # Use SQL to get statistics directly
        statistics_query = """
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count
        FROM 
            shipping_zones
        """
        
        with connection.cursor() as cursor:
            cursor.execute(statistics_query)
            result = cursor.fetchone()
            total = result[0] if result[0] else 0
            active_count = result[1] if result[1] else 0
        
        return Response({
            'total': total,
            'active': active_count,
            'inactive': total - active_count
        })