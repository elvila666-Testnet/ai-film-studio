# Environment Variables Configuration Guide

## Overview

This document describes all environment variables required for AI Film Studio deployment.

## Required Variables

### Authentication & OAuth

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_APP_ID` | Yes | Manus OAuth Application ID | `your-app-id-12345` |
| `OAUTH_SERVER_URL` | Yes | Manus OAuth Server URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Yes | Manus OAuth Portal URL | `https://manus.im` |
| `JWT_SECRET` | Yes | Secret key for JWT signing | `$(openssl rand -base64 32)` |

### Database

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | MySQL connection string | `mysql://user:pass@/db?unix_socket=/cloudsql/...` |

### AI/ML APIs

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key | `AIzaSy...` |
| `OPENAI_API_KEY` | Yes | OpenAI API key | `sk-...` |
| `SORA_API_KEY` | No | OpenAI Sora API key | `sk-...` |
| `VEO3_API_KEY` | No | Google VEO3 API key | `...` |
| `NANOBANANA_API_KEY` | No | Nano Banana API key | `...` |

### Manus Built-in APIs

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `BUILT_IN_FORGE_API_URL` | Yes | Manus Forge API URL | `https://forge.manus.im` |
| `BUILT_IN_FORGE_API_KEY` | Yes | Manus Forge API key | `...` |
| `VITE_FRONTEND_FORGE_API_URL` | Yes | Frontend Forge API URL | `https://forge.manus.im` |
| `VITE_FRONTEND_FORGE_API_KEY` | Yes | Frontend Forge API key | `...` |

### Owner Information

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OWNER_NAME` | Yes | Project owner name | `John Doe` |
| `OWNER_OPEN_ID` | Yes | Project owner Manus ID | `user-123456` |

### Analytics

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_ANALYTICS_ENDPOINT` | No | Analytics endpoint URL | `https://analytics.example.com` |
| `VITE_ANALYTICS_WEBSITE_ID` | No | Analytics website ID | `website-123` |

### Application

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_APP_TITLE` | No | Application title | `AI Film Studio` |
| `VITE_APP_LOGO` | No | Application logo URL | `https://example.com/logo.png` |
| `NODE_ENV` | Yes | Environment | `production` or `development` |

---

## Setting Up Secrets in Google Cloud

### 1. Create Secrets

```bash
# Authentication
echo -n "your-app-id" | gcloud secrets create VITE_APP_ID --data-file=-
echo -n "https://api.manus.im" | gcloud secrets create OAUTH_SERVER_URL --data-file=-
echo -n "https://manus.im" | gcloud secrets create VITE_OAUTH_PORTAL_URL --data-file=-
echo -n "$(openssl rand -base64 32)" | gcloud secrets create JWT_SECRET --data-file=-

# Database
echo -n "mysql://user:pass@/db?unix_socket=/cloudsql/..." | gcloud secrets create DATABASE_URL --data-file=-

# AI APIs
echo -n "your-gemini-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your-openai-key" | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "your-sora-key" | gcloud secrets create SORA_API_KEY --data-file=-
echo -n "your-veo3-key" | gcloud secrets create VEO3_API_KEY --data-file=-

# Manus APIs
echo -n "your-forge-url" | gcloud secrets create BUILT_IN_FORGE_API_URL --data-file=-
echo -n "your-forge-key" | gcloud secrets create BUILT_IN_FORGE_API_KEY --data-file=-
echo -n "your-frontend-forge-url" | gcloud secrets create VITE_FRONTEND_FORGE_API_URL --data-file=-
echo -n "your-frontend-forge-key" | gcloud secrets create VITE_FRONTEND_FORGE_API_KEY --data-file=-

# Owner
echo -n "John Doe" | gcloud secrets create OWNER_NAME --data-file=-
echo -n "user-123456" | gcloud secrets create OWNER_OPEN_ID --data-file=-
```

### 2. Grant Cloud Run Access

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant access to all secrets
for secret in VITE_APP_ID OAUTH_SERVER_URL VITE_OAUTH_PORTAL_URL JWT_SECRET \
              DATABASE_URL GEMINI_API_KEY OPENAI_API_KEY SORA_API_KEY VEO3_API_KEY \
              BUILT_IN_FORGE_API_URL BUILT_IN_FORGE_API_KEY \
              VITE_FRONTEND_FORGE_API_URL VITE_FRONTEND_FORGE_API_KEY \
              OWNER_NAME OWNER_OPEN_ID; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 3. Reference Secrets in Cloud Run

```bash
gcloud run services update ai-film-studio \
  --region us-central1 \
  --set-secrets="VITE_APP_ID=VITE_APP_ID:latest,OAUTH_SERVER_URL=OAUTH_SERVER_URL:latest,..." \
  --set-env-vars="NODE_ENV=production"
```

---

## Local Development Setup

### 1. Create .env.local

```bash
# Create .env.local file in project root
cat > .env.local << 'EOF'
# OAuth
VITE_APP_ID=your-dev-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# Database (local)
DATABASE_URL=mysql://root:password@localhost:3306/ai_film_studio

# AI APIs
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
SORA_API_KEY=your-sora-key
VEO3_API_KEY=your-veo3-key

# Manus APIs
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-key

# Owner
OWNER_NAME=Your Name
OWNER_OPEN_ID=your-open-id

# Environment
NODE_ENV=development
EOF
```

### 2. Never Commit Secrets

```bash
# Add to .gitignore
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore
```

### 3. Load Environment Variables

```bash
# Using pnpm
pnpm dev

# Or manually
source .env.local
npm run dev
```

---

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
DATABASE_URL=mysql://root:password@localhost:3306/ai_film_studio
VITE_APP_ID=dev-app-id
```

### Staging

```bash
NODE_ENV=staging
DATABASE_URL=mysql://user:pass@/ai_film_studio?unix_socket=/cloudsql/...
VITE_APP_ID=staging-app-id
```

### Production

```bash
NODE_ENV=production
DATABASE_URL=mysql://user:pass@/ai_film_studio?unix_socket=/cloudsql/...
VITE_APP_ID=prod-app-id
```

---

## Obtaining API Keys

### Google Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create new API key
4. Copy the key

### OpenAI API

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key

### Manus OAuth

1. Log in to [Manus Dashboard](https://manus.im/dashboard)
2. Go to Settings → OAuth Applications
3. Create new application
4. Copy App ID and credentials

### Manus Forge API

1. Go to [Manus API Hub](https://manus.im/api-hub)
2. Generate API key
3. Copy the key

---

## Validating Configuration

### Check Secrets are Set

```bash
# List all secrets
gcloud secrets list

# Check specific secret
gcloud secrets versions access latest --secret=GEMINI_API_KEY

# Verify Cloud Run has access
gcloud run services describe ai-film-studio --region us-central1 \
  --format='value(spec.template.spec.containers[0].env)'
```

### Test Database Connection

```bash
# Connect to Cloud SQL
gcloud sql connect ai-film-studio-db --user=filmstudio

# Test query
SELECT 1;
```

### Test API Connectivity

```bash
# Test Manus OAuth
curl -X GET "https://api.manus.im/health"

# Test Gemini API
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

## Rotating Secrets

### Rotate API Key

```bash
# Generate new version
echo -n "new-api-key" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Update Cloud Run to use new version
gcloud run services update ai-film-studio \
  --region us-central1 \
  --update-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"

# Disable old version
gcloud secrets versions disable OLD_VERSION_ID --secret=GEMINI_API_KEY
```

### Rotation Schedule

- **API Keys**: Every 90 days
- **JWT Secret**: Every 180 days
- **Database Password**: Every 6 months
- **OAuth Credentials**: When compromised or rotated by provider

---

## Troubleshooting

### Secret Not Found

```bash
# Verify secret exists
gcloud secrets describe GEMINI_API_KEY

# Check permissions
gcloud secrets get-iam-policy GEMINI_API_KEY
```

### Permission Denied

```bash
# Grant access to service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### Invalid Database Connection

```bash
# Test connection locally
mysql -h CLOUD_SQL_IP -u filmstudio -p ai_film_studio

# Check connection string format
# mysql://user:password@/database?unix_socket=/cloudsql/PROJECT:REGION:INSTANCE
```

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use strong passwords** for database users
3. **Rotate secrets regularly** (every 90 days)
4. **Audit secret access** logs
5. **Use service accounts** for API access
6. **Enable secret versioning** for rollback capability
7. **Restrict secret access** to necessary services only
8. **Use separate secrets** for different environments

---

## Reference

- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [12 Factor App - Config](https://12factor.net/config)

---

Last Updated: January 30, 2026
