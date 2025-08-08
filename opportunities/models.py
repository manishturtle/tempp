from django.db import models
from core.models import BaseTenantModel
from customers.models import Account, Contact


class OpportunityStatus(BaseTenantModel):
    """
    Defines possible statuses for opportunities.
    """

    class StageType(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED_WON = "CLOSED_WON", "Closed Won"
        CLOSED_LOST = "CLOSED_LOST", "Closed Lost"

    name = models.CharField(max_length=100, help_text="Status name")
    desc = models.TextField(
        blank=True, null=True, help_text="Description of the status"
    )
    status = models.BooleanField(
        default=True, help_text="Whether this status is active"
    )
    type = models.CharField(
        max_length=20,
        choices=StageType.choices,
        default=StageType.OPEN,
        help_text="The fundamental system category of the stage.",
    )

    class Meta:
        verbose_name = "Opportunity Status"
        verbose_name_plural = "Opportunity Statuses"
        ordering = ["name"]

    def __str__(self):
        return self.name


class OpportunityRoles(BaseTenantModel):
    """
    Defines possible roles for team members in an opportunity.
    """

    name = models.CharField(max_length=100, help_text="Role name")
    desc = models.TextField(blank=True, null=True, help_text="Description of the role")
    status = models.BooleanField(default=True, help_text="Whether this role is active")

    class Meta:
        verbose_name = "Opportunity Role"
        verbose_name_plural = "Opportunity Roles"
        ordering = ["name"]

    def __str__(self):
        return self.name


class OpportunityTypes(BaseTenantModel):
    """
    Defines possible types for opportunities.
    """

    name = models.CharField(max_length=100, help_text="Type name")
    desc = models.TextField(blank=True, null=True, help_text="Description of the type")
    status = models.BooleanField(default=True, help_text="Whether this type is active")

    class Meta:
        verbose_name = "Opportunity Type"
        verbose_name_plural = "Opportunity Types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class OpportunityLeadSources(BaseTenantModel):
    """
    Defines possible lead sources for opportunities.
    """

    name = models.CharField(max_length=100, help_text="Lead source name")
    desc = models.TextField(
        blank=True, null=True, help_text="Description of the lead source"
    )
    status = models.BooleanField(
        default=True, help_text="Whether this lead source is active"
    )

    class Meta:
        verbose_name = "Opportunity Lead Source"
        verbose_name_plural = "Opportunity Lead Sources"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Opportunity(BaseTenantModel):
    """
    Represents a potential revenue-generating sales deal.
    """

    name = models.CharField(
        max_length=255, help_text="A descriptive name for the deal."
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="opportunities",
        help_text="The Account this deal is with.",
    )
    primary_contact = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opportunities",
        help_text="The main point of contact for this deal.",
    )
    amount = models.DecimalField(
        max_digits=19,
        decimal_places=4,
        help_text="Manually entered estimated value of the deal in the system's default currency.",
    )
    close_date = models.DateField(
        help_text="The expected date when the deal will be won or lost."
    )
    owner = models.BigIntegerField(
        null=True,
        help_text="User ID of the primary user for the opportunity.",
    )
    description = models.TextField(
        blank=True, null=True, help_text="For general notes and details about the deal."
    )
    status = models.ForeignKey(
        OpportunityStatus,
        on_delete=models.PROTECT,
        related_name="opportunities",
        null=True,
        blank=True,
        help_text="The current status of the opportunity.",
    )
    service_ticket_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="The ID of the related service ticket, if any.",
    )
    probability = models.IntegerField(
        default=0,
        help_text="The probability of winning the opportunity (0-100).",
    )
    lead_source = models.ForeignKey(
        OpportunityLeadSources,
        on_delete=models.PROTECT,
        related_name="opportunities",
        null=True,
        blank=True,
        help_text="The lead source of the opportunity.",
    )
    type = models.ForeignKey(
        OpportunityTypes,
        on_delete=models.PROTECT,
        related_name="opportunities",
        null=True,
        blank=True,
        help_text="The type of the opportunity.",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Opportunity"
        verbose_name_plural = "Opportunities"

    def __str__(self):
        return self.name


class OpportunityTeamMembers(BaseTenantModel):
    """
    Maintains a record of team members assigned to an Opportunity.
    """

    class TeamMemberStatus(models.TextChoices):
        ASSIGNED = "ASSIGNED", "Assigned"
        UNASSIGNED = "UNASSIGNED", "Unassigned"

    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name="team_members",
        help_text="The opportunity this team member is assigned to.",
    )
    user_id = models.BigIntegerField(
        help_text="User ID of the assigned team member.",
    )
    assignment_start_date = models.DateField(
        auto_now_add=True,
        help_text="Date when the team member was assigned to the opportunity.",
    )
    assignment_end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when the team member was unassigned from the opportunity.",
    )
    status = models.CharField(
        max_length=20,
        choices=TeamMemberStatus.choices,
        default=TeamMemberStatus.ASSIGNED,
        help_text="Current assignment status of the team member.",
    )
    role = models.ForeignKey(
        OpportunityRoles,
        on_delete=models.PROTECT,
        related_name="team_members",
        help_text="The role of the team member in this opportunity.",
    )

    class Meta:
        verbose_name = "Opportunity Team Member"
        verbose_name_plural = "Opportunity Team Members"
        ordering = ["assignment_start_date"]
        unique_together = [
            "opportunity",
            "user_id",
            "role",
        ]  # Prevent duplicate role assignments

    def __str__(self):
        return f"User {self.user_id} - {self.role} for {self.opportunity.name}"
