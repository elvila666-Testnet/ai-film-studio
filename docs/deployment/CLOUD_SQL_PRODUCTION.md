# Cloud SQL Production Configuration & Security Hardening

**Version:** 1.0  
**Author:** Manus AI  
**Last Updated:** January 31, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Introduction](#introduction)
2. [Security Configuration](#security-configuration)
3. [Performance Tuning](#performance-tuning)
4. [Connection Management](#connection-management)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Backup & Recovery](#backup--recovery)
7. [Disaster Recovery](#disaster-recovery)
8. [Compliance & Auditing](#compliance--auditing)

---

## Introduction

This guide provides comprehensive instructions for configuring Cloud SQL for production use with AI Film Studio. Production databases require careful attention to security, performance, and reliability. This document covers all aspects of hardening your Cloud SQL instance for enterprise-grade deployment.

### Production Requirements

A production database must meet several critical requirements. Security is paramount—all data must be encrypted in transit and at rest, with strict access controls preventing unauthorized access. Performance must be optimized to handle peak loads without degradation. High availability requires automated failover and redundancy across multiple zones. Compliance requires audit logging and data retention policies. Disaster recovery requires automated backups and point-in-time recovery capabilities.

---

## Security Configuration

### Network Security

**Private IP Configuration**

For production deployments, Cloud SQL instances should use private IP addresses to prevent direct internet access. Configure private IP by creating a VPC and connecting Cloud SQL to it:

```bash
gcloud sql instances patch ai-film-studio-db \
    --network=ai-film-studio-vpc \
    --no-assign-ip
```

This removes the public IP address and ensures all connections go through your VPC. Applications connect via Cloud SQL Proxy or VPC connector.

**SSL/TLS Enforcement**

Enforce SSL/TLS for all database connections:

```bash
gcloud sql instances patch ai-film-studio-db \
    --require-ssl
```

This requires all connections to use SSL certificates, preventing unencrypted data transmission.

**Cloud SQL Proxy**

For applications outside your VPC, use Cloud SQL Proxy for secure connections:

```bash
cloud_sql_proxy -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:3306
```

Cloud SQL Proxy handles authentication and encryption automatically.

### User & Authentication

**IAM Database Authentication**

Enable IAM database authentication for service accounts:

```bash
gcloud sql instances patch ai-film-studio-db \
    --database-flags=cloudsql_iam_authentication=on
```

This allows service accounts to authenticate without storing passwords.

**User Permissions**

Create users with minimal required permissions:

```sql
-- Application user (read/write to application database only)
CREATE USER 'app_user'@'%' IDENTIFIED BY 'strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_film_studio.* TO 'app_user'@'%';

-- Read-only user (for analytics/reporting)
CREATE USER 'analytics_user'@'%' IDENTIFIED BY 'strong-password';
GRANT SELECT ON ai_film_studio.* TO 'analytics_user'@'%';

-- Admin user (for maintenance, restricted access)
CREATE USER 'admin_user'@'%' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON ai_film_studio.* TO 'admin_user'@'%';
GRANT SUPER ON *.* TO 'admin_user'@'%';

FLUSH PRIVILEGES;
```

**Password Policy**

Enforce strong passwords with complexity requirements:

```sql
-- Set password validation plugin
INSTALL PLUGIN validate_password SONAME 'validate_password.so';

-- Configure password policy
SET GLOBAL validate_password.policy='STRONG';
SET GLOBAL validate_password.length=12;
SET GLOBAL validate_password.mixed_case_count=1;
SET GLOBAL validate_password.number_count=1;
SET GLOBAL validate_password.special_char_count=1;
```

### Encryption

**At-Rest Encryption**

Cloud SQL encrypts data at rest by default using Google-managed keys. For additional control, use customer-managed encryption keys (CMEK):

```bash
gcloud sql instances patch ai-film-studio-db \
    --cmek-key=projects/PROJECT_ID/locations/REGION/keyRings/KEY_RING/cryptoKeys/KEY
```

**In-Transit Encryption**

All connections use TLS 1.2 or higher. Verify by checking connection properties:

```bash
gcloud sql instances describe ai-film-studio-db --format='value(settings.ipConfiguration.requireSsl)'
```

Should return `True`.

---

## Performance Tuning

### Buffer Pool Configuration

The InnoDB buffer pool is the most important performance parameter:

```bash
gcloud sql instances patch ai-film-studio-db \
    --database-flags=innodb_buffer_pool_size=2147483648
```

Set to 50-75% of instance memory. For db-n1-standard-1 (3.75 GB), use 2-3 GB.

### Log File Size

Increase log file size for better write performance:

```bash
gcloud sql instances patch ai-film-studio-db \
    --database-flags=innodb_log_file_size=536870912
```

Set to 25-30% of buffer pool size.

### Query Optimization

Enable slow query logging to identify performance issues:

```bash
gcloud sql instances patch ai-film-studio-db \
    --database-flags=slow_query_log=on,long_query_time=2
```

Queries taking longer than 2 seconds are logged for analysis.

### Connection Pooling

Configure maximum connections based on workload:

```bash
gcloud sql instances patch ai-film-studio-db \
    --database-flags=max_connections=1000
```

Monitor connection usage and adjust as needed.

### Index Optimization

Create indexes on frequently queried columns:

```sql
-- Indexes for projects table
CREATE INDEX idx_projects_user_id ON projects(userId);
CREATE INDEX idx_projects_brand_id ON projects(brandId);
CREATE INDEX idx_projects_created_at ON projects(createdAt);

-- Indexes for brands table
CREATE INDEX idx_brands_user_id ON brands(userId);
CREATE INDEX idx_brands_created_at ON brands(createdAt);

-- Indexes for project content
CREATE INDEX idx_project_content_project_id ON projectContent(projectId);
CREATE INDEX idx_project_content_type ON projectContent(contentType);
CREATE INDEX idx_project_content_status ON projectContent(status);
```

---

## Connection Management

### Connection Pooling

Use connection pooling to reduce overhead:

```javascript
// Node.js example with mysql2/promise
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});
```

### Connection Timeout

Set appropriate connection timeouts:

```bash
gcloud sql instances patch ai-film-studio-db \
    --database-flags=wait_timeout=900,interactive_timeout=900
```

Closes idle connections after 15 minutes.

### Monitoring Connections

Monitor active connections:

```sql
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads%';
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Utilization | >80% | Scale up instance |
| Memory Utilization | >90% | Increase buffer pool or scale up |
| Disk Utilization | >85% | Increase storage or archive old data |
| Connections | >80% of max | Increase max_connections or add pooling |
| Replication Lag | >5 seconds | Investigate replication issues |
| Slow Queries | >10 per minute | Analyze and optimize queries |

### Setting Up Alerts

Create alerts for critical metrics:

```bash
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="Cloud SQL CPU >80%" \
    --condition-display-name="High CPU" \
    --condition-threshold-value=80 \
    --condition-threshold-duration=300s
```

### Logging

Enable and review logs regularly:

```bash
# View recent logs
gcloud sql operations list --instance=ai-film-studio-db --limit=10

# Export logs to Cloud Storage
gcloud logging sinks create cloud-sql-logs \
    gs://ai-film-studio-logs \
    --log-filter='resource.type="cloudsql_database"'
```

---

## Backup & Recovery

### Automated Backups

Configure automated backups for production:

```bash
gcloud sql instances patch ai-film-studio-db \
    --backup-start-time=02:00 \
    --retained-backups-count=30 \
    --transaction-log-retention-days=7
```

This creates daily backups at 2:00 AM UTC, retains 30 backups, and enables point-in-time recovery for 7 days.

### Manual Backups

Create manual backups before major changes:

```bash
gcloud sql backups create \
    --instance=ai-film-studio-db \
    --description="Pre-deployment backup"
```

### Backup Verification

Regularly test backup restoration:

```bash
# Create test instance from backup
gcloud sql backups restore BACKUP_ID \
    --backup-instance=ai-film-studio-db \
    --backup-configuration=default

# Verify data integrity
mysql -h TEST_INSTANCE_IP -u root -p ai_film_studio -e "SELECT COUNT(*) FROM projects;"
```

---

## Disaster Recovery

### Recovery Time Objective (RTO)

Target recovery time is 30 minutes. This includes:
- Detection of failure (5 minutes)
- Backup restoration (15 minutes)
- Application restart and verification (10 minutes)

### Recovery Point Objective (RPO)

Target recovery point is 1 hour. Automated backups run hourly, and transaction logs enable point-in-time recovery.

### Failover Procedure

1. **Detect Failure** — Monitoring alerts indicate database unavailability
2. **Assess Damage** — Check Cloud SQL console for error messages
3. **Restore from Backup** — Create new instance from latest backup
4. **Verify Data** — Check data integrity and completeness
5. **Update Connection Strings** — Point application to new instance
6. **Restart Application** — Restart services to reconnect
7. **Monitor** — Watch for errors and performance issues

### Testing Disaster Recovery

Monthly disaster recovery drills should be conducted:

```bash
# Create test instance from backup
gcloud sql backups restore BACKUP_ID \
    --backup-instance=ai-film-studio-db

# Run test queries
mysql -h TEST_INSTANCE_IP -u root -p ai_film_studio << EOF
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as brand_count FROM brands;
EOF

# Document results and time taken
```

---

## Compliance & Auditing

### Audit Logging

Enable audit logging for compliance:

```bash
gcloud sql instances patch ai-film-studio-db \
    --database-flags=general_log=on,log_output=TABLE
```

Review audit logs regularly:

```sql
SELECT * FROM mysql.general_log 
WHERE event_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY event_time DESC;
```

### Data Retention

Implement data retention policies:

```sql
-- Archive old projects (older than 2 years)
CREATE TABLE projects_archive LIKE projects;
INSERT INTO projects_archive 
SELECT * FROM projects 
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 2 YEAR);

DELETE FROM projects 
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

### Compliance Checklist

- [ ] All connections use SSL/TLS
- [ ] Private IP configured for production
- [ ] IAM authentication enabled
- [ ] Automated backups running daily
- [ ] Audit logging enabled
- [ ] Monitoring and alerts configured
- [ ] Disaster recovery tested monthly
- [ ] Data retention policies documented
- [ ] Access controls reviewed quarterly
- [ ] Encryption keys secured and rotated annually

---

## Troubleshooting

### Connection Refused

**Symptom:** Applications cannot connect to database

**Solution:** Verify VPC connector is running, Cloud SQL instance is accessible, and firewall rules allow traffic.

### Slow Queries

**Symptom:** Application performance degrades

**Solution:** Enable slow query logging, analyze query plans, add indexes, and optimize queries.

### Disk Space Full

**Symptom:** Database stops accepting writes

**Solution:** Enable automatic storage scaling, archive old data, or increase storage limit.

### High CPU Usage

**Symptom:** Database CPU consistently above 80%

**Solution:** Optimize queries, add indexes, increase buffer pool, or scale up instance.

---

## Next Steps

1. **Execute Setup Script** — Run `./scripts/setup-cloud-sql.sh` to create and configure the instance
2. **Run Migrations** — Execute `./scripts/init-database.sh` to initialize the database
3. **Configure Monitoring** — Set up Cloud Monitoring dashboards and alerts
4. **Test Backups** — Verify backups work by restoring to a test instance
5. **Document Procedures** — Create runbooks for common operations

---

**End of Cloud SQL Production Configuration Guide**

**Version:** 1.0  
**Last Updated:** January 31, 2026  
**Next Review:** April 31, 2026
