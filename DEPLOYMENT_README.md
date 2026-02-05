# AI Film Studio - Production Deployment Package

**Version:** 1.0  
**Release Date:** January 30, 2026  
**Status:** Ready for Google Cloud Deployment

---

## Overview

This deployment package contains everything needed to deploy AI Film Studio to Google Cloud Platform. The application is a full-stack AI-powered film production tool built with React 19, Express 4, tRPC 11, and Drizzle ORM.

### What's Included

This package contains comprehensive documentation and configuration for deploying to Google Cloud:

- **DEPLOYMENT.md** — Complete Google Cloud deployment guide with step-by-step instructions
- **ENVIRONMENT.md** — Environment variables and secrets management guide
- **DEPLOYMENT_CHECKLIST.md** — Pre-deployment and post-deployment verification checklist
- **Dockerfile** — Multi-stage Docker build configuration
- **cloud.yaml** — Kubernetes-style Cloud Run configuration
- **scripts/deploy-gcp.sh** — Automated deployment script
- **.dockerignore** — Docker build optimization

---

## Quick Start

### Prerequisites

Before deploying, ensure you have:

- Google Cloud SDK installed: https://cloud.google.com/sdk/docs/install
- Docker installed: https://docs.docker.com/get-docker/
- Node.js 22+ installed: https://nodejs.org/
- Active Google Cloud Project with billing enabled
- All required API credentials (see ENVIRONMENT.md)

### 5-Minute Deployment

```bash
# 1. Set your project ID
export PROJECT_ID="ai-film-studio-prod"
export REGION="us-central1"

# 2. Authenticate with Google Cloud
gcloud auth login
gcloud config set project $PROJECT_ID

# 3. Run the automated deployment script
chmod +x scripts/deploy-gcp.sh
./scripts/deploy-gcp.sh $PROJECT_ID $REGION production

# 4. Get your service URL
gcloud run services describe ai-film-studio \
  --region=$REGION \
  --format='value(status.url)'
```

That's it! Your application is now deployed on Google Cloud Run.

---

## Architecture

AI Film Studio is deployed across multiple Google Cloud services:

```
┌─────────────────────────────────────────────┐
│        Google Cloud Platform                 │
├─────────────────────────────────────────────┤
│                                              │
│  Cloud Run (Containerized Application)      │
│  ├─ React Frontend                          │
│  ├─ Express Backend                         │
│  └─ tRPC API Layer                          │
│                                              │
│  Cloud SQL (MySQL Database)                 │
│  ├─ Projects & Scripts                      │
│  ├─ Users & Brands                          │
│  └─ Storyboards & Content                   │
│                                              │
│  Cloud Storage (File Storage)               │
│  ├─ Generated Images                        │
│  ├─ Generated Videos                        │
│  └─ User Uploads                            │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Key Features

### Brand Intelligence System

The application centers on brand guidelines that control all content generation:

- **Brand Parameters** — Define target customer, aesthetic, mission, and core messaging
- **Compliance Scoring** — AI analyzes all generated content for brand alignment
- **Automatic Enforcement** — Content generation respects brand guidelines

### Content Generation Pipelines

AI-powered content creation with brand compliance:

- **Script Generation** — Create screenplays with LLM, scored for brand alignment
- **Visual Storyboarding** — Generate visual frames with AI image generation
- **Character Casting** — Suggest characters from library based on brand guidelines
- **Voiceover Generation** — ElevenLabs integration for brand-aligned voice

### Advanced Features

- **Moodboard System** — Visual reference galleries with AI analysis
- **Character Consistency** — Track character appearances across frames
- **Music Integration** — Mood-based music suggestions (Epidemic Sound ready)
- **Real-time Collaboration** — Multiple users can work on projects simultaneously

---

## Documentation

### For Deployment

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Complete deployment guide with all setup steps
- **[ENVIRONMENT.md](./ENVIRONMENT.md)** — Environment configuration and secrets management
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** — Pre and post-deployment verification

### For Development

- **[README.md](./README.md)** — Local development setup
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System architecture and design decisions
- **[API.md](./API.md)** — API documentation and tRPC procedures

---

## Configuration

### Environment Variables

All required environment variables are documented in ENVIRONMENT.md. Key variables include:

- `DATABASE_URL` — Cloud SQL connection string
- `VITE_APP_ID` — Manus OAuth application ID
- `OPENAI_API_KEY` — LLM service key
- `ELEVENLABS_API_KEY` — Voiceover service key
- `GCS_BUCKET` — Cloud Storage bucket name

### Secrets Management

Sensitive values are stored in Google Cloud Secret Manager:

```bash
# Create secrets
gcloud secrets create db-password --data-file=-
gcloud secrets create jwt-secret --data-file=-
gcloud secrets create openai-api-key --data-file=-

# Grant service account access
gcloud secrets add-iam-policy-binding db-password \
  --member=serviceAccount:ai-film-studio-app@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## Deployment Steps

### Step 1: Google Cloud Setup (30 minutes)

Follow the detailed instructions in DEPLOYMENT.md to:

- Create Google Cloud Project
- Enable required APIs
- Create Cloud SQL instance
- Create Cloud Storage bucket
- Create service account with appropriate roles

### Step 2: Prepare Credentials (15 minutes)

Gather all required API credentials:

- Manus OAuth Application ID and Secret
- OpenAI API key
- ElevenLabs API key
- Google Cloud service account JSON key

### Step 3: Configure Secrets (10 minutes)

Store all credentials in Google Cloud Secret Manager:

```bash
./scripts/setup-secrets.sh
```

### Step 4: Deploy Application (5 minutes)

Run the automated deployment script:

```bash
./scripts/deploy-gcp.sh PROJECT_ID us-central1 production
```

### Step 5: Verify Deployment (10 minutes)

Test the deployment using the checklist in DEPLOYMENT_CHECKLIST.md:

- Health check endpoint
- OAuth callback
- Database connectivity
- File storage access

---

## Monitoring & Maintenance

### Logging

View application logs in Cloud Logging:

```bash
gcloud logging read "resource.type=cloud_run_revision" \
  --limit=50 \
  --format=json
```

### Performance Metrics

Monitor performance in Cloud Console:

- CPU and memory usage
- Request latency
- Error rates
- Database query performance

### Backups

Database backups are configured automatically:

- Daily backups with 30-day retention
- Point-in-time recovery available
- Backup testing recommended quarterly

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection fails | Check Cloud SQL instance is running, verify connection string |
| File upload fails | Verify GCS bucket permissions, check service account access |
| OAuth fails | Verify redirect URI in Manus OAuth settings |
| Out of memory | Increase Cloud Run memory allocation |
| Slow performance | Check database indexes, enable Cloud CDN |

### Debug Mode

Enable debug logging:

```bash
gcloud run services update ai-film-studio \
  --set-env-vars=DEBUG=* \
  --region=us-central1
```

View debug logs:

```bash
gcloud logging read "severity=DEBUG" --limit=100
```

---

## Rollback Procedure

If deployment fails:

```bash
# View previous revisions
gcloud run revisions list --service=ai-film-studio

# Rollback to previous revision
gcloud run services update-traffic ai-film-studio \
  --to-revisions=PREVIOUS_REVISION_ID=100 \
  --region=us-central1
```

---

## Cost Estimation

### Monthly Costs (Estimated)

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Run | 1M requests/month | $0.40 |
| Cloud SQL | db-f1-micro instance | $3.65 |
| Cloud Storage | 100GB storage | $2.00 |
| Data Transfer | 10GB/month | $1.00 |
| **Total** | | **~$7/month** |

*Costs vary based on actual usage. Use Google Cloud Pricing Calculator for accurate estimates.*

---

## Security Considerations

### Best Practices

- All secrets stored in Secret Manager (never in code)
- Service account has minimal required permissions
- Database not publicly accessible
- Cloud Storage bucket not publicly writable
- HTTPS enforced (automatic with Cloud Run)
- Regular security updates applied

### Compliance

- Audit logging enabled
- Data encryption at rest and in transit
- Regular backups for disaster recovery
- Access control via IAM roles

---

## Support & Resources

### Documentation

- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Cloud Run Deployment Guide](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Manus Documentation](https://docs.manus.im)

### Getting Help

- **Google Cloud Support**: https://cloud.google.com/support
- **Manus Support**: https://help.manus.im
- **Deployment Issues**: Review DEPLOYMENT.md troubleshooting section

---

## Next Steps

After successful deployment:

1. **Configure Custom Domain** — Set up your domain with Cloud Run
2. **Enable Monitoring** — Set up alerts and dashboards
3. **Team Access** — Grant team members appropriate IAM roles
4. **Backup Strategy** — Test disaster recovery procedures
5. **Documentation** — Update team runbooks and procedures

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 30, 2026 | Initial release with complete deployment package |

---

## License

AI Film Studio is proprietary software. All rights reserved.

---

**Ready to deploy? Start with [DEPLOYMENT.md](./DEPLOYMENT.md)**
