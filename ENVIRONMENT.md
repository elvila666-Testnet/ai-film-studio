# Environment Configuration & Secrets Management

**Author:** Manus AI  
**Version:** 1.0  
**Last Updated:** January 30, 2026

---

## Overview

This guide explains how to configure environment variables and manage secrets for AI Film Studio deployment on Google Cloud. The application requires multiple API credentials and configuration values to function properly.

---

## Environment Variables

### Database Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` | Yes |

### Application Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` or `development` | Yes |
| `PORT` | Server port | `8080` | Yes |
| `JWT_SECRET` | Session signing secret | 64-character random string | Yes |

### Manus OAuth Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_APP_ID` | Manus OAuth application ID | `app_xxxxx` | Yes |
| `OAUTH_SERVER_URL` | Manus OAuth server URL | `https://api.manus.im` | Yes |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL | `https://app.manus.im/login` | Yes |

### Manus API Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `BUILT_IN_FORGE_API_URL` | Manus Forge API endpoint | `https://api.manus.im/forge` | Yes |
| `BUILT_IN_FORGE_API_KEY` | Server-side Forge API key | `key_xxxxx` | Yes |
| `VITE_FRONTEND_FORGE_API_KEY` | Client-side Forge API key | `key_xxxxx` | Yes |
| `VITE_FRONTEND_FORGE_API_URL` | Client-side Forge API URL | `https://api.manus.im/forge` | Yes |

### AI Service Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key for LLM | `sk-xxxxx` | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSyxxxxx` | No |
| `SORA_API_KEY` | Sora video generation key | `key_xxxxx` | No |
| `VEO3_API_KEY` | VEO3 video generation key | `key_xxxxx` | No |
| `NANOBANANA_API_KEY` | Nanobanana image generation key | `key_xxxxx` | No |

### ElevenLabs Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `ELEVENLABS_API_KEY` | ElevenLabs voiceover API key | `key_xxxxx` | Yes |

### Google Cloud Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | `ai-film-studio-prod` | Yes |
| `GCS_BUCKET` | Cloud Storage bucket name | `ai-film-studio-media` | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | `/var/secrets/google/key.json` | Yes |

### Application Metadata

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_APP_TITLE` | Application display name | `AI Film Studio` | Yes |
| `VITE_APP_LOGO` | Logo URL | `/logo.svg` | No |
| `OWNER_NAME` | Application owner name | `Eduardo Viladoms` | Yes |
| `OWNER_OPEN_ID` | Owner's Manus OpenID | `user_xxxxx` | Yes |

### Analytics Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_ANALYTICS_ENDPOINT` | Analytics service endpoint | `https://analytics.example.com` | No |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID | `site_xxxxx` | No |

---

## Secrets Management with Google Cloud Secret Manager

### Create Secrets

Store sensitive values in Google Cloud Secret Manager:

```bash
# Database password
echo -n "your_secure_password" | gcloud secrets create db-password --data-file=-

# JWT secret (generate with: openssl rand -base64 32)
echo -n "your_jwt_secret" | gcloud secrets create jwt-secret --data-file=-

# API keys
echo -n "your_openai_key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your_elevenlabs_key" | gcloud secrets create elevenlabs-api-key --data-file=-
echo -n "your_manus_app_id" | gcloud secrets create manus-app-id --data-file=-
echo -n "your_manus_forge_key" | gcloud secrets create manus-forge-api-key --data-file=-
```

### Grant Service Account Access

```bash
# Grant service account access to secrets
gcloud secrets add-iam-policy-binding db-password \
  --member=serviceAccount:ai-film-studio-app@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Repeat for all secrets...
```

### Reference Secrets in Deployment

In `cloud.yaml`, reference secrets like this:

```yaml
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: database-url
      key: url
```

---

## Local Development Environment

### Create .env.local File

For local development, create a `.env.local` file in the project root:

```bash
# Database
DATABASE_URL="mysql://localhost:3306/ai_film_studio"

# Application
NODE_ENV=development
PORT=3000
JWT_SECRET=your_local_jwt_secret

# Manus OAuth
VITE_APP_ID=your_local_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im/login

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your_local_forge_key
VITE_FRONTEND_FORGE_API_KEY=your_local_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# AI Services
OPENAI_API_KEY=sk-xxxxx
GEMINI_API_KEY=AIzaSyxxxxx
ELEVENLABS_API_KEY=key_xxxxx

# Google Cloud (optional for local dev)
GOOGLE_CLOUD_PROJECT=ai-film-studio-dev
GCS_BUCKET=ai-film-studio-media-dev

# Application Info
VITE_APP_TITLE="AI Film Studio (Local)"
VITE_APP_LOGO="/logo.svg"
OWNER_NAME="Your Name"
OWNER_OPEN_ID="your_open_id"
```

### Load Environment Variables

```bash
# Load from .env.local
source .env.local

# Start development server
pnpm dev
```

---

## Production Environment

### Create .env.production File

For production deployment:

```bash
# Database (use Cloud SQL proxy connection)
DATABASE_URL="mysql://app_user:PASSWORD@CLOUD_SQL_IP:3306/ai_film_studio?sslMode=REQUIRED"

# Application
NODE_ENV=production
PORT=8080
JWT_SECRET=your_production_jwt_secret

# Manus OAuth
VITE_APP_ID=your_production_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im/login

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your_production_forge_key
VITE_FRONTEND_FORGE_API_KEY=your_production_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# AI Services
OPENAI_API_KEY=sk-xxxxx
GEMINI_API_KEY=AIzaSyxxxxx
ELEVENLABS_API_KEY=key_xxxxx

# Google Cloud
GOOGLE_CLOUD_PROJECT=ai-film-studio-prod
GCS_BUCKET=ai-film-studio-media
GOOGLE_APPLICATION_CREDENTIALS=/var/secrets/google/key.json

# Application Info
VITE_APP_TITLE="AI Film Studio"
VITE_APP_LOGO="/logo.svg"
OWNER_NAME="Eduardo Viladoms"
OWNER_OPEN_ID="your_open_id"

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=site_xxxxx
```

---

## Obtaining API Credentials

### Manus OAuth

1. Log in to Manus Dashboard
2. Navigate to Applications → Create New Application
3. Set redirect URI to `https://your-domain.com/api/oauth/callback`
4. Copy Application ID and Secret

### OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and store securely

### ElevenLabs API Key

1. Visit https://elevenlabs.io/app/api-keys
2. Copy API key
3. Store securely

### Google Cloud Service Account

1. Go to Google Cloud Console
2. Navigate to Service Accounts
3. Create new service account
4. Generate JSON key
5. Download and store securely

---

## Environment-Specific Configuration

### Development

- Use local database or Cloud SQL Proxy
- Enable debug logging
- Use development API keys with higher rate limits
- Disable production security features for testing

### Staging

- Use staging Cloud SQL instance
- Use staging API keys
- Enable monitoring and logging
- Test full deployment pipeline

### Production

- Use production Cloud SQL instance with backups
- Use production API keys
- Enable all security features
- Monitor performance and errors

---

## Security Best Practices

### Secret Rotation

Rotate API keys and secrets regularly:

```bash
# Generate new JWT secret
openssl rand -base64 32

# Update in Secret Manager
echo -n "new_secret" | gcloud secrets versions add jwt-secret --data-file=-

# Update Cloud Run service
gcloud run services update ai-film-studio \
  --update-env-vars=JWT_SECRET=new_secret
```

### Access Control

Limit access to secrets:

```bash
# View who has access to a secret
gcloud secrets get-iam-policy jwt-secret

# Remove access if needed
gcloud secrets remove-iam-policy-binding jwt-secret \
  --member=serviceAccount:old-account@project.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Audit Logging

Enable audit logging for secret access:

```bash
# View secret access logs
gcloud logging read "resource.type=secretmanager.googleapis.com" \
  --limit=50 \
  --format=json
```

---

## Troubleshooting

### Secret Not Found Error

```bash
# List all secrets
gcloud secrets list

# Verify secret exists and is accessible
gcloud secrets versions access latest --secret=secret-name
```

### Permission Denied Error

```bash
# Verify service account has access
gcloud secrets get-iam-policy secret-name

# Grant access if needed
gcloud secrets add-iam-policy-binding secret-name \
  --member=serviceAccount:ai-film-studio-app@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Environment Variable Not Loaded

```bash
# Check Cloud Run service environment variables
gcloud run services describe ai-film-studio --region=us-central1 --format=yaml

# Update environment variables
gcloud run services update ai-film-studio \
  --update-env-vars=KEY=VALUE \
  --region=us-central1
```

---

## References

- [Google Cloud Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Drizzle ORM Environment Configuration](https://orm.drizzle.team/docs/get-started-mysql)

---

**End of Environment Configuration Guide**
