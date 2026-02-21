# AI Film Studio - Production Runbooks

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Incident Response](#incident-response)
3. [Deployment Procedures](#deployment-procedures)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Escalation Procedures](#escalation-procedures)

---

## Daily Operations

### Morning Checklist

**Time: 9:00 AM**

```bash
# 1. Check system health
./scripts/health-check.sh

# 2. Review overnight logs
tail -n 100 logs/application-*.log

# 3. Check database status
./scripts/db-migrate.sh validate

# 4. Verify backups completed
ls -lh backups/ | head -5

# 5. Monitor resource usage
free -h
df -h
```

**Expected Results:**
- ✅ All health checks passing
- ✅ No critical errors in logs
- ✅ Database responding normally
- ✅ Backups completed successfully
- ✅ Disk usage < 80%

### Monitoring During Business Hours

**Continuous Monitoring:**

```bash
# Run continuous health checks
./scripts/health-check.sh --continuous --interval 300

# Monitor application logs
tail -f logs/application-*.log | grep -E "ERROR|WARN"

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/health
```

### End of Day Checklist

**Time: 5:00 PM**

```bash
# 1. Verify no pending deployments
git status

# 2. Check for unresolved issues
grep -r "TODO\|FIXME" server/ client/ --include="*.ts" --include="*.tsx"

# 3. Backup critical data
./scripts/db-migrate.sh backup

# 4. Generate daily report
./scripts/generate-daily-report.sh

# 5. Notify team of status
```

---

## Incident Response

### Severity Levels

| Level | Response Time | Impact | Example |
|-------|---------------|--------|---------|
| **P1 - Critical** | 15 minutes | Service down, data loss risk | Database offline, API crashes |
| **P2 - High** | 1 hour | Significant degradation | High error rate, slow responses |
| **P3 - Medium** | 4 hours | Minor impact | Single feature broken |
| **P4 - Low** | 24 hours | Cosmetic issues | UI bug, typo |

### P1: Critical Incident Response

**Immediate Actions (0-5 minutes):**

1. **Declare Incident**
   ```bash
   # Notify team immediately
   ```

2. **Assess Impact**
   ```bash
   # Check what's affected
   ./scripts/health-check.sh --verbose
   
   # Review recent logs
   tail -f logs/application-*.log
   ```

3. **Activate War Room**
   - Start incident call (Zoom/Teams)
   - Assign roles: Commander, Communicator, Technician
   - Open incident tracking document

**Diagnosis (5-15 minutes):**

```bash
# Check system resources
free -h
df -h
ps aux | grep node

# Check database
./scripts/db-migrate.sh validate

# Check API endpoints
curl -f https://api.example.com/health

# Review error logs
grep "ERROR" logs/application-*.log | tail -20
```

**Resolution (15-60 minutes):**

**Option 1: Quick Fix**
```bash
# If issue is known and fix is simple
# Apply fix and restart
npm run build
npm start
```

**Option 2: Rollback**
```bash
# If recent deployment caused issue
./scripts/rollback.sh <previous-version> --force

# Verify rollback
./scripts/health-check.sh
```

**Option 3: Scale Up**
```bash
# If issue is load-related
# Increase server resources
# Restart application
npm start
```

**Communication:**

- Update incident channel every 15 minutes
- Notify customers if needed
- Document all actions taken

**Post-Incident (1-24 hours):**

```bash
# 1. Verify system stability
./scripts/health-check.sh --continuous --interval 60

# 2. Collect metrics
# Response times, error rates, resource usage

# 3. Root cause analysis
# Why did this happen?

# 4. Action items
# What will prevent this in the future?

# 5. Post-mortem
# Schedule team meeting to review
```

### P2: High Priority Incident

**Response Time: 1 hour**

```bash
# 1. Assess impact
./scripts/health-check.sh

# 2. Identify root cause
tail -f logs/application-*.log

# 3. Implement fix or workaround
# Follow resolution options above

# 4. Communicate status

# 5. Monitor resolution
./scripts/health-check.sh --continuous
```

### P3: Medium Priority Incident

**Response Time: 4 hours**

```bash
# 1. Document issue
# Create ticket with details

# 2. Investigate
# Reproduce issue locally

# 3. Develop fix
# Write code and tests

# 4. Deploy fix
./scripts/deploy.sh staging --dry-run
./scripts/deploy.sh staging

# 5. Verify fix
# Test in staging environment
```

---

## Deployment Procedures

### Standard Deployment

**Pre-Deployment (1 hour before):**

```bash
# 1. Notify team

# 2. Verify code is ready
git status
git log --oneline -5

# 3. Run final tests
npm test
npm run check

# 4. Create backup
./scripts/db-migrate.sh backup

# 5. Dry run deployment
./scripts/deploy.sh production --dry-run
```

**Deployment (30 minutes):**

```bash
# 1. Start deployment
./scripts/deploy.sh production --verbose

# 2. Monitor deployment
tail -f logs/deployment-*.log

# 3. Verify success
./scripts/health-check.sh

# 4. Smoke test
# Test critical features manually
```

**Post-Deployment (30 minutes):**

```bash
# 1. Verify all systems
./scripts/health-check.sh --verbose

# 2. Check error rates
# Should be < 0.1%

# 3. Monitor performance
# Response times should be normal

# 4. Notify team

# 5. Document deployment
# Record version, time, changes
```

### Emergency Deployment

**When to use:** Critical bug fix, security patch

```bash
# 1. Skip staging, go directly to production
# Only if absolutely necessary

# 2. Have rollback ready
./scripts/rollback.sh <previous-version>

# 3. Deploy with monitoring
./scripts/deploy.sh production --verbose

# 4. Monitor closely
./scripts/health-check.sh --continuous

# 5. Be ready to rollback
# Have team on standby
```

### Rollback Procedure

**When to rollback:**
- Deployment introduced critical bugs
- Performance degradation
- Data corruption
- Security vulnerability

**Steps:**

```bash
# 1. Declare rollback
# Notify team immediately

# 2. Identify previous version
ls -1 .deployment-versions/ | tail -5

# 3. Execute rollback
./scripts/rollback.sh <version> --verbose

# 4. Verify rollback
./scripts/health-check.sh

# 5. Investigate issue
# Why did deployment fail?

# 6. Post-mortem
# Prevent similar issues
```

---

## Troubleshooting Guide

### Application Won't Start

**Symptoms:**
- Application crashes on startup
- Port already in use
- Missing dependencies

**Diagnosis:**

```bash
# 1. Check logs
tail -f logs/application-*.log

# 2. Verify dependencies
npm ls

# 3. Check port
lsof -i :3000

# 4. Check environment
env | grep -E "DATABASE_URL|JWT_SECRET"
```

**Resolution:**

```bash
# Option 1: Kill existing process
pkill -f "node.*dist/index.js"

# Option 2: Use different port
PORT=3001 npm start

# Option 3: Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Option 4: Rebuild
npm run build
npm start
```

### High Error Rate

**Symptoms:**
- Error rate > 1%
- Users reporting failures
- API endpoints timing out

**Diagnosis:**

```bash
# 1. Check error logs
grep "ERROR" logs/application-*.log | tail -50

# 2. Check database
./scripts/db-migrate.sh validate

# 3. Check system resources
free -h
df -h

# 4. Check recent changes
git log --oneline -10
```

**Resolution:**

```bash
# Option 1: Restart application
pkill -f "node.*dist/index.js"
npm start

# Option 2: Clear cache
redis-cli FLUSHALL

# Option 3: Scale up resources
# Increase memory/CPU

# Option 4: Rollback
./scripts/rollback.sh <previous-version>
```

### Database Connection Issues

**Symptoms:**
- Cannot connect to database
- Slow queries
- Connection pool exhausted

**Diagnosis:**

```bash
# 1. Verify connection string
echo $DATABASE_URL

# 2. Test connection
mysql -u user -p -h host

# 3. Check connections
SHOW PROCESSLIST;

# 4. Check logs
tail -f logs/database-*.log
```

**Resolution:**

```bash
# Option 1: Restart database
# Contact database administrator

# Option 2: Increase connection pool
# Update DATABASE_URL with pool settings

# Option 3: Kill idle connections
KILL CONNECTION_ID;

# Option 4: Failover to replica
# Update DATABASE_URL to replica host
```

### Memory Leak

**Symptoms:**
- Memory usage continuously increasing
- Application crashes after hours
- Heap out of memory errors

**Diagnosis:**

```bash
# 1. Monitor memory
node --inspect dist/index.js

# 2. Use Chrome DevTools
# chrome://inspect

# 3. Take heap snapshots
# Compare snapshots over time

# 4. Identify leaking objects
# Check event listeners, timers
```

**Resolution:**

```bash
# Option 1: Fix memory leak
# Update code to release references

# Option 2: Increase heap size
NODE_OPTIONS=--max-old-space-size=4096 npm start

# Option 3: Restart periodically
# Use process manager (PM2) with restart schedule
```

### Slow Performance

**Symptoms:**
- API response times > 500ms
- High CPU usage
- Database queries slow

**Diagnosis:**

```bash
# 1. Check response times
curl -w "@curl-format.txt" https://api.example.com/health

# 2. Check database queries
SHOW PROCESSLIST;
SHOW QUERY_LOG;

# 3. Check system resources
top
iostat

# 4. Check application logs
grep "SLOW_QUERY" logs/application-*.log
```

**Resolution:**

```bash
# Option 1: Optimize queries
# Add database indexes
CREATE INDEX idx_name ON table(column);

# Option 2: Implement caching
# Use Redis for frequently accessed data

# Option 3: Scale horizontally
# Add more application servers

# Option 4: Optimize code
# Profile and optimize hot paths
```

---

## Escalation Procedures

### Escalation Path

**Level 1: On-Call Engineer**
- Response time: 15 minutes
- Handles: P3, P4 issues
- Authority: Can restart services, clear caches

**Level 2: Senior Engineer**
- Response time: 30 minutes
- Handles: P2 issues
- Authority: Can deploy fixes, modify configurations

**Level 3: Engineering Manager**
- Response time: 1 hour
- Handles: P1 issues, major decisions
- Authority: Can authorize emergency actions, customer communication

**Level 4: CTO**
- Response time: 2 hours
- Handles: Critical business impact
- Authority: Strategic decisions, vendor escalations

### When to Escalate

**Escalate to Level 2 if:**
- Issue not resolved in 30 minutes
- Requires code changes
- Affects multiple systems

**Escalate to Level 3 if:**
- Issue not resolved in 1 hour
- Customer impact is severe
- Requires business decisions

**Escalate to Level 4 if:**
- Service down > 30 minutes
- Data loss or security breach
- Major customer impact

### Escalation Contact

```
Manager: manager@example.com
CTO: cto@example.com

Emergency: +1-555-INCIDENT
```

---

## Communication Templates

### Incident Declaration

```
🚨 INCIDENT DECLARED - P{severity}

Service: {service_name}
Status: {status}
Impact: {impact_description}
ETA: {estimated_time_to_resolution}

Incident Channel: #incident-{id}
War Room: {zoom_link}
```

### Status Update

```
📊 STATUS UPDATE - {time_elapsed}

Current Status: {status}
Actions Taken: {actions}
Next Steps: {next_steps}
ETA: {updated_eta}
```

### Resolution Notification

```
✅ INCIDENT RESOLVED

Service: {service_name}
Duration: {total_duration}
Root Cause: {root_cause}
Resolution: {resolution}
Post-Mortem: {scheduled_date}
```

---

## Maintenance Windows

### Scheduled Maintenance

**Frequency:** Monthly, second Sunday 2-4 AM UTC

**Activities:**
- Database maintenance
- Security patches
- Dependency updates
- Performance optimization

**Notification:**
- Announce 2 weeks in advance
- Send reminders 48 hours before
- Post status updates during maintenance

### Emergency Maintenance

**Frequency:** As needed

**Approval Required:**
- P1: Immediate
- P2: Manager approval
- P3: Engineering lead approval

---

## Metrics & Reporting

### Key Metrics

- Uptime: > 99.9%
- Error Rate: < 0.1%
- Response Time: < 500ms
- MTTR: < 30 minutes
- MTBF: > 720 hours

### Weekly Report

```bash
# Generate weekly metrics
./scripts/generate-weekly-report.sh

# Includes:
# - Uptime percentage
# - Incident count and severity
# - Performance metrics
# - Deployment count
# - Security events
```

---

**Last Updated**: 2026-02-01  
**Version**: 1.0.0  
**Maintained By**: DevOps Team
