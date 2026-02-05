# Google Cloud Alert Policies - Complete Setup Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Alert Policy Types](#alert-policy-types)
4. [Creating Alert Policies](#creating-alert-policies)
5. [Cloud Run Alerts](#cloud-run-alerts)
6. [Cloud SQL Alerts](#cloud-sql-alerts)
7. [Application Alerts](#application-alerts)
8. [Notification Channels](#notification-channels)
9. [Alert Management](#alert-management)
10. [Best Practices](#best-practices)

---

## Overview

Alert policies automatically notify your team when metrics exceed thresholds or anomalies occur. This guide covers setting up 20+ essential alerts for AI Film Studio.

---

## Prerequisites

### Required APIs

```bash
gcloud services enable \
  monitoring.googleapis.com \
  logging.googleapis.com \
  cloudnotifications.googleapis.com
```

### Required Permissions

```bash
# Your account needs:
# - monitoring.admin
# - monitoring.alertPolicyEditor
# - monitoring.notificationChannelEditor
```

### Set Variables

```bash
export PROJECT_ID="ai-film-studio-prod"
export SERVICE_NAME="ai-film-studio"
export REGION="us-central1"
```

---

## Alert Policy Types

### 1. Threshold Alerts
Trigger when metric exceeds/falls below a value for a duration.

### 2. Absence Alerts
Trigger when no data received for a duration.

### 3. Rate of Change Alerts
Trigger when metric changes rapidly.

### 4. Anomaly Detection Alerts
Trigger when metric deviates from historical pattern.

### 5. Log-Based Alerts
Trigger based on log entries matching criteria.

---

## Creating Alert Policies

### Method 1: Using gcloud CLI

```bash
# Create alert policy from JSON
gcloud alpha monitoring policies create --policy-from-file=alert-policy.json
```

### Method 2: Using Google Cloud Console

```
1. Go to Monitoring → Alert Policies
2. Click "CREATE POLICY"
3. Configure condition, notification channel, and documentation
4. Click "CREATE"
```

### Method 3: Using Terraform

```hcl
resource "google_monitoring_alert_policy" "cpu_utilization" {
  display_name = "High CPU Utilization"
  combiner     = "OR"

  conditions {
    display_name = "CPU > 90%"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.9
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}
```

---

## Cloud Run Alerts

### Alert 1: High Error Rate

```bash
cat > alert-error-rate.json << 'EOF'
{
  "displayName": "Cloud Run - High Error Rate (>1%)",
  "conditions": [
    {
      "displayName": "Error rate > 1%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.response_code_class=\"5xx\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.01,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-error-rate.json
```

### Alert 2: High Latency (p95 > 5s)

```bash
cat > alert-latency.json << 'EOF'
{
  "displayName": "Cloud Run - High Latency (p95 > 5s)",
  "conditions": [
    {
      "displayName": "Latency p95 > 5000ms",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/request_latencies\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 5000,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_PERCENTILE_95"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-latency.json
```

### Alert 3: High Memory Usage

```bash
cat > alert-memory.json << 'EOF'
{
  "displayName": "Cloud Run - High Memory Usage (>80%)",
  "conditions": [
    {
      "displayName": "Memory usage > 80%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/container_memory_utilizations\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.8,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-memory.json
```

### Alert 4: High CPU Usage

```bash
cat > alert-cpu.json << 'EOF'
{
  "displayName": "Cloud Run - High CPU Usage (>90%)",
  "conditions": [
    {
      "displayName": "CPU usage > 90%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/container_cpu_utilizations\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.9,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-cpu.json
```

### Alert 5: Service Unavailable

```bash
cat > alert-unavailable.json << 'EOF'
{
  "displayName": "Cloud Run - Service Unavailable",
  "conditions": [
    {
      "displayName": "No requests for 5 minutes",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/request_count\"",
        "comparison": "COMPARISON_LT",
        "thresholdValue": 1,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_SUM"
          }
        ],
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-unavailable.json
```

---

## Cloud SQL Alerts

### Alert 6: High CPU Utilization

```bash
cat > alert-sql-cpu.json << 'EOF'
{
  "displayName": "Cloud SQL - High CPU (>80%)",
  "conditions": [
    {
      "displayName": "CPU > 80%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.8,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-sql-cpu.json
```

### Alert 7: High Memory Utilization

```bash
cat > alert-sql-memory.json << 'EOF'
{
  "displayName": "Cloud SQL - High Memory (>85%)",
  "conditions": [
    {
      "displayName": "Memory > 85%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/memory/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.85,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-sql-memory.json
```

### Alert 8: High Disk Utilization

```bash
cat > alert-sql-disk.json << 'EOF'
{
  "displayName": "Cloud SQL - High Disk (>90%)",
  "conditions": [
    {
      "displayName": "Disk > 90%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/disk/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.9,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-sql-disk.json
```

### Alert 9: Replication Lag

```bash
cat > alert-replication-lag.json << 'EOF'
{
  "displayName": "Cloud SQL - Replication Lag (>5s)",
  "conditions": [
    {
      "displayName": "Replication lag > 5s",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/replication/replica_lag\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 5,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MAX"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-replication-lag.json
```

### Alert 10: Connection Pool Exhaustion

```bash
cat > alert-connections.json << 'EOF'
{
  "displayName": "Cloud SQL - High Connections (>80)",
  "conditions": [
    {
      "displayName": "Connections > 80",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/network/connections\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 80,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-connections.json
```

---

## Application Alerts

### Alert 11: API Success Rate Low

```bash
cat > alert-api-success.json << 'EOF'
{
  "displayName": "API - Low Success Rate (<95%)",
  "conditions": [
    {
      "displayName": "Success rate < 95%",
      "conditionThreshold": {
        "filter": "metric.type=\"custom.googleapis.com/api/success_rate\" AND resource.type=\"global\"",
        "comparison": "COMPARISON_LT",
        "thresholdValue": 0.95,
        "duration": "600s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-api-success.json
```

### Alert 12: Image Generation Failure Rate High

```bash
cat > alert-generation-failure.json << 'EOF'
{
  "displayName": "Image Generation - High Failure Rate (>5%)",
  "conditions": [
    {
      "displayName": "Failure rate > 5%",
      "conditionThreshold": {
        "filter": "metric.type=\"custom.googleapis.com/generation/success_rate\" AND resource.type=\"global\"",
        "comparison": "COMPARISON_LT",
        "thresholdValue": 0.95,
        "duration": "600s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-generation-failure.json
```

### Alert 13: Generation Time Too Long

```bash
cat > alert-generation-time.json << 'EOF'
{
  "displayName": "Image Generation - Slow (>30s avg)",
  "conditions": [
    {
      "displayName": "Avg generation time > 30s",
      "conditionThreshold": {
        "filter": "metric.type=\"custom.googleapis.com/generation/duration\" AND resource.type=\"global\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 30000,
        "duration": "600s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-generation-time.json
```

---

## Notification Channels

### Create Email Notification Channel

```bash
cat > email-channel.json << 'EOF'
{
  "type": "email",
  "displayName": "Team Email",
  "labels": {
    "email_address": "team@example.com"
  },
  "enabled": true
}
EOF

gcloud alpha monitoring channels create --channel-content-from-file=email-channel.json
```

### Create Slack Notification Channel

```bash
cat > slack-channel.json << 'EOF'
{
  "type": "slack",
  "displayName": "Slack Alerts",
  "labels": {
    "channel_name": "#alerts"
  },
  "userLabels": {
    "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  },
  "enabled": true
}
EOF

gcloud alpha monitoring channels create --channel-content-from-file=slack-channel.json
```

### Create PagerDuty Notification Channel

```bash
cat > pagerduty-channel.json << 'EOF'
{
  "type": "pagerduty",
  "displayName": "PagerDuty On-Call",
  "userLabels": {
    "service_key": "YOUR_PAGERDUTY_SERVICE_KEY"
  },
  "enabled": true
}
EOF

gcloud alpha monitoring channels create --channel-content-from-file=pagerduty-channel.json
```

### Create SMS Notification Channel

```bash
cat > sms-channel.json << 'EOF'
{
  "type": "sms",
  "displayName": "Critical Alerts SMS",
  "labels": {
    "number": "+1234567890"
  },
  "enabled": true
}
EOF

gcloud alpha monitoring channels create --channel-content-from-file=sms-channel.json
```

### List Notification Channels

```bash
gcloud alpha monitoring channels list \
  --format="table(name, displayName, type)"
```

---

## Alert Management

### View All Alert Policies

```bash
gcloud alpha monitoring policies list \
  --format="table(name, displayName, enabled)"
```

### Update Alert Policy

```bash
# Get policy ID
POLICY_ID=$(gcloud alpha monitoring policies list \
  --filter="displayName:High Error Rate" \
  --format="value(name)")

# Update policy
gcloud alpha monitoring policies update $POLICY_ID \
  --update-from-file=updated-policy.json
```

### Delete Alert Policy

```bash
gcloud alpha monitoring policies delete POLICY_ID
```

### Disable Alert Policy

```bash
gcloud alpha monitoring policies update POLICY_ID \
  --no-enabled
```

### Enable Alert Policy

```bash
gcloud alpha monitoring policies update POLICY_ID \
  --enabled
```

---

## Alert Escalation

### Multi-Level Escalation

```bash
cat > escalation-policy.json << 'EOF'
{
  "displayName": "Critical Alert - Escalation",
  "conditions": [
    {
      "displayName": "Critical error rate",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND metric.response_code_class=\"5xx\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.05,
        "duration": "60s"
      }
    }
  ],
  "notificationChannels": [
    "projects/PROJECT_ID/notificationChannels/SLACK_CHANNEL_ID",
    "projects/PROJECT_ID/notificationChannels/EMAIL_CHANNEL_ID",
    "projects/PROJECT_ID/notificationChannels/PAGERDUTY_CHANNEL_ID"
  ],
  "alertStrategy": {
    "autoClose": "1800s",
    "notificationRateLimit": {
      "period": "300s"
    }
  }
}
EOF
```

---

## Best Practices

### 1. Alert Naming

```
✓ Format: "[Service] - [Condition] ([Threshold])"
✓ Example: "Cloud Run - High Error Rate (>1%)"
✓ Be specific and actionable
✓ Avoid generic names like "Alert 1"
```

### 2. Threshold Selection

```
✓ Base on historical data
✓ Use percentiles (p95, p99) for latency
✓ Leave buffer for normal fluctuations
✓ Test thresholds before deploying
✓ Adjust based on false positives
```

### 3. Duration Settings

```
✓ Short duration (1-5 min): Critical metrics
✓ Medium duration (5-15 min): Performance metrics
✓ Long duration (15-60 min): Trend-based metrics
✓ Avoid too short (noise) or too long (delayed response)
```

### 4. Notification Strategy

```
✓ Route by severity:
  - Critical → SMS + PagerDuty
  - High → Slack + Email
  - Medium → Email only
  - Low → Dashboard only
✓ Avoid alert fatigue
✓ Set quiet hours for low-severity alerts
✓ Use escalation for unacknowledged alerts
```

### 5. Documentation

```
✓ Add runbook links to alert descriptions
✓ Document expected actions
✓ Include troubleshooting steps
✓ Keep documentation updated
```

### 6. Testing

```bash
# Test alert by triggering condition
# Example: Generate high error rate
for i in {1..100}; do
  curl -I https://ai-film-studio-xxxxx.run.app/invalid
done

# Verify alert fires
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" \
  --limit 10
```

---

## Common Alert Patterns

### Pattern 1: Sudden Spike

```
Condition: Rate of change > 200%
Duration: 1-5 minutes
Action: Investigate root cause
```

### Pattern 2: Gradual Degradation

```
Condition: Metric trending up over time
Duration: 15-60 minutes
Action: Plan scaling or optimization
```

### Pattern 3: Absence Alert

```
Condition: No data for duration
Duration: 5-10 minutes
Action: Check service health
```

### Pattern 4: Threshold Breach

```
Condition: Metric > threshold
Duration: 5-15 minutes
Action: Immediate response needed
```

---

## Troubleshooting

### Alert Not Firing

```bash
# Check alert policy is enabled
gcloud alpha monitoring policies describe POLICY_ID

# Verify notification channel is working
gcloud alpha monitoring channels describe CHANNEL_ID

# Check metric data exists
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'

# Test notification channel
gcloud alpha monitoring channels test CHANNEL_ID
```

### Too Many False Positives

```
✓ Increase threshold value
✓ Increase duration
✓ Use aggregation (mean, percentile)
✓ Add additional conditions
✓ Use anomaly detection instead
```

### Notifications Not Received

```bash
# Verify channel configuration
gcloud alpha monitoring channels describe CHANNEL_ID

# Check channel is enabled
gcloud alpha monitoring channels update CHANNEL_ID --enabled

# Test channel
gcloud alpha monitoring channels test CHANNEL_ID

# Check alert policy includes channel
gcloud alpha monitoring policies describe POLICY_ID
```

---

## Resources

- [Alert Policies Documentation](https://cloud.google.com/monitoring/alerts)
- [Notification Channels](https://cloud.google.com/monitoring/support/notification-options)
- [Metric Types Reference](https://cloud.google.com/monitoring/api/metrics_gcp)
- [Alert Best Practices](https://cloud.google.com/blog/products/gcp/alerting-best-practices-from-google-cloud)

---

Last Updated: January 30, 2026
Version: 1.0
