# Google Cloud Monitoring Dashboards - Complete Setup Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Dashboard Types](#dashboard-types)
4. [Creating Dashboards](#creating-dashboards)
5. [Cloud Run Dashboard](#cloud-run-dashboard)
6. [Cloud SQL Dashboard](#cloud-sql-dashboard)
7. [Application Performance Dashboard](#application-performance-dashboard)
8. [Cost & Billing Dashboard](#cost--billing-dashboard)
9. [Security & Compliance Dashboard](#security--compliance-dashboard)
10. [Custom Metrics](#custom-metrics)
11. [Dashboard Best Practices](#dashboard-best-practices)

---

## Overview

Google Cloud Monitoring provides real-time visibility into your AI Film Studio application. This guide covers setting up five essential dashboards:

1. **Cloud Run Dashboard** - Service health, requests, errors, latency
2. **Cloud SQL Dashboard** - Database performance, connections, queries
3. **Application Performance Dashboard** - Custom metrics, business KPIs
4. **Cost & Billing Dashboard** - Resource usage and costs
5. **Security & Compliance Dashboard** - Access logs, anomalies

---

## Prerequisites

### Required Permissions

```bash
# Your account needs these roles:
# - monitoring.admin
# - monitoring.metricWriter
# - logging.admin

# Verify permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:YOUR_EMAIL"
```

### Enable Required APIs

```bash
gcloud services enable \
  monitoring.googleapis.com \
  logging.googleapis.com \
  cloudtrace.googleapis.com \
  cloudprofiler.googleapis.com
```

### Set Project Variables

```bash
export PROJECT_ID="ai-film-studio-prod"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export REGION="us-central1"
export SERVICE_NAME="ai-film-studio"
```

---

## Dashboard Types

### 1. Cloud Run Dashboard
**Purpose:** Monitor service health, requests, errors, latency
**Metrics:** Request count, error rate, latency, memory usage, CPU usage
**Audience:** DevOps, SREs

### 2. Cloud SQL Dashboard
**Purpose:** Monitor database performance
**Metrics:** Connections, queries, replication lag, CPU, memory
**Audience:** Database administrators, DevOps

### 3. Application Performance Dashboard
**Purpose:** Monitor business metrics and application behavior
**Metrics:** API response times, user actions, feature usage, data processing
**Audience:** Product managers, engineers

### 4. Cost & Billing Dashboard
**Purpose:** Track resource usage and costs
**Metrics:** Cloud Run costs, Cloud SQL costs, storage costs, total spend
**Audience:** Finance, engineering leads

### 5. Security & Compliance Dashboard
**Purpose:** Monitor security events and compliance
**Metrics:** Access logs, failed logins, API errors, data access
**Audience:** Security team, compliance officers

---

## Creating Dashboards

### Method 1: Using Google Cloud Console (UI)

#### Step 1: Navigate to Monitoring

```
1. Go to Google Cloud Console
2. Search for "Monitoring"
3. Click "Dashboards"
4. Click "CREATE DASHBOARD"
5. Enter dashboard name
6. Click "CREATE"
```

#### Step 2: Add Charts

```
1. Click "ADD WIDGET"
2. Choose chart type (Line, Gauge, Scorecard, etc.)
3. Select metric
4. Configure filters and aggregation
5. Click "SAVE"
```

### Method 2: Using gcloud CLI

```bash
# Create dashboard from JSON configuration
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

### Method 3: Using Terraform

```hcl
resource "google_monitoring_dashboard" "ai_film_studio" {
  dashboard_json = jsonencode({
    displayName = "AI Film Studio - Cloud Run"
    mosaicLayout = {
      columns = 12
      tiles = [
        # Add tiles here
      ]
    }
  })
}
```

---

## Cloud Run Dashboard

### Dashboard Configuration

```bash
cat > cloud-run-dashboard.json << 'EOF'
{
  "displayName": "AI Film Studio - Cloud Run",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Count (5min)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/request_count\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Error Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.response_code_class=\"5xx\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Latency (p95)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_95"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Memory Usage",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/container_memory_utilizations\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 8,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "CPU Usage",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/container_cpu_utilizations\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 8,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Concurrent Requests",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ai-film-studio\" AND metric.type=\"run.googleapis.com/concurrent_requests\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MAX"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

# Create dashboard
gcloud monitoring dashboards create --config-from-file=cloud-run-dashboard.json
```

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 1% | Investigate errors |
| Latency (p95) | > 5s | Check database, scale up |
| Memory Usage | > 80% | Increase memory allocation |
| CPU Usage | > 90% | Increase CPU allocation |
| Concurrent Requests | > 100 | Monitor scaling |

---

## Cloud SQL Dashboard

### Dashboard Configuration

```bash
cat > cloud-sql-dashboard.json << 'EOF'
{
  "displayName": "AI Film Studio - Cloud SQL",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Database Connections",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/network/connections\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "CPU Utilization",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Memory Utilization",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/memory/utilization\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Disk Utilization",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/disk/utilization\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 8,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Queries Per Second",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/mysql/queries\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 8,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Replication Lag",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"ai-film-studio:ai-film-studio-db\" AND metric.type=\"cloudsql.googleapis.com/database/replication/replica_lag\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MAX"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

# Create dashboard
gcloud monitoring dashboards create --config-from-file=cloud-sql-dashboard.json
```

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Utilization | > 80% | Upgrade instance tier |
| Memory Utilization | > 85% | Upgrade instance tier |
| Disk Utilization | > 90% | Increase disk size |
| Connections | > 80 | Optimize connection pooling |
| Replication Lag | > 5s | Investigate replication |

---

## Application Performance Dashboard

### Custom Metrics Setup

```bash
# Create custom metric for API response times
cat > custom-metrics.js << 'EOF'
const monitoring = require('@google-cloud/monitoring');

const client = new monitoring.MetricServiceClient();
const projectName = client.projectPath(process.env.PROJECT_ID);

async function writeTimeSeriesData() {
  const dataPoint = {
    interval: {
      endTime: {
        seconds: Math.floor(Date.now() / 1000),
      },
    },
    value: {
      doubleValue: responseTime, // milliseconds
    },
  };

  const timeSeries = {
    metric: {
      type: 'custom.googleapis.com/api/response_time',
      labels: {
        method: 'POST',
        endpoint: '/api/generate-image',
      },
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

  await client.createTimeSeries(request);
}
EOF
```

### Dashboard Configuration

```bash
cat > app-performance-dashboard.json << 'EOF'
{
  "displayName": "AI Film Studio - Application Performance",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 4,
        "height": 3,
        "widget": {
          "title": "Total API Calls",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/api/calls\" AND resource.type=\"global\"",
                "aggregation": {
                  "alignmentPeriod": "3600s",
                  "perSeriesAligner": "ALIGN_SUM"
                }
              }
            },
            "sparkChartView": {
              "sparkChartType": "SPARK_LINE"
            }
          }
        }
      },
      {
        "xPos": 4,
        "width": 4,
        "height": 3,
        "widget": {
          "title": "Avg Response Time",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/api/response_time\" AND resource.type=\"global\"",
                "aggregation": {
                  "alignmentPeriod": "300s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            },
            "sparkChartView": {
              "sparkChartType": "SPARK_LINE"
            }
          }
        }
      },
      {
        "xPos": 8,
        "width": 4,
        "height": 3,
        "widget": {
          "title": "API Success Rate",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/api/success_rate\" AND resource.type=\"global\"",
                "aggregation": {
                  "alignmentPeriod": "300s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            },
            "sparkChartView": {
              "sparkChartType": "SPARK_LINE"
            }
          }
        }
      },
      {
        "yPos": 3,
        "width": 12,
        "height": 4,
        "widget": {
          "title": "API Response Time by Endpoint",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/api/response_time\" AND resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN",
                    "groupByFields": ["metric.label.endpoint"]
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 7,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Image Generation Success Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/generation/success_rate\" AND resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 7,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Average Generation Time",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/generation/duration\" AND resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

# Create dashboard
gcloud monitoring dashboards create --config-from-file=app-performance-dashboard.json
```

---

## Cost & Billing Dashboard

### Dashboard Configuration

```bash
cat > cost-dashboard.json << 'EOF'
{
  "displayName": "AI Film Studio - Costs & Billing",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 4,
        "height": 3,
        "widget": {
          "title": "Current Month Cost",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"serviceruntime.googleapis.com/api/consumer/quota_used_count\" AND resource.type=\"api\"",
                "aggregation": {
                  "alignmentPeriod": "2592000s",
                  "perSeriesAligner": "ALIGN_SUM"
                }
              }
            }
          }
        }
      },
      {
        "xPos": 4,
        "width": 4,
        "height": 3,
        "widget": {
          "title": "Cloud Run Cost",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/billing/cloud_run_cost\" AND resource.type=\"global\"",
                "aggregation": {
                  "alignmentPeriod": "2592000s",
                  "perSeriesAligner": "ALIGN_SUM"
                }
              }
            }
          }
        }
      },
      {
        "xPos": 8,
        "width": 4,
        "height": 3,
        "widget": {
          "title": "Cloud SQL Cost",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/billing/cloud_sql_cost\" AND resource.type=\"global\"",
                "aggregation": {
                  "alignmentPeriod": "2592000s",
                  "perSeriesAligner": "ALIGN_SUM"
                }
              }
            }
          }
        }
      },
      {
        "yPos": 3,
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Daily Cost Trend",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/billing/daily_cost\" AND resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "86400s",
                    "perSeriesAligner": "ALIGN_SUM"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 7,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cost by Service",
          "pieChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/billing/service_cost\" AND resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "2592000s",
                    "perSeriesAligner": "ALIGN_SUM",
                    "groupByFields": ["metric.label.service"]
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 7,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cost Forecast (30 days)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/billing/forecast\" AND resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "86400s",
                    "perSeriesAligner": "ALIGN_SUM"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

# Create dashboard
gcloud monitoring dashboards create --config-from-file=cost-dashboard.json
```

### Export Billing Data to BigQuery

```bash
# Create BigQuery dataset for billing
bq mk --dataset \
  --description="AI Film Studio billing data" \
  --location=US \
  billing_data

# Export Cloud Billing to BigQuery
gcloud billing accounts export-config describe ACCOUNT_ID

# Create sink
gcloud logging sinks create billing-sink \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/billing_data \
  --log-filter='resource.type="billing_account"'
```

---

## Security & Compliance Dashboard

### Dashboard Configuration

```bash
cat > security-dashboard.json << 'EOF'
{
  "displayName": "AI Film Studio - Security & Compliance",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 4,
        "height": 3,
        "widget": {
          "title": "Failed Login Attempts (24h)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "protoPayload.methodName=\"google.identity.accesscontextmanager.v1.AccessContextManager.ListAccessLevels\" AND protoPayload.status.code=7",
                "aggregation": {
                  "alignmentPeriod": "86400s",
                  "perSeriesAligner": "ALIGN_COUNT"
                }
              }
            }
          }
        }
      },
      {
        "xPos": 4,
        "width": 4,
        "height": 3,
        "widget": {
          "title": "API Errors (24h)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"cloud_run_revision\" AND httpRequest.status>=400",
                "aggregation": {
                  "alignmentPeriod": "86400s",
                  "perSeriesAligner": "ALIGN_COUNT"
                }
              }
            }
          }
        }
      },
      {
        "xPos": 8,
        "width": 4,
        "height": 3,
        "widget": {
          "title": "Unauthorized Access Attempts",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"cloud_run_revision\" AND httpRequest.status=403",
                "aggregation": {
                  "alignmentPeriod": "86400s",
                  "perSeriesAligner": "ALIGN_COUNT"
                }
              }
            }
          }
        }
      },
      {
        "yPos": 3,
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Failed Login Attempts Over Time",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "protoPayload.methodName=\"google.identity.accesscontextmanager.v1.AccessContextManager.ListAccessLevels\" AND protoPayload.status.code=7",
                  "aggregation": {
                    "alignmentPeriod": "3600s",
                    "perSeriesAligner": "ALIGN_COUNT"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 7,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "API Errors by Status Code",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND httpRequest.status>=400",
                  "aggregation": {
                    "alignmentPeriod": "3600s",
                    "perSeriesAligner": "ALIGN_COUNT",
                    "groupByFields": ["httpRequest.status"]
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 7,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Data Access Events",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "protoPayload.methodName=\"cloudsql.instances.get\" OR protoPayload.methodName=\"cloudsql.databases.get\"",
                  "aggregation": {
                    "alignmentPeriod": "3600s",
                    "perSeriesAligner": "ALIGN_COUNT"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

# Create dashboard
gcloud monitoring dashboards create --config-from-file=security-dashboard.json
```

---

## Custom Metrics

### Instrumenting Your Application

```typescript
// server/_core/metrics.ts
import { MetricServiceClient } from '@google-cloud/monitoring';

const client = new MetricServiceClient();
const projectName = client.projectPath(process.env.PROJECT_ID);

export async function recordMetric(
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

// Usage in your application
export async function recordAPICall(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
) {
  await recordMetric('custom.googleapis.com/api/calls', 1, {
    endpoint,
    method,
    status: statusCode.toString(),
  });

  await recordMetric('custom.googleapis.com/api/response_time', duration, {
    endpoint,
    method,
  });

  if (statusCode >= 200 && statusCode < 300) {
    await recordMetric('custom.googleapis.com/api/success_rate', 1, {
      endpoint,
    });
  }
}
```

### Recording Business Metrics

```typescript
// Example: Track image generation success
export async function recordImageGeneration(
  model: string,
  success: boolean,
  duration: number
) {
  await recordMetric('custom.googleapis.com/generation/calls', 1, {
    model,
    status: success ? 'success' : 'failure',
  });

  await recordMetric('custom.googleapis.com/generation/duration', duration, {
    model,
  });

  if (success) {
    await recordMetric('custom.googleapis.com/generation/success_rate', 1, {
      model,
    });
  }
}
```

---

## Dashboard Best Practices

### 1. Organization

```
✓ Group related metrics together
✓ Use consistent naming conventions
✓ Arrange by importance (top-left = most important)
✓ Use appropriate chart types for data
✓ Limit to 12-15 charts per dashboard
```

### 2. Chart Selection

| Data Type | Chart Type |
|-----------|-----------|
| Trends over time | Line chart |
| Single value | Scorecard |
| Percentages | Pie chart |
| Comparisons | Bar chart |
| Distributions | Heatmap |
| Status | Gauge |

### 3. Naming Conventions

```
✓ Dashboard: "AI Film Studio - [Category]"
✓ Chart: "[Metric] ([Aggregation])"
✓ Metric: "custom.googleapis.com/[service]/[metric]"
✓ Labels: lowercase_with_underscores
```

### 4. Alert Integration

```bash
# Link dashboards to alert policies
# When alert fires, include link to dashboard
# Example: "View dashboard: https://console.cloud.google.com/monitoring/dashboards/custom/DASHBOARD_ID"
```

### 5. Refresh Rates

```
✓ Real-time dashboards: 1-5 minute refresh
✓ Operational dashboards: 5-15 minute refresh
✓ Strategic dashboards: 1 hour refresh
✓ Historical dashboards: Manual refresh
```

---

## Sharing & Collaboration

### Share Dashboard with Team

```bash
# Get dashboard ID
DASHBOARD_ID=$(gcloud monitoring dashboards list --format='value(name)' | grep "ai-film-studio")

# Share with team members
gcloud monitoring dashboards update $DASHBOARD_ID \
  --config-from-file=dashboard.json
```

### Export Dashboard

```bash
# Export to JSON
gcloud monitoring dashboards describe DASHBOARD_ID \
  --format=json > dashboard-export.json

# Share via version control
git add dashboard-export.json
git commit -m "Update monitoring dashboard"
git push origin main
```

---

## Troubleshooting

### Metrics Not Appearing

```bash
# Verify metric exists
gcloud monitoring metrics-descriptors list \
  --filter='metric.type:custom.googleapis.com/api/*'

# Check for data
gcloud monitoring time-series list \
  --filter='metric.type="custom.googleapis.com/api/calls"'

# Verify permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:YOUR_EMAIL"
```

### Dashboard Not Loading

```bash
# Verify dashboard exists
gcloud monitoring dashboards list

# Check dashboard configuration
gcloud monitoring dashboards describe DASHBOARD_ID

# Verify metrics in filter are valid
# Check metric type spelling and labels
```

### High Latency in Dashboards

```bash
# Reduce time range
# Use aggregation to reduce data points
# Simplify filters
# Use fewer metrics per chart
```

---

## Advanced Features

### Anomaly Detection

```bash
# Enable anomaly detection for metrics
gcloud monitoring alert-policies create \
  --display-name="Anomaly Detection" \
  --condition-display-name="Anomalous latency" \
  --condition-threshold-value=0 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_LT
```

### Forecasting

```bash
# Forecast future costs
# Use historical data to predict trends
# Set up budget alerts based on forecasts
```

### Correlation Analysis

```bash
# Compare multiple metrics
# Identify relationships between metrics
# Use for root cause analysis
```

---

## Resources

- [Google Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Dashboard Best Practices](https://cloud.google.com/monitoring/dashboards)
- [Metric Types Reference](https://cloud.google.com/monitoring/api/metrics_gcp)
- [MQL Query Language](https://cloud.google.com/monitoring/mql)

---

Last Updated: January 30, 2026
Version: 1.0
