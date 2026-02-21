# Log Analysis & Export - Complete Setup Guide

## Table of Contents

1. [Overview](#overview)
2. [Log Sources](#log-sources)
3. [Log Queries](#log-queries)
4. [Log Sinks](#log-sinks)
5. [BigQuery Export](#bigquery-export)
6. [Log Analysis](#log-analysis)
7. [Retention & Archival](#retention--archival)
8. [Best Practices](#best-practices)

---

## Overview

Google Cloud Logging collects, stores, and analyzes logs from all services. This guide covers querying, exporting, and analyzing logs for AI Film Studio.

---

## Log Sources

### Cloud Run Logs

```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" \
  --limit 50 \
  --format json
```

### Cloud SQL Logs

```bash
# View Cloud SQL logs
gcloud logging read "resource.type=cloudsql_database" \
  --limit 50 \
  --format json
```

### Application Logs

```bash
# View application logs (via stderr/stdout)
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" \
  --limit 50 \
  --format json
```

### Audit Logs

```bash
# View audit logs
gcloud logging read "protoPayload.methodName=~\".*\"" \
  --limit 50 \
  --format json
```

---

## Log Queries

### Query Language: Logging Query Language (LQL)

#### Basic Syntax

```
resource.type="cloud_run_revision"
  AND resource.labels.service_name="ai-film-studio"
  AND severity="ERROR"
  AND timestamp>="2024-01-30T00:00:00Z"
```

#### Common Queries

### Query 1: Errors in Last Hour

```bash
gcloud logging read \
  "resource.type=cloud_run_revision \
   AND resource.labels.service_name=ai-film-studio \
   AND severity>=ERROR \
   AND timestamp>=\"$(date -u -d '1 hour ago' +'%Y-%m-%dT%H:%M:%SZ')\"" \
  --limit 100 \
  --format json
```

### Query 2: Slow Requests (>5s)

```bash
gcloud logging read \
  "resource.type=cloud_run_revision \
   AND resource.labels.service_name=ai-film-studio \
   AND httpRequest.latency>5s" \
  --limit 50 \
  --format json
```

### Query 3: Failed API Calls

```bash
gcloud logging read \
  "resource.type=cloud_run_revision \
   AND resource.labels.service_name=ai-film-studio \
   AND httpRequest.status>=400" \
  --limit 100 \
  --format json
```

### Query 4: Authentication Failures

```bash
gcloud logging read \
  "protoPayload.methodName=google.identity.accesscontextmanager.v1.AccessContextManager.ListAccessLevels \
   AND protoPayload.status.code=7" \
  --limit 50 \
  --format json
```

### Query 5: Database Connection Issues

```bash
gcloud logging read \
  "resource.type=cloudsql_database \
   AND textPayload=~\".*connection.*\" \
   AND severity>=WARNING" \
  --limit 50 \
  --format json
```

### Query 6: Image Generation Failures

```bash
gcloud logging read \
  "resource.type=cloud_run_revision \
   AND resource.labels.service_name=ai-film-studio \
   AND textPayload=~\".*generation.*failed.*\"" \
  --limit 50 \
  --format json
```

### Query 7: Cost-Related Logs

```bash
gcloud logging read \
  "resource.type=cloud_run_revision \
   AND textPayload=~\".*quota.*|.*limit.*\"" \
  --limit 50 \
  --format json
```

### Query 8: Deployment Events

```bash
gcloud logging read \
  "protoPayload.methodName=~\".*run.googleapis.com.*\" \
   AND protoPayload.resourceName=~\".*ai-film-studio.*\"" \
  --limit 50 \
  --format json
```

---

## Log Sinks

### Create Log Sink to BigQuery

```bash
# Create BigQuery dataset
bq mk --dataset \
  --description="AI Film Studio logs" \
  --location=US \
  ai_film_studio_logs

# Create sink
gcloud logging sinks create ai-film-studio-bigquery \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/ai_film_studio_logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="ai-film-studio"'

# Verify sink
gcloud logging sinks describe ai-film-studio-bigquery
```

### Create Log Sink to Cloud Storage

```bash
# Create Cloud Storage bucket
gsutil mb -l us-central1 gs://ai-film-studio-logs

# Create sink
gcloud logging sinks create ai-film-studio-gcs \
  storage.googleapis.com/ai-film-studio-logs \
  --log-filter='resource.type="cloud_run_revision"'

# Verify sink
gcloud logging sinks describe ai-film-studio-gcs
```

### Create Log Sink to Pub/Sub

```bash
# Create Pub/Sub topic
gcloud pubsub topics create ai-film-studio-logs

# Create sink
gcloud logging sinks create ai-film-studio-pubsub \
  pubsub.googleapis.com/projects/$PROJECT_ID/topics/ai-film-studio-logs \
  --log-filter='severity>=ERROR'

# Verify sink
gcloud logging sinks describe ai-film-studio-pubsub
```

### List All Sinks

```bash
gcloud logging sinks list
```

### Update Sink Filter

```bash
gcloud logging sinks update ai-film-studio-bigquery \
  --log-filter='resource.type="cloud_run_revision" AND severity>=WARNING'
```

### Delete Sink

```bash
gcloud logging sinks delete ai-film-studio-bigquery
```

---

## BigQuery Export

### Query Exported Logs in BigQuery

```sql
-- View recent logs
SELECT
  timestamp,
  severity,
  jsonPayload.message as message,
  httpRequest.status as status_code,
  httpRequest.latency as latency
FROM `ai-film-studio-prod.ai_film_studio_logs.cloud_run_revision_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
ORDER BY timestamp DESC
LIMIT 100;
```

### Error Analysis

```sql
-- Analyze errors by status code
SELECT
  httpRequest.status as status_code,
  COUNT(*) as count,
  ROUND(COUNT(*) / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM `ai-film-studio-prod.ai_film_studio_logs.cloud_run_revision_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND httpRequest.status >= 400
GROUP BY status_code
ORDER BY count DESC;
```

### Performance Analysis

```sql
-- Analyze request latency
SELECT
  httpRequest.requestUrl as endpoint,
  COUNT(*) as request_count,
  ROUND(AVG(CAST(httpRequest.latency as FLOAT64)) / 1000, 2) as avg_latency_ms,
  ROUND(APPROX_QUANTILES(CAST(httpRequest.latency as FLOAT64), 100)[OFFSET(95)] / 1000, 2) as p95_latency_ms,
  ROUND(APPROX_QUANTILES(CAST(httpRequest.latency as FLOAT64), 100)[OFFSET(99)] / 1000, 2) as p99_latency_ms
FROM `ai-film-studio-prod.ai_film_studio_logs.cloud_run_revision_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY endpoint
ORDER BY avg_latency_ms DESC;
```

### User Activity Analysis

```sql
-- Analyze user activity
SELECT
  httpRequest.userAgent as user_agent,
  COUNT(*) as request_count,
  COUNT(DISTINCT httpRequest.latency) as unique_latencies,
  ROUND(SUM(CASE WHEN httpRequest.status >= 400 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as error_rate_percent
FROM `ai-film-studio-prod.ai_film_studio_logs.cloud_run_revision_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY user_agent
ORDER BY request_count DESC;
```

### API Endpoint Analysis

```sql
-- Analyze API endpoints
SELECT
  REGEXP_EXTRACT(httpRequest.requestUrl, r'/api/([^/?]+)') as endpoint,
  COUNT(*) as total_requests,
  SUM(CASE WHEN httpRequest.status >= 400 THEN 1 ELSE 0 END) as errors,
  ROUND(SUM(CASE WHEN httpRequest.status >= 400 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as error_rate_percent,
  ROUND(AVG(CAST(httpRequest.latency as FLOAT64)) / 1000, 2) as avg_latency_ms
FROM `ai-film-studio-prod.ai_film_studio_logs.cloud_run_revision_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY endpoint
ORDER BY total_requests DESC;
```

### Hourly Trend Analysis

```sql
-- Analyze trends by hour
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
  COUNT(*) as request_count,
  SUM(CASE WHEN httpRequest.status >= 400 THEN 1 ELSE 0 END) as error_count,
  ROUND(SUM(CASE WHEN httpRequest.status >= 400 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as error_rate_percent,
  ROUND(AVG(CAST(httpRequest.latency as FLOAT64)) / 1000, 2) as avg_latency_ms
FROM `ai-film-studio-prod.ai_film_studio_logs.cloud_run_revision_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY hour
ORDER BY hour DESC;
```

---

## Log Analysis

### Create Log-Based Metrics

```bash
# Create metric for error count
gcloud logging metrics create error_count \
  --description="Count of errors" \
  --log-filter='severity>=ERROR'

# Create metric for API latency
gcloud logging metrics create api_latency \
  --description="API request latency" \
  --log-filter='httpRequest.latency>0' \
  --value-extractor='EXTRACT(httpRequest.latency)'

# List metrics
gcloud logging metrics list
```

### Create Log-Based Alerts

```bash
# Alert on error spike
gcloud alpha monitoring policies create \
  --display-name="Error Spike Alert" \
  --condition-display-name="Errors > 10 per minute" \
  --condition-threshold-value=10 \
  --condition-threshold-duration=60s \
  --condition-threshold-comparison=COMPARISON_GT \
  --log-filter='severity>=ERROR'
```

---

## Retention & Archival

### Set Log Retention

```bash
# Keep logs for 30 days (default)
gcloud logging buckets create ai-film-studio-logs \
  --location=us \
  --retention-days=30

# Keep logs for 1 year
gcloud logging buckets create ai-film-studio-logs-archive \
  --location=us \
  --retention-days=365
```

### Archive Old Logs to Cloud Storage

```bash
# Create lifecycle policy
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF

# Apply policy
gsutil lifecycle set lifecycle.json gs://ai-film-studio-logs
```

### Export Logs to Cloud Storage for Long-term Storage

```bash
# Create scheduled export
gcloud logging sinks create daily-export \
  storage.googleapis.com/ai-film-studio-logs-archive \
  --log-filter='resource.type="cloud_run_revision"' \
  --include-children
```

---

## Best Practices

### 1. Log Filtering

```
✓ Filter at source (reduce noise)
✓ Use specific resource types
✓ Include severity levels
✓ Add timestamp ranges
✓ Use structured logging
```

### 2. Log Retention

```
✓ Keep 30 days in Cloud Logging (default)
✓ Export to BigQuery for analysis
✓ Archive to Cloud Storage for compliance
✓ Delete after retention period
```

### 3. Query Optimization

```
✓ Use specific time ranges
✓ Filter by resource type first
✓ Limit result set
✓ Use structured fields
✓ Avoid full table scans
```

### 4. BigQuery Analysis

```
✓ Partition by date
✓ Use clustering for common queries
✓ Archive old data
✓ Set up scheduled queries
✓ Create views for common queries
```

### 5. Security & Compliance

```
✓ Audit log access
✓ Encrypt logs at rest
✓ Use VPC Service Controls
✓ Implement least privilege access
✓ Monitor sensitive operations
```

---

## Troubleshooting

### Logs Not Appearing

```bash
# Verify sink is working
gcloud logging sinks describe SINK_NAME

# Check permissions
gcloud projects get-iam-policy $PROJECT_ID

# Verify log filter
gcloud logging read "FILTER" --limit 1
```

### BigQuery Export Issues

```bash
# Verify dataset exists
bq ls -d

# Check table schema
bq show ai_film_studio_logs.cloud_run_revision_*

# Test query
bq query --use_legacy_sql=false 'SELECT COUNT(*) FROM `ai-film-studio-prod.ai_film_studio_logs.cloud_run_revision_*`'
```

---

Last Updated: January 30, 2026
Version: 1.0
