from rest_framework import serializers
from customers.serializers import AccountNestedSerializer, ContactNestedSerializer
from .models import (
    Opportunity,
    OpportunityStatus,
    OpportunityRoles,
    OpportunityTeamMembers,
    OpportunityTypes,
    OpportunityLeadSources,
)
from customers.models import Account, Contact


class OpportunityStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunityStatus
        fields = [
            "id",
            "name",
            "desc",
            "status",
            "type",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class OpportunityRolesSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunityRoles
        fields = [
            "id",
            "name",
            "desc",
            "status",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class OpportunityTypesSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunityTypes
        fields = [
            "id",
            "name",
            "desc",
            "status",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class OpportunityLeadSourcesSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunityLeadSources
        fields = [
            "id",
            "name",
            "desc",
            "status",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class OpportunityTeamMembersSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = OpportunityTeamMembers
        fields = [
            "id",
            "user_id",
            "assignment_start_date",
            "assignment_end_date",
            "status",
            "role",
            "role_name",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "assignment_start_date",
            "assignment_end_date",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class TeamMemberInputSerializer(serializers.ModelSerializer):
    """Serializer for accepting team members during Opportunity creation"""
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=OpportunityRoles.objects.all(),
        source="role",
        write_only=True
    )
    
    class Meta:
        model = OpportunityTeamMembers
        fields = ["user_id", "status", "role_id", "assignment_start_date", "assignment_end_date"]
        # Now allowing assignment_start_date and assignment_end_date to be set from frontend


class OpportunitySerializer(serializers.ModelSerializer):
    # Read-only nested representations for GET requests
    account = AccountNestedSerializer(read_only=True)
    primary_contact = ContactNestedSerializer(read_only=True, allow_null=True)
    status = OpportunityStatusSerializer(read_only=True)
    lead_source = OpportunityLeadSourcesSerializer(read_only=True, allow_null=True)
    type = OpportunityTypesSerializer(read_only=True, allow_null=True)
    team_members = OpportunityTeamMembersSerializer(many=True, read_only=True)

    # Write-only field for team members during creation
    team_members_data = TeamMemberInputSerializer(
        many=True, write_only=True, required=False
    )

    # Use PrimaryKeyRelatedField for writes to accept IDs
    account_id = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(), source="account", write_only=True
    )
    primary_contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source="primary_contact",
        write_only=True,
        allow_null=True,
        required=False,
    )
    status_id = serializers.PrimaryKeyRelatedField(
        queryset=OpportunityStatus.objects.all(),
        source="status",
        write_only=True,
        required=False,
        allow_null=True,
    )
    lead_source_id = serializers.PrimaryKeyRelatedField(
        queryset=OpportunityLeadSources.objects.all(),
        source="lead_source",
        write_only=True,
        required=False,
        allow_null=True,
    )
    type_id = serializers.PrimaryKeyRelatedField(
        queryset=OpportunityTypes.objects.all(),
        source="type",
        write_only=True,
        required=False,
        allow_null=True,
    )
    # Using owner and service_ticket_id as BigIntegerField to match the model definition
    owner = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "name",
            "account",
            "account_id",
            "primary_contact",
            "primary_contact_id",
            "amount",
            "close_date",
            "probability",
            "status",
            "status_id",
            "lead_source",
            "lead_source_id",
            "type",
            "type_id",
            "owner",
            "description",
            "team_members",
            "team_members_data",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )

    def validate(self, attrs):
        return attrs

    def create(self, validated_data):
        # Extract team members data if present
        team_members_data = validated_data.pop("team_members_data", [])

        # Create the opportunity
        opportunity = Opportunity.objects.create(**validated_data)

        # Create team members if provided
        if team_members_data:
            team_members = []
            for member_data in team_members_data:
                # Add opportunity reference and user metadata
                member_data["opportunity"] = opportunity
                member_data["created_by"] = validated_data.get("created_by")
                member_data["updated_by"] = validated_data.get("updated_by")

                team_members.append(OpportunityTeamMembers(**member_data))

            # Bulk create all team members
            if team_members:
                OpportunityTeamMembers.objects.bulk_create(team_members)

        return opportunity

    def update(self, instance, validated_data):
        # Extract team members data if present
        team_members_data = validated_data.pop("team_members_data", None)

        # Update the opportunity fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update team members if provided
        if team_members_data is not None:
            # If we received an empty list, remove all team members
            if not team_members_data:
                instance.team_members.all().delete()
            else:
                # Get existing team members as a dictionary by user_id and role
                existing_members = {}
                for member in instance.team_members.all():
                    # Create a unique key based on user_id and role
                    key = f"{member.user_id}_{member.role_id}"
                    existing_members[key] = member

                # Process incoming team member data
                to_create = []
                updated_keys = set()

                for member_data in team_members_data:
                    user_id = member_data.get("user_id")
                    role_id = member_data.get("role")
                    status = member_data.get("status")
                    key = f"{user_id}_{role_id}"

                    # Add user metadata
                    member_data["updated_by"] = validated_data.get("updated_by")

                    # Check if this is an existing member
                    if key in existing_members:
                        # Update existing member
                        member = existing_members[key]
                        member.status = status
                        member.updated_by = validated_data.get("updated_by")
                        member.save()
                        updated_keys.add(key)
                    else:
                        # Prepare data for new member
                        member_data["opportunity"] = instance
                        member_data["created_by"] = validated_data.get("updated_by")
                        to_create.append(OpportunityTeamMembers(**member_data))

                # Delete members not in the update
                for key, member in existing_members.items():
                    if key not in updated_keys:
                        member.delete()

                # Bulk create new members
                if to_create:
                    OpportunityTeamMembers.objects.bulk_create(to_create)

        return instance
