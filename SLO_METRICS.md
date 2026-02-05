# Service Level Objectives (SLOs) & Performance Metrics

## Table of Contents

1. [Overview](#overview)
2. [SLO Definitions](#slo-definitions)
3. [Creating SLOs](#creating-slos)
4. [Performance Metrics](#performance-metrics)
5. [Error Budgets](#error-budgets)
6. [Monitoring SLOs](#monitoring-slos)
7. [Reporting](#reporting)

---

## Overview

Service Level Objectives (SLOs) define reliability targets for AI Film Studio. This guide covers defining, implementing, and monitoring SLOs.

---

## SLO Definitions

### SLO 1: API Availability

**Target:** 99.9% uptime (43.2 minutes downtime/month)

```bash
cat > slo-availability.json << 'EOF'
{
  "displayName": "API Availability - 99.9%",
  "serviceLevelIndicator": {
    "requestBased": {
      "goodTotalRatio": {
        "totalServiceFilter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\"",
        "goodServiceFilter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND httpRequest.status<500"
      }
    }
  },
  "goal": 0.999,
  "rollingPeriod": "2592000s"
}
EOF

gcloud beta monitoring slos create --slo-from-file=slo-availability.json
```

### SLO 2: API Latency

**Target:** 95% of requests complete within 1 second

```bash
cat > slo-latency.json << 'EOF'
{
  "displayName": "API Latency - p95 < 1s",
  "serviceLevelIndicator": {
    "requestBased": {
      "goodTotalRatio": {
        "totalServiceFilter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\"",
        "goodServiceFilter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND httpRequest.latency<1000ms"
      }
    }
  },
  "goal": 0.95,
  "rollingPeriod": "2592000s"
}
EOF

gcloud beta monitoring slos create --slo-from-file=slo-latency.json
```

### SLO 3: Image Generation Success Rate

**Target:** 98% of generation requests succeed

```bash
cat > slo-generation.json << 'EOF'
{
  "displayName": "Image Generation Success - 98%",
  "serviceLevelIndicator": {
    "requestBased": {
      "goodTotalRatio": {
        "totalServiceFilter": "metric.type=\"custom.googleapis.com/generation/calls\"",
        "goodServiceFilter": "metric.type=\"custom.googleapis.com/generation/calls\" AND metric.status=\"success\""
      }
    }
  },
  "goal": 0.98,
  "rollingPeriod": "2592000s"
}
EOF

gcloud beta monitoring slos create --slo-from-file=slo-generation.json
```

### SLO 4: Database Availability

**Target:** 99.95% uptime

```bash
cat > slo-database.json << 'EOF'
{
  "displayName": "Database Availability - 99.95%",
  "serviceLevelIndicator": {
    "requestBased": {
      "goodTotalRatio": {
        "totalServiceFilter": "resource.type=\"cloudsql_database\"",
        "goodServiceFilter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/up\""
      }
    }
  },
  "goal": 0.9995,
  "rollingPeriod": "2592000s"
}
EOF

gcloud beta monitoring slos create --slo-from-file=slo-database.json
```

---

## Performance Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Availability | 99.9% | < 99.8% |
| API Latency (p95) | < 1s | > 1.5s |
| Error Rate | < 0.1% | > 0.5% |
| Database CPU | < 70% | > 80% |
| Database Memory | < 75% | > 85% |
| Image Generation Success | > 98% | < 95% |
| Generation Time (avg) | < 15s | > 20s |

### Custom Metrics Implementation

```typescript
// server/_core/metrics.ts
import { MetricServiceClient } from '@google-cloud/monitoring';

const client = new MetricServiceClient();
const projectName = client.projectPath(process.env.PROJECT_ID);

export async function recordPerformanceMetric(
  metricType: string,
  value: number,
  labels: Record<string, string> = {}
) {
  const dataPoint = {
    interval: {
      endTime: {
        seconds: Math.floor(Date.now() / 1000),
      },
    },
    value: {
      doubleValue: value,
    },
  };

  const timeSeries = {
    metric: {
      type: metricType,
      labels,
    },
    resource: {
      type: 'global',
      labels: {
        project_id: process.env.PROJECT_ID,
      },
    },
    points: [dataPoint],
  };

  const request = {
    name: projectName,
    timeSeries: [timeSeries],
  };

  try {
    await client.createTimeSeries(request);
  } catch (error) {
    console.error('Failed to record metric:', error);
  }
}

// Track API performance
export async function trackAPIPerformance(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
) {
  // Record latency
  await recordPerformanceMetric(
    'custom.googleapis.com/api/latency',
    duration,
    { endpoint, method }
  );

  // Record success/failure
  const success = statusCode < 400 ? 1 : 0;
  await recordPerformanceMetric(
    'custom.googleapis.com/api/success',
    success,
    { endpoint, method }
  );

  // Record error rate
  if (statusCode >= 400) {
    await recordPerformanceMetric(
      'custom.googleapis.com/api/error_rate',
      1,
      { endpoint, status_code: statusCode.toString() }
    );
  }
}

// Track generation performance
export async function trackGenerationPerformance(
  model: string,
  success: boolean,
  duration: number,
  tokens?: number
) {
  // Record duration
  await recordPerformanceMetric(
    'custom.googleapis.com/generation/duration',
    duration,
    { model, status: success ? 'success' : 'failure' }
  );

  // Record success rate
  if (success) {
    await recordPerformanceMetric(
      'custom.googleapis.com/generation/success_rate',
      1,
      { model }
    );
  }

  // Record token usage
  if (tokens) {
    await recordPerformanceMetric(
      'custom.googleapis.com/generation/tokens',
      tokens,
      { model }
    );
  }
}
```

---

## Error Budgets

### Calculate Error Budget

```bash
# Error budget = (1 - SLO) * total time in period

# For 99.9% SLO over 30 days:
# Error budget = (1 - 0.999) * 2,592,000 seconds = 2,592 seconds = 43.2 minutes

# Track error budget consumption
gcloud monitoring time-series list \
  --filter='metric.type="monitoring.googleapis.com/uptime_check/check_passed"' \
  --format='table(metric.type, resource.labels.uptime_check_id)'
```

### Error Budget Alerts

```bash
cat > error-budget-alert.json << 'EOF'
{
  "displayName": "Error Budget - 50% Consumed",
  "conditions": [
    {
      "displayName": "Error budget > 50% consumed",
      "conditionThreshold": {
        "filter": "metric.type=\"custom.googleapis.com/error_budget/consumed_percent\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 50,
        "duration": "300s"
      }
    }
  ],
  "notificationChannels": ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"]
}
EOF

gcloud alpha monitoring policies create --policy-from-file=error-budget-alert.json
```

---

## Monitoring SLOs

### View SLOs

```bash
# List all SLOs
gcloud beta monitoring slos list

# Get SLO details
gcloud beta monitoring slos describe SLO_ID

# View SLO status
gcloud beta monitoring slos list \
  --format='table(name, displayName, goal, currentStatus)'
```

### SLO Dashboard

```bash
cat > slo-dashboard.json << 'EOF'
{
  "displayName": "AI Film Studio - SLOs",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "API Availability (99.9%)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\"",
                "aggregation": {
                  "alignmentPeriod": "2592000s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            }
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "API Latency (p95 < 1s)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/api/latency\"",
                "aggregation": {
                  "alignmentPeriod": "2592000s",
                  "perSeriesAligner": "ALIGN_PERCENTILE_95"
                }
              }
            }
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Generation Success (98%)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/generation/success_rate\"",
                "aggregation": {
                  "alignmentPeriod": "2592000s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            }
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Database Availability (99.95%)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"cloudsql.googleapis.com/database/up\"",
                "aggregation": {
                  "alignmentPeriod": "2592000s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            }
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=slo-dashboard.json
```

---

## Reporting

### Generate SLO Report

```sql
-- BigQuery query for SLO analysis
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN httpRequest.status < 500 THEN 1 ELSE 0 END) as successful_requests,
  ROUND(SUM(CASE WHEN httpRequest.status < 500 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as availability_percent,
  ROUND(APPROX_QUANTILES(CAST(httpRequest.latency as FLOAT64), 100)[OFFSET(95)], 2) as p95_latency_ms,
  ROUND(AVG(CAST(httpRequest.latency as FLOAT64)), 2) as avg_latency_ms
FROM `ai-film-studio-prod.ai_film_studio_logs.cloud_run_revision_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
GROUP BY date
ORDER BY date DESC;
```

### Monthly SLO Report

```bash
cat > slo-report.sh << 'EOF'
#!/bin/bash

PROJECT_ID="ai-film-studio-prod"
REPORT_DATE=$(date +%Y-%m)

echo "=== AI Film Studio SLO Report - $REPORT_DATE ==="
echo

# API Availability
echo "API Availability (Target: 99.9%)"
gcloud monitoring time-series list \
  --filter='metric.type="monitoring.googleapis.com/uptime_check/check_passed"' \
  --format='table(metric.type, resource.labels.uptime_check_id)' | tail -1
echo

# API Latency
echo "API Latency p95 (Target: < 1s)"
gcloud monitoring time-series list \
  --filter='metric.type="custom.googleapis.com/api/latency"' \
  --format='table(metric.type, points[0].value.double_value)'
echo

# Generation Success
echo "Generation Success Rate (Target: 98%)"
gcloud monitoring time-series list \
  --filter='metric.type="custom.googleapis.com/generation/success_rate"' \
  --format='table(metric.type, points[0].value.double_value)'
echo

# Database Availability
echo "Database Availability (Target: 99.95%)"
gcloud monitoring time-series list \
  --filter='metric.type="cloudsql.googleapis.com/database/up"' \
  --format='table(metric.type, points[0].value.double_value)'
EOF

chmod +x slo-report.sh
./slo-report.sh
```

---

## Best Practices

### 1. SLO Selection

```
✓ Choose metrics that matter to users
✓ Make SLOs measurable and achievable
✓ Align with business objectives
✓ Start conservative, adjust over time
✓ Document rationale for each SLO
```

### 2. Error Budget Management

```
✓ Track error budget consumption
✓ Alert when budget > 50% consumed
✓ Plan maintenance during low-risk periods
✓ Use error budget for feature releases
✓ Communicate budget status to team
```

### 3. SLO Communication

```
✓ Share SLOs with stakeholders
✓ Report monthly on SLO status
✓ Celebrate when SLOs are met
✓ Analyze when SLOs are missed
✓ Adjust SLOs based on learnings
```

### 4. Continuous Improvement

```
✓ Review SLOs quarterly
✓ Adjust based on actual performance
✓ Tighten SLOs as system matures
✓ Add new SLOs for new features
✓ Remove obsolete SLOs
```

---

Last Updated: January 30, 2026
Version: 1.0
