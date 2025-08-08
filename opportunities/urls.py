# In opportunities/urls.py
from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    OpportunityViewSet,
    OpportunityStatusViewSet,
    OpportunityRolesViewSet,
    OpportunityTeamMembersViewSet,
    OpportunityTypesViewSet,
    OpportunityLeadSourcesViewSet,
)

router = routers.SimpleRouter()
router.register(r"opportunities", OpportunityViewSet, basename="opportunity")
router.register(
    r"opportunity-statuses", OpportunityStatusViewSet, basename="opportunitystatus"
)
router.register(
    r"opportunity-roles", OpportunityRolesViewSet, basename="opportunityroles"
)
router.register(
    r"opportunity-types", OpportunityTypesViewSet, basename="opportunitytypes"
)
router.register(
    r"opportunity-lead-sources", OpportunityLeadSourcesViewSet, basename="opportunityleadsources"
)

# Nested router for team members within an opportunity
opportunities_router = routers.NestedSimpleRouter(
    router, r"opportunities", lookup="opportunity"
)
opportunities_router.register(
    r"team-members", OpportunityTeamMembersViewSet, basename="opportunity-team-members"
)

urlpatterns = [
    path("", include(router.urls)),
    path("", include(opportunities_router.urls)),
]

app_name = "opportunities"
