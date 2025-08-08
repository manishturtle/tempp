# PostgreSQL Configuration Requirements for Qrosity

This document outlines the specific PostgreSQL configuration requirements focusing on backups, disaster recovery, encryption, and multi-tenancy considerations aligned with the project's Non-Functional Requirements (NFRs).

## Database Specifications

- **Database Engine**: PostgreSQL
- **Current Configuration**: As defined in Django settings (erp_backend/settings.py)
- **Multi-Tenancy Implementation**: django-tenant-schemas

## NFR: Data Backup & Recovery

### Recovery Objectives
- **Recovery Point Objective (RPO)**: 1 hour
  - *Maximum acceptable data loss in case of a failure*
- **Recovery Time Objective (RTO)**: 4 hours
  - *Maximum acceptable time to restore service after a failure*

> **Note**: These RPO/RTO values are placeholders and should be confirmed with business stakeholders based on business criticality and cost considerations.

### Backup Strategy

#### For Managed PostgreSQL Services (AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL)

1. **Point-in-Time Recovery (PITR) Configuration**:
   - Enable continuous backup with transaction log archiving
   - Set backup retention period to 30 days (or as required by compliance)
   - Configure automated snapshots every 1 hour to meet RPO requirements

2. **Implementation Steps**:
   ```bash
   # Example AWS CLI command to modify an RDS instance for PITR
   aws rds modify-db-instance \
     --db-instance-identifier qrosity-db \
     --backup-retention-period 30 \
     --preferred-backup-window "00:00-01:00" \
     --enable-performance-insights \
     --apply-immediately
   ```

#### For Self-Hosted PostgreSQL

1. **Physical Backup Configuration**:
   - Implement pg_basebackup for full database backups
   - Configure WAL archiving for continuous Point-in-Time Recovery
   - Schedule backups to meet the 1-hour RPO

2. **Implementation Example**:
   - Configure postgresql.conf for WAL archiving:
     ```
     wal_level = replica
     archive_mode = on
     archive_command = 'test ! -f /path/to/archive/%f && cp %p /path/to/archive/%f'
     ```

   - Create a backup script (to be scheduled with cron):
     ```bash
     #!/bin/bash
     # Backup script for PostgreSQL
     
     BACKUP_DIR="/path/to/backups"
     TIMESTAMP=$(date +%Y%m%d_%H%M%S)
     
     # Create full backup
     pg_basebackup -D "${BACKUP_DIR}/base_${TIMESTAMP}" -Ft -z -P
     
     # Retention: Keep backups for 30 days
     find ${BACKUP_DIR} -type d -name "base_*" -mtime +30 -exec rm -rf {} \;
     ```

   - Schedule with cron (hourly backups):
     ```
     0 * * * * /path/to/backup_script.sh
     ```

3. **Backup Storage Requirements**:
   - Store backups in a separate storage system (e.g., S3, Azure Blob Storage, GCP Cloud Storage)
   - Implement encryption for backup files
   - Ensure backup storage is in a different geographic location than the primary database

## NFR: Disaster Recovery (DR)

### Replication Strategy

1. **High Availability (HA) Configuration**:
   - Implement PostgreSQL streaming replication with at least one standby server
   - Place standby server in a different Availability Zone within the same region
   - Configure synchronous replication for critical workloads to prevent data loss

2. **Disaster Recovery Configuration**:
   - Deploy an additional standby server in a different geographic region
   - Configure asynchronous replication to minimize performance impact
   - Ensure this replica can also serve as a backup storage location

3. **Implementation Example** (postgresql.conf on primary):
   ```
   # Replication settings
   wal_level = replica
   max_wal_senders = 10
   wal_keep_segments = 64
   max_replication_slots = 10
   
   # For synchronous replication (optional)
   synchronous_standby_names = 'standby_server_1'
   ```

### Failover Procedure

1. **Automated Failover** (recommended for managed services):
   - Configure automated failover using the managed service's capabilities
   - Test failover procedure quarterly to ensure RTO compliance

2. **Manual Failover** (for self-hosted PostgreSQL):
   - Document step-by-step procedure for promoting a standby to primary
   - Ensure database connection strings can be updated quickly (DNS or load balancer)
   - Practice failover procedure quarterly to ensure team readiness

3. **Failover Testing Schedule**:
   - Conduct planned failover tests quarterly
   - Document results and optimize procedure to meet 4-hour RTO

## NFR: Security (Encryption at Rest)

### Encryption Requirements

1. **For Managed PostgreSQL Services**:
   - Enable encryption at rest during instance creation
   - Use service-specific key management (AWS KMS, Google KMS, Azure Key Vault)
   - Rotate encryption keys annually or as required by compliance

2. **For Self-Hosted PostgreSQL**:
   - Implement filesystem-level encryption (LUKS for Linux, BitLocker for Windows)
   - For cloud deployments, use encrypted volumes (e.g., encrypted EBS volumes on AWS)
   - Ensure key management procedures are documented and tested

3. **Implementation Verification**:
   - Document verification method to confirm encryption is active
   - Include encryption status in security compliance reports

## Multi-Tenancy Schema Confirmation

The django-tenant-schemas package implements a PostgreSQL schema-based approach to multi-tenancy with the following structure:

1. **Public Schema**:
   - Contains shared tables: `tenants_tenant`, `tenants_domain`
   - Stores tenant metadata and domain routing information

2. **Tenant-Specific Schemas**:
   - Named according to tenant identifier (e.g., `tenant_xyz`)
   - Contains all tenant-specific application data:
     - User accounts and profiles
     - Product categories and inventory
     - All other business data

3. **Schema Isolation**:
   - Each tenant's data is isolated in its own schema
   - Cross-tenant queries are not possible without explicit schema specification
   - Shared functionality is achieved through the public schema

4. **Verification Query**:
   ```sql
   -- To verify schema structure
   SELECT nspname FROM pg_catalog.pg_namespace 
   WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema';
   ```

## Required PostgreSQL Extensions

The following PostgreSQL extensions should be enabled for the database:

1. **uuid-ossp**: For UUID generation (if using UUID primary keys)
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

2. **pg_stat_statements**: For query performance monitoring
   ```sql
   CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
   ```

3. **pg_cron** (for self-hosted PostgreSQL only): For scheduling database maintenance tasks
   ```sql
   CREATE EXTENSION IF NOT EXISTS "pg_cron";
   ```

4. **Extension Verification**:
   ```sql
   -- To verify installed extensions
   SELECT extname FROM pg_extension;
   ```

## Implementation Checklist

- [ ] Confirm RPO/RTO values with business stakeholders
- [ ] Implement and test backup strategy
- [ ] Configure replication for HA and DR
- [ ] Enable and verify encryption at rest
- [ ] Document and test failover procedures
- [ ] Verify multi-tenant schema structure
- [ ] Enable required PostgreSQL extensions
- [ ] Schedule regular backup and DR testing

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [django-tenant-schemas Documentation](https://django-tenant-schemas.readthedocs.io/)
- [PostgreSQL Backup and Recovery](https://www.postgresql.org/docs/current/backup.html)
- [PostgreSQL High Availability](https://www.postgresql.org/docs/current/high-availability.html)
