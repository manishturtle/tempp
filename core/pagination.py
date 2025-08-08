"""
Custom pagination classes for the API.

This module provides custom pagination classes that can be used with Django REST Framework
to customize the pagination behavior for API responses.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class that uses page and page_size parameters.
    
    This class extends the standard PageNumberPagination to use parameters that
    are more common in frontend frameworks and to provide a more consistent
    response structure.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        """
        Return a paginated response in a format compatible with frontend frameworks.
        
        Args:
            data: The paginated data
            
        Returns:
            Response: A response object with pagination metadata and data
        """
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': int(self.request.query_params.get(self.page_query_param, 1)),
            'page_size': int(self.request.query_params.get(self.page_size_query_param, self.page_size)),
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })
