# CI/CD Pipeline Setup - AI Film Studio

## Overview

This guide explains how to set up GitHub Actions CI/CD pipeline for automated testing, building, and deployment to Google Cloud Run.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Setup](#github-setup)
3. [Google Cloud Setup](#google-cloud-setup)
4. [GitHub Secrets Configuration](#github-secrets-configuration)
5. [Workflow Files](#workflow-files)
6. [Testing the Pipeline](#testing-the-pipeline)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Prerequisites

- GitHub repository with the AI Film Studio code
- Google Cloud Project with Cloud Run enabled
- Google Cloud Service Account with appropriate permissions
- Slack workspace (optional, for notifications)

---

## GitHub Setup

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/)
2. Create new repository: `ai-film-studio`
3. Clone locally and push code:

```bash
git clone https://github.com/YOUR_USERNAME/ai-film-studio.git
cd ai-film-studio
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Enable GitHub Actions

1. Go to repository settings
2. Navigate to **Actions** → **General**
3. Enable GitHub Actions
4. Set workflow permissions:
   - Select "Read and write permissions"
   - Enable "Allow GitHub Actions to create and approve pull requests"

### Step 3: Create Branch Protection Rules

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch
3. Enable "Require status checks to pass before merging"
4. Select required checks:
   - `test / test`
   - `pr-checks / lint-and-test`
   - `pr-checks / security-scan`

---

## Google Cloud Setup

### Step 1: Create Service Account

```bash
# Set project ID
export PROJECT_ID="ai-film-studio"
gcloud config set project $PROJECT_ID

# Create service account
gcloud iam service-accounts create github-actions-sa \
  --display-name="GitHub Actions Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

### Step 2: Set Up Workload Identity Federation

This allows GitHub Actions to authenticate without storing long-lived credentials.

```bash
# Enable required APIs
gcloud services enable iam.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable sts.googleapis.com
gcloud services enable serviceusage.googleapis.com

# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get the Workload Identity Provider resource name
export WIF_PROVIDER=$(gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)")

echo "WIF_PROVIDER: $WIF_PROVIDER"

# Grant Workload Identity User role to the service account
gcloud iam service-accounts add-iam-policy-binding "github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --subject="principalSet://iam.googleapis.com/projects/${PROJECT_ID}/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_USERNAME/ai-film-studio"
```

---

## GitHub Secrets Configuration

### Step 1: Add Google Cloud Secrets

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Create the following secrets:

| Secret Name | Value |
|---|---|
| `GCP_PROJECT_ID` | Your Google Cloud Project ID |
| `WIF_PROVIDER` | The Workload Identity Provider resource name from above |
| `WIF_SERVICE_ACCOUNT` | `github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com` |

### Step 2: Add Optional Slack Webhook (for notifications)

1. Create Slack App at [api.slack.com](https://api.slack.com/)
2. Enable Incoming Webhooks
3. Create webhook URL for your channel
4. Add secret:

| Secret Name | Value |
|---|---|
| `SLACK_WEBHOOK` | Your Slack webhook URL |

### Step 3: Add API Keys (Optional)

If you want to run tests with real API keys:

| Secret Name | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `NANOBANANA_API_KEY` | Your Nanobanana API key |
| `SORA_API_KEY` | Your Sora API key |
| `VEO3_API_KEY` | Your Veo3 API key |
| `OPENAI_API_KEY` | Your OpenAI API key |

---

## Workflow Files

### 1. Test Workflow (`.github/workflows/test.yml`)

Runs on every push and pull request. Tests include:
- Linting with Prettier
- Type checking with TypeScript
- Unit tests with Vitest
- Coverage reporting

**Triggers**: Push to main/develop, Pull requests

**Duration**: ~5-10 minutes

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

Deploys to Google Cloud Run on every push to main. Includes:
- All tests from test workflow
- Docker image build
- Push to Artifact Registry
- Deploy to Cloud Run
- Automatic rollback on failure
- Slack notifications

**Triggers**: Push to main branch, manual workflow dispatch

**Duration**: ~15-20 minutes

### 3. PR Checks Workflow (`.github/workflows/pr-checks.yml`)

Runs on pull requests. Includes:
- Linting and type checking
- Security scanning with Trivy
- Dependency auditing
- Build verification

**Triggers**: Pull requests to main/develop

**Duration**: ~10-15 minutes

---

## Testing the Pipeline

### Step 1: Test the Test Workflow

```bash
# Create a test branch
git checkout -b test/ci-pipeline

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "Test CI pipeline"
git push origin test/ci-pipeline

# Go to GitHub and create a pull request
# Watch the workflow run in the Actions tab
```

### Step 2: Test the Deploy Workflow

```bash
# Merge the PR to main
# The deploy workflow should automatically trigger

# Monitor the deployment:
# 1. Go to GitHub Actions tab
# 2. Click on the "Deploy to Google Cloud" workflow
# 3. Watch the progress
# 4. Check Google Cloud Console for the deployed service
```

### Step 3: Verify Deployment

```bash
# Get the Cloud Run service URL
gcloud run services describe ai-film-studio \
  --region us-central1 \
  --format='value(status.url)'

# Test the service
curl https://ai-film-studio-xxxxx.run.app/
```

---

## Workflow Customization

### Change Deployment Region

Edit `.github/workflows/deploy.yml`:

```yaml
env:
  GKE_REGION: us-central1  # Change this
```

### Change Cloud Run Configuration

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Deploy to Cloud Run
  run: |
    gcloud run deploy ${{ env.SERVICE_NAME }} \
      --memory=2Gi \           # Change memory
      --cpu=2 \               # Change CPU
      --max-instances=50 \    # Add auto-scaling
      ...
```

### Add Environment-Specific Deployments

Create separate workflows for staging and production:

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [develop]

env:
  SERVICE_NAME: ai-film-studio-staging
  GKE_REGION: us-central1
```

### Add Scheduled Deployments

```yaml
# Deploy every day at 2 AM UTC
on:
  schedule:
    - cron: '0 2 * * *'
```

---

## Monitoring & Troubleshooting

### View Workflow Logs

1. Go to repository **Actions** tab
2. Click on workflow run
3. Click on job to see detailed logs
4. Expand steps to see full output

### Common Issues

#### Issue: "Permission denied" during deployment

**Solution**: Verify Workload Identity setup:

```bash
# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions-sa*"

# Re-grant roles if needed
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

#### Issue: "Docker image build fails"

**Solution**: Check Docker build logs:

```bash
# Build locally to test
docker build -t ai-film-studio:test .

# Check for errors
docker build --progress=plain -t ai-film-studio:test .
```

#### Issue: "Tests fail in CI but pass locally"

**Solution**: Check environment differences:

```bash
# Run tests with CI environment
DATABASE_URL="mysql://root:root@localhost:3306/ai_film_studio_test" \
JWT_SECRET="test-secret" \
pnpm test
```

### Enable Debug Logging

Add to workflow file:

```yaml
- name: Enable debug logging
  run: echo "::debug::Debug logging enabled"
```

Then re-run workflow with debug enabled:

1. Click "Re-run jobs" → "Re-run all jobs with debug logging"

### Monitor Cloud Run Deployments

```bash
# View recent deployments
gcloud run revisions list \
  --service=ai-film-studio \
  --region=us-central1 \
  --limit=10

# View service logs
gcloud logging read "resource.type=cloud_run_revision" \
  --limit=50 \
  --format=json

# Stream logs in real-time
gcloud logging read "resource.type=cloud_run_revision" \
  --follow
```

---

## Best Practices

1. **Always test locally first** - Run `pnpm test` and `pnpm build` before pushing
2. **Use meaningful commit messages** - Makes it easier to track deployments
3. **Review workflow logs** - Check logs after each deployment
4. **Keep secrets secure** - Never commit secrets or API keys
5. **Monitor costs** - Check Cloud Run and Artifact Registry costs regularly
6. **Set up alerts** - Configure Slack notifications for failures
7. **Document changes** - Update this guide when modifying workflows
8. **Test rollbacks** - Periodically test the rollback procedure

---

## Advanced Configuration

### Matrix Testing

Test against multiple Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Conditional Steps

Only deploy if tests pass:

```yaml
- name: Deploy
  if: success()
  run: gcloud run deploy ...
```

### Caching Dependencies

Speed up builds:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'
```

### Artifact Upload

Save build artifacts:

```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: build
    path: dist/
```

---

## Support & Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)

---

**Last Updated**: January 29, 2026
