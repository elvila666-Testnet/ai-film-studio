# Operational Runbooks & Incident Response

**Version:** 1.0  
**Last Updated:** February 1, 2026  
**Status:** PRODUCTION READY  

---

## Table of Contents

1. [Incident Response Framework](#incident-response-framework)
2. [Common Incidents & Resolutions](#common-incidents--resolutions)
3. [Escalation Procedures](#escalation-procedures)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Disaster Recovery](#disaster-recovery)
6. [Post-Incident Reviews](#post-incident-reviews)

---

## Incident Response Framework

### Severity Levels

| Level | Impact | Response Time | Escalation |
|-------|--------|---------------|------------|
| **Critical (P1)** | Service down, data loss risk | 15 minutes | Immediate |
| **High (P2)** | Degraded performance, feature unavailable | 1 hour | 30 minutes |
| **Medium (P3)** | Minor feature issue, workaround available | 4 hours | 2 hours |
| **Low (P4)** | Documentation, cosmetic issues | 24 hours | 8 hours |

### Incident Response Steps

1. **Detection** - Alert triggered or user report received
2. **Acknowledgment** - On-call engineer acknowledges incident
3. **Investigation** - Determine root cause and scope
4. **Mitigation** - Implement temporary fix or workaround
5. **Resolution** - Implement permanent fix
6. **Verification** - Confirm fix resolves issue
7. **Communication** - Update stakeholders
8. **Documentation** - Record incident details for post-mortem

---

## Common Incidents & Resolutions

### 1. High Error Rate (>5% of requests failing)

**Detection:** Cloud Monitoring alert triggered

**Investigation:**
```bash
# Check recent error logs
gcloud logging read "severity>=ERROR" --limit 50 --format json

# Check service health
curl https://ai-film-studio.com/health

# Check database connectivity
gcloud sql instances describe ai-film-studio-db
```

**Common Causes & Fixes:**

| Cause | Check | Fix |
|-------|-------|-----|
| Database connection pool exhausted | `SHOW PROCESSLIST;` | Increase pool size in `DATABASE_URL` |
| External API failure | Check API status pages | Implement fallback, retry logic |
| Memory leak | `process.memoryUsage()` | Restart service, investigate memory usage |
| Disk space full | `df -h /tmp` | Clear logs, increase disk quota |

**Mitigation:**
```bash
# Restart service with traffic shift
gcloud run services update-traffic ai-film-studio --to-revisions=LATEST=0

# Deploy previous version
gcloud run deploy ai-film-studio \
  --image=gcr.io/ai-films-prod/ai-film-studio:previous-sha \
  --no-traffic

# Shift traffic back gradually
gcloud run services update-traffic ai-film-studio --to-revisions=LATEST=50
```

**Resolution:**
- Fix root cause in code
- Deploy fix through CI/CD pipeline
- Monitor error rates for 30 minutes
- Document incident

---

### 2. High Latency (p95 > 500ms)

**Detection:** Cloud Monitoring alert for response time

**Investigation:**
```bash
# Check slow queries
gcloud sql instances describe ai-film-studio-db --format="value(settings.backupConfiguration)"

# Check Cloud Trace for slow endpoints
gcloud trace list --limit 10

# Check service metrics
gcloud monitoring metrics-descriptors list
```

**Common Causes & Fixes:**

| Cause | Check | Fix |
|-------|-------|-----|
| Slow database query | Enable query logging | Add indexes, optimize query |
| External API slow | API status, latency | Implement timeout, cache results |
| Memory pressure | `process.memoryUsage()` | Increase instance memory |
| CPU throttling | CPU utilization | Increase CPU allocation |

**Mitigation:**
```bash
# Increase instance resources
gcloud run services update ai-film-studio \
  --memory=2Gi \
  --cpu=2

# Enable caching
# Update cache TTL in middleware.ts

# Implement request timeout
# Update timeoutMiddleware in middleware.ts
```

---

### 3. Database Connection Failures

**Detection:** Database health check fails

**Investigation:**
```bash
# Check database status
gcloud sql instances describe ai-film-studio-db

# Check connection limits
gcloud sql instances describe ai-film-studio-db \
  --format="value(settings.databaseFlags[name=max_connections])"

# Check network connectivity
gcloud sql instances describe ai-film-studio-db \
  --format="value(ipAddresses[0].ipAddress)"

# Test connection
mysql -h INSTANCE_IP -u root -p
```

**Common Causes & Fixes:**

| Cause | Check | Fix |
|-------|-------|-----|
| Connection pool exhausted | `SHOW PROCESSLIST;` | Increase max_connections |
| Network issue | Ping database IP | Check VPC, firewall rules |
| Database down | Instance status | Restart instance, check logs |
| Authentication failed | User credentials | Verify credentials in Secret Manager |

**Mitigation:**
```bash
# Restart database instance
gcloud sql instances restart ai-film-studio-db

# Increase connection limit
gcloud sql instances patch ai-film-studio-db \
  --database-flags=max_connections=500

# Failover to replica (if configured)
gcloud sql instances failover ai-film-studio-db
```

---

### 4. Memory Leak / Out of Memory

**Detection:** Memory usage continuously increases, service crashes

**Investigation:**
```bash
# Check memory usage over time
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container_memory_utilizations"'

# Check for memory leaks in code
# Review recent changes to services

# Check Node.js heap
node --expose-gc --inspect=0.0.0.0:9229 server/_core/index.ts
```

**Common Causes & Fixes:**

| Cause | Check | Fix |
|-------|-------|-----|
| Unclosed connections | Database connections | Ensure connections are closed |
| Large cache | Cache size | Implement cache eviction |
| Event listener leak | Event listeners | Remove listeners on cleanup |
| Circular references | Object references | Break circular references |

**Mitigation:**
```bash
# Immediate: Restart service
gcloud run services update ai-film-studio \
  --memory=4Gi  # Increase memory temporarily

# Implement memory monitoring
# Add memory checks to health.ts

# Force garbage collection
# Add periodic GC in production
```

**Resolution:**
- Identify memory leak source
- Implement fix
- Deploy through CI/CD
- Monitor memory usage for 24 hours

---

### 5. Deployment Failure

**Detection:** Deployment fails, service unavailable

**Investigation:**
```bash
# Check deployment status
gcloud run services describe ai-film-studio

# Check recent revisions
gcloud run revisions list --service=ai-film-studio

# Check deployment logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Check build logs
gcloud builds log LATEST
```

**Common Causes & Fixes:**

| Cause | Check | Fix |
|-------|-------|-----|
| Docker build failed | Build logs | Fix Dockerfile, rebuild |
| Startup failed | Container logs | Check environment variables |
| Health check failed | Health endpoint | Verify health check logic |
| Resource quota exceeded | Quota usage | Increase quota or reduce resources |

**Mitigation:**
```bash
# Rollback to previous version
gcloud run deploy ai-film-studio \
  --image=gcr.io/ai-films-prod/ai-film-studio:PREVIOUS_SHA

# Verify rollback
curl https://ai-film-studio.com/health/live
```

**Resolution:**
- Fix issue in code
- Run full test suite
- Deploy through CI/CD with manual approval
- Monitor for 30 minutes

---

## Escalation Procedures

### On-Call Rotation

- **Primary:** On-call engineer
- **Secondary:** Team lead
- **Tertiary:** CTO
- **Executive:** VP Engineering

### Escalation Timeline

| Time | Action |
|------|--------|
| 0-15 min | Primary responds, investigates |
| 15-30 min | Secondary notified if not resolved |
| 30-60 min | Team lead engaged, communication to stakeholders |
| 60+ min | CTO and VP Engineering engaged, customer notification |

### Communication Protocol

2. **Email:** Incident summary to stakeholders
3. **Status Page:** Update status.ai-film-studio.com
4. **Customer:** Direct notification if SLA at risk

---

## Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Error Rate | > 5% | P1 |
| p95 Latency | > 500ms | P2 |
| p99 Latency | > 1000ms | P2 |
| CPU Usage | > 80% | P2 |
| Memory Usage | > 85% | P2 |
| Database Connections | > 90% pool | P2 |
| Disk Usage | > 80% | P3 |
| Uptime | < 99.9% | P1 |

### Alert Configuration

```yaml
# Cloud Monitoring alert policy
displayName: "AI Film Studio - High Error Rate"
conditions:
  - displayName: "Error rate > 5%"
    conditionThreshold:
      filter: 'metric.type="logging.googleapis.com/user/error_rate"'
      comparison: COMPARISON_GT
      thresholdValue: 0.05
      duration: 300s
notificationChannels:
  - "projects/ai-films-prod/notificationChannels/CHANNEL_ID"
```

---

## Disaster Recovery

### Backup & Recovery Strategy

**RPO (Recovery Point Objective):** 1 hour  
**RTO (Recovery Time Objective):** 4 hours  

### Database Backup

```bash
# Automated daily backups (configured in Cloud SQL)
gcloud sql backups list --instance=ai-film-studio-db

# Manual backup
gcloud sql backups create \
  --instance=ai-film-studio-db \
  --description="Pre-deployment backup"

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=ai-film-studio-db
```

### Application Recovery

```bash
# 1. Verify database is accessible
mysql -h INSTANCE_IP -u root -p -e "SELECT 1;"

# 2. Deploy previous known-good version
gcloud run deploy ai-film-studio \
  --image=gcr.io/ai-films-prod/ai-film-studio:KNOWN_GOOD_SHA

# 3. Run database migrations if needed
pnpm db:push

# 4. Verify health checks pass
curl https://ai-film-studio.com/health

# 5. Monitor for 24 hours
# Watch error rates, latency, and user reports
```

### Data Recovery

```bash
# Restore database from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=ai-film-studio-db

# Verify data integrity
mysql -h INSTANCE_IP -u root -p -e "SELECT COUNT(*) FROM users;"

# If partial recovery needed, use point-in-time restore
gcloud sql backups restore BACKUP_ID \
  --backup-instance=ai-film-studio-db \
  --backup-timestamp=2026-02-01T10:00:00Z
```

---

## Post-Incident Reviews

### Incident Report Template

```markdown
# Incident Report: [INCIDENT_ID]

## Summary
- **Date/Time:** [DATE/TIME]
- **Duration:** [DURATION]
- **Severity:** [P1/P2/P3/P4]
- **Status:** [RESOLVED/ONGOING]

## Impact
- Services affected: [LIST]
- Users impacted: [NUMBER]
- Data loss: [YES/NO]

## Timeline
- 10:00 - Alert triggered
- 10:05 - Primary engineer acknowledged
- 10:15 - Root cause identified
- 10:30 - Mitigation implemented
- 10:45 - Service recovered

## Root Cause
[DETAILED EXPLANATION]

## Resolution
[WHAT WAS DONE]

## Prevention
[WHAT WILL PREVENT RECURRENCE]

## Action Items
- [ ] Implement fix
- [ ] Add monitoring
- [ ] Update runbooks
- [ ] Team training
```

### Blameless Post-Mortems

- Focus on systems and processes, not individuals
- Document what happened, why it happened, and what we'll do differently
- Assign action items with owners and deadlines
- Share learnings across team

---

## Quick Reference

### Critical Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Lead | [NAME] | [PHONE] | [EMAIL] |
| CTO | [NAME] | [PHONE] | [EMAIL] |
| VP Engineering | [NAME] | [PHONE] | [EMAIL] |

### Important Links

- **Status Page:** https://status.ai-film-studio.com
- **Monitoring Dashboard:** https://console.cloud.google.com/monitoring
- **Error Logs:** https://console.cloud.google.com/logs
- **Database Console:** https://console.cloud.google.com/sql
- **GitHub Deployments:** https://github.com/your-org/ai-film-studio/deployments

### Emergency Procedures

**Service Down - Immediate Actions:**
2. Check health endpoint: `curl https://ai-film-studio.com/health`
3. Review recent deployments
4. Check database status
5. Implement rollback if needed
6. Notify stakeholders

**Data Loss - Immediate Actions:**
1. STOP all writes to database
2. Preserve logs and evidence
3. Engage database team
4. Initiate recovery from backup
5. Verify data integrity
6. Notify affected users

---

**Last Review:** February 1, 2026  
**Next Review:** May 1, 2026  
**Owner:** CTO / DevOps Team

