# GitHub Secrets Configuration Guide

This guide explains how to configure production secrets in your GitHub repository for the AI Film Studio CI/CD pipeline.

## Overview

GitHub Actions workflows require secrets to be stored securely in your repository. These secrets are encrypted and only exposed to workflows that need them. This guide covers all required secrets for production deployment.

## Required Secrets

### Database Secrets

- **PROD_DATABASE_URL**: MySQL/TiDB connection string for production
  - Format: `mysql://username:password@host:port/database?ssl=true`
  - Example: `mysql://prod_user:SecurePassword123@prod-db.example.com:3306/ai_film_studio_prod?ssl=true`

### Authentication & Security

- **JWT_SECRET**: Secret key for JWT token signing
  - Generate: `openssl rand -base64 32`
  - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

- **OAUTH_SERVER_URL**: Manus OAuth server URL
  - Value: `https://api.manus.im`

- **VITE_OAUTH_PORTAL_URL**: Manus OAuth portal URL
  - Value: `https://app.manus.im/login`

### Manus Built-in APIs

- **BUILT_IN_FORGE_API_KEY**: Bearer token for Manus Forge API
  - Obtain from: Manus Dashboard → API Keys

- **BUILT_IN_FORGE_API_URL**: Manus Forge API endpoint
  - Value: `https://api.manus.im/forge`

- **VITE_FRONTEND_FORGE_API_KEY**: Frontend-accessible Forge API key
  - Obtain from: Manus Dashboard → API Keys

- **VITE_FRONTEND_FORGE_API_URL**: Frontend Forge API endpoint
  - Value: `https://api.manus.im/forge`

### AI Service Credentials

- **OPENAI_API_KEY**: OpenAI API key for GPT models
  - Obtain from: https://platform.openai.com/api-keys
  - Format: `sk-...`

- **GEMINI_API_KEY**: Google Gemini API key
  - Obtain from: https://makersuite.google.com/app/apikey
  - Format: `AIzaSy...`

- **SORA_API_KEY**: OpenAI Sora API key for video generation
  - Obtain from: https://platform.openai.com/api-keys
  - Format: `sk-...`

- **VEO3_API_KEY**: VEO 3 API key for advanced video generation
  - Obtain from: VEO provider dashboard

- **NANOBANANA_API_KEY**: Nano Banana API key for efficient processing
  - Obtain from: Nano Banana dashboard

### Audio & Voice

- **ELEVENLABS_API_KEY**: ElevenLabs API key for text-to-speech
  - Obtain from: https://elevenlabs.io/app/speech-synthesis/api-keys
  - Format: `...`

### Application Configuration

- **VITE_APP_ID**: Manus OAuth application ID
  - Obtain from: Manus Dashboard → Applications

- **VITE_APP_TITLE**: Application display title
  - Value: `AI Film Studio`

- **VITE_APP_LOGO**: Logo asset path
  - Value: `/logo.svg`

- **OWNER_NAME**: Project owner name
  - Value: Your name or organization name

- **OWNER_OPEN_ID**: Manus Open ID of project owner
  - Obtain from: Manus Dashboard → Account Settings

### Deployment & Notifications


- **DEPLOYMENT_ENVIRONMENT**: Target deployment environment
  - Value: `production`

### Analytics & Monitoring

- **VITE_ANALYTICS_ENDPOINT**: Analytics service endpoint
  - Example: `https://analytics.example.com`

- **VITE_ANALYTICS_WEBSITE_ID**: Analytics website ID
  - Example: `prod-website-id`

- **SENTRY_DSN**: Sentry error tracking DSN
  - Obtain from: https://sentry.io
  - Format: `https://...@sentry.io/...`

## Setting Up Secrets via GitHub Web UI

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. Select **Secrets and variables** → **Actions** (left sidebar)

### Step 2: Add Each Secret

1. Click **New repository secret**
2. Enter the secret name (e.g., `PROD_DATABASE_URL`)
3. Paste the secret value
4. Click **Add secret**

Repeat for all required secrets.

## Setting Up Secrets via GitHub CLI

### Prerequisites

```bash
# Install GitHub CLI
brew install gh  # macOS
# or
choco install gh  # Windows
# or
sudo apt-get install gh  # Linux

# Authenticate
gh auth login
```

### Add Secrets

```bash
# Add a single secret
gh secret set PROD_DATABASE_URL --body "mysql://..."

# Add multiple secrets from a file
cat secrets.txt | while read line; do
  key=$(echo $line | cut -d'=' -f1)
  value=$(echo $line | cut -d'=' -f2-)
  gh secret set $key --body "$value"
done
```

## Setting Up Secrets via Script

### Using the Provided Setup Script

```bash
# Create a secrets.env file with your values
cat > secrets.env << 'EOF'
PROD_DATABASE_URL=mysql://...
JWT_SECRET=...
OPENAI_API_KEY=sk-...
# ... add all other secrets
EOF

# Run the setup script
./scripts/setup-github-secrets.sh secrets.env
```

## Verifying Secrets

### List All Secrets

```bash
# Via GitHub CLI
gh secret list

# Via GitHub Web UI
Settings → Secrets and variables → Actions
```

### Test Secret Access in Workflow

Add this to your GitHub Actions workflow to verify secrets are accessible:

```yaml
- name: Verify Secrets
  run: |
    if [ -z "${{ secrets.PROD_DATABASE_URL }}" ]; then
      echo "❌ PROD_DATABASE_URL not set"
      exit 1
    fi
    echo "✅ All required secrets are configured"
```

## Security Best Practices

### 1. Secret Rotation

- Rotate API keys quarterly
- Update GitHub secrets after rotation
- Monitor for unauthorized access

### 2. Access Control

- Limit secret access to specific workflows
- Use environment-specific secrets
- Audit secret usage in workflow logs

### 3. Secret Naming

- Use clear, descriptive names
- Prefix with environment (PROD_, STAGING_)
- Use uppercase with underscores

### 4. Sensitive Data

- Never commit secrets to version control
- Never log secrets in workflow output
- Use `::add-mask::` to mask secrets in logs

### 5. Monitoring

- Enable GitHub audit logs
- Monitor for failed deployments
- Set up alerts for secret access

## Troubleshooting

### Secret Not Found in Workflow

**Problem**: Workflow fails with "secret not found"

**Solution**:
1. Verify secret name matches exactly (case-sensitive)
2. Check secret is in correct repository
3. Verify workflow has permission to access secrets

### Secret Value Not Updating

**Problem**: Old secret value still being used

**Solution**:
1. Delete and recreate the secret
2. Clear GitHub Actions cache
3. Re-run the workflow

### Secrets Exposed in Logs

**Problem**: Secret value appears in workflow output

**Solution**:
1. Use `::add-mask::` to mask sensitive output
2. Review workflow logs for accidental exposure
3. Rotate exposed secrets immediately

## Workflow Integration

### Using Secrets in Workflows

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          ./scripts/deploy.sh production --verbose
```

### Environment-Specific Secrets

```yaml
jobs:
  deploy-staging:
    environment: staging
    steps:
      - run: echo "Deploying to staging"
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
  
  deploy-production:
    environment: production
    steps:
      - run: echo "Deploying to production"
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
```

## Complete Secrets Checklist

- [ ] PROD_DATABASE_URL
- [ ] JWT_SECRET
- [ ] OPENAI_API_KEY
- [ ] GEMINI_API_KEY
- [ ] SORA_API_KEY
- [ ] VEO3_API_KEY
- [ ] NANOBANANA_API_KEY
- [ ] ELEVENLABS_API_KEY
- [ ] BUILT_IN_FORGE_API_KEY
- [ ] VITE_FRONTEND_FORGE_API_KEY
- [ ] VITE_APP_ID
- [ ] OAUTH_SERVER_URL
- [ ] VITE_OAUTH_PORTAL_URL
- [ ] VITE_APP_TITLE
- [ ] VITE_APP_LOGO
- [ ] OWNER_NAME
- [ ] OWNER_OPEN_ID
- [ ] VITE_ANALYTICS_ENDPOINT
- [ ] VITE_ANALYTICS_WEBSITE_ID
- [ ] SENTRY_DSN (optional)

## Next Steps

1. Gather all required secret values
2. Add secrets to GitHub repository
3. Verify secrets in workflow
4. Test deployment pipeline
5. Monitor first production deployment

## Support

For issues with GitHub secrets:
- GitHub Docs: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- GitHub CLI: `gh secret --help`
- Contact: devops@example.com

---

**Last Updated**: 2026-02-01  
**Version**: 1.0.0
