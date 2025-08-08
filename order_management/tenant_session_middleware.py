# my_platform/middleware/tenant_session_middleware.py

from django.conf import settings

class TenantSessionMiddleware:
    """
    Dynamically sets the SESSION_COOKIE_NAME based on the tenant slug in the URL.
    This ensures each tenant gets a separate session cookie, preventing cart collision.
    e.g., /tenant1/ gets 'tenant1_sessionid', /tenant2/ gets 'tenant2_sessionid'.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # The tenant_slug is expected to be captured in the URL pattern
        # and added to the request by a preceding middleware or the URL resolver.
        # Let's assume your URL resolver makes it available in request.resolver_match.
        
        tenant_slug = request.resolver_match.kwargs.get('tenant_slug')

        if tenant_slug:
            # Sanitize the slug to ensure it's a valid cookie name prefix
            safe_tenant_prefix = ''.join(filter(str.isalnum, tenant_slug))
            
            # Set a unique session cookie name for this request's lifecycle
            request.session.session_cookie_name = f"{safe_tenant_prefix}_sessionid"
        else:
            # Fallback to the default session cookie name if no tenant is identified
            request.session.session_cookie_name = settings.SESSION_COOKIE_NAME

        response = self.get_response(request)

        return response