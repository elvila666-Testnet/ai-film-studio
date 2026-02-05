# Deployment Checklist - AI Film Studio

## Pre-Deployment

- [ ] All code committed to Git
- [ ] Environment variables documented
- [ ] API keys obtained and verified
- [ ] Database schema reviewed
- [ ] Tests passing locally (`pnpm test`)
- [ ] Build successful locally (`pnpm build`)
- [ ] No TypeScript errors (`pnpm check`)

## Google Cloud Setup

- [ ] Google Cloud account created
- [ ] Project created (`ai-film-studio`)
- [ ] Billing enabled
- [ ] gcloud CLI installed and configured
- [ ] Docker installed
- [ ] Required APIs enabled:
  - [ ] Cloud Run API
  - [ ] Cloud SQL Admin API
  - [ ] Cloud Storage API
  - [ ] Cloud Build API
  - [ ] Cloud Logging API
  - [ ] Cloud Monitoring API

## Database Setup

- [ ] Cloud SQL instance created (`ai-film-studio-db`)
- [ ] Database created (`ai_film_studio`)
- [ ] Database user created (`filmstudio`)
- [ ] Database password set and saved securely
- [ ] Cloud SQL Proxy configured (if needed)
- [ ] Database migrations run (`pnpm db:push`)
- [ ] Initial data loaded (if applicable)

## Storage Setup

- [ ] Cloud Storage bucket created (`ai-film-studio-media`)
- [ ] Bucket permissions configured
- [ ] CORS settings configured
- [ ] Lifecycle policies set (optional)

## Secrets Management

- [ ] Secrets created in Secret Manager:
  - [ ] DATABASE_URL
  - [ ] GEMINI_API_KEY
  - [ ] NANOBANANA_API_KEY
  - [ ] SORA_API_KEY
  - [ ] VEO3_API_KEY
  - [ ] OPENAI_API_KEY
  - [ ] JWT_SECRET
  - [ ] VITE_APP_ID
  - [ ] OAUTH_SERVER_URL
  - [ ] VITE_OAUTH_PORTAL_URL

## Service Account Setup

- [ ] Service account created (`ai-film-studio-sa`)
- [ ] IAM roles assigned:
  - [ ] Cloud SQL Client
  - [ ] Storage Admin
  - [ ] Cloud Run Invoker
  - [ ] Secret Manager Secret Accessor

## Docker Configuration

- [ ] Dockerfile created and tested
- [ ] .dockerignore configured
- [ ] Docker image builds successfully
- [ ] Image size optimized
- [ ] Health check configured

## Cloud Build Configuration

- [ ] cloudbuild.yaml created
- [ ] Build steps configured
- [ ] Build triggers set up
- [ ] Build notifications configured

## Deployment

- [ ] Cloud Run service created
- [ ] Service configured with:
  - [ ] 2 CPU, 2GB RAM
  - [ ] 3600s timeout
  - [ ] Cloud SQL connection
  - [ ] Environment variables
  - [ ] Service account
  - [ ] Unauthenticated access (if public)

- [ ] Initial deployment successful
- [ ] Service URL accessible
- [ ] Health checks passing

## Post-Deployment Testing

- [ ] Application loads successfully
- [ ] User authentication works
- [ ] Database queries work
- [ ] File uploads to storage work
- [ ] AI API calls work:
  - [ ] Gemini API
  - [ ] Nanobanana API
  - [ ] Sora API (if applicable)
  - [ ] Veo3 API (if applicable)
- [ ] Video export works
- [ ] Error handling works

## Monitoring Setup

- [ ] Cloud Logging configured
- [ ] Error reporting enabled
- [ ] Performance monitoring enabled
- [ ] Alerts configured for:
  - [ ] High error rate (>5%)
  - [ ] High latency (>5s)
  - [ ] Service down
  - [ ] Database connection errors

## Domain & SSL

- [ ] Custom domain configured (if applicable)
- [ ] DNS records updated
- [ ] SSL certificate provisioned
- [ ] Domain verified

## Backup & Recovery

- [ ] Database backups configured
- [ ] Backup retention set to 30 days
- [ ] Backup testing completed
- [ ] Recovery procedure documented

## Documentation

- [ ] README updated with deployment info
- [ ] Runbook created for common tasks
- [ ] Troubleshooting guide updated
- [ ] API documentation current
- [ ] Team trained on deployment process

## Security

- [ ] All secrets rotated
- [ ] API keys have appropriate permissions
- [ ] Database user has minimal required permissions
- [ ] Cloud Storage bucket not publicly writable
- [ ] Cloud Run service authenticated (if needed)
- [ ] VPC connector configured (if needed)
- [ ] DDoS protection enabled (optional)

## Performance Optimization

- [ ] Database indexes created
- [ ] Query performance reviewed
- [ ] Caching configured (if applicable)
- [ ] CDN configured (if applicable)
- [ ] Image optimization enabled

## Cost Optimization

- [ ] Cloud Run auto-scaling configured
- [ ] Database tier appropriate for load
- [ ] Storage lifecycle policies set
- [ ] Unused resources removed
- [ ] Cost alerts configured

## Final Checks

- [ ] All checklist items completed
- [ ] Stakeholders notified
- [ ] Deployment documented
- [ ] Rollback plan ready
- [ ] Team on-call for issues

## Post-Launch

- [ ] Monitor for 24 hours
- [ ] Check error logs daily
- [ ] Performance metrics reviewed
- [ ] User feedback collected
- [ ] Issues tracked and prioritized

---

## Quick Deployment Command

```bash
# Run automated deployment script
./deploy.sh ai-film-studio us-central1
```

## Rollback Procedure

If issues occur:

```bash
# Rollback to previous Cloud Run revision
gcloud run services update-traffic ai-film-studio \
  --to-revisions PREVIOUS_REVISION_ID=100 \
  --region us-central1
```

## Emergency Contacts

- **Platform Support**: [Google Cloud Support](https://cloud.google.com/support)
- **Database Issues**: Cloud SQL Support
- **API Issues**: Contact respective API providers

---

**Last Updated**: January 29, 2026
**Deployment Date**: _______________
**Deployed By**: _______________
**Status**: _______________
