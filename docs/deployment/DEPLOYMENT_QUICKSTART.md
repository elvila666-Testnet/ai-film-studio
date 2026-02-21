# AI Film Studio - Deployment Quick Start

**TL;DR** - Deploy in 5 minutes using automated scripts.

## Prerequisites

- Node.js 22.13.0+
- pnpm or npm
- Database credentials
- SSH access to deployment server (production only)

## Quick Deploy

### Staging

```bash
# 1. Configure environment
cp .env.example .env.staging
# Edit .env.staging with staging credentials

# 2. Deploy
./scripts/deploy.sh staging

# 3. Verify
./scripts/health-check.sh
```

### Production

```bash
# 1. Configure environment
cp .env.example .env.production
# Edit .env.production with production credentials

# 2. Deploy (with dry-run first)
./scripts/deploy.sh production --dry-run

# 3. Deploy for real
./scripts/deploy.sh production

# 4. Monitor
./scripts/health-check.sh --continuous
```

## What Gets Deployed

✅ Dependencies installed  
✅ Tests run  
✅ TypeScript checked  
✅ Database migrated  
✅ Application built  
✅ Health verified  

## If Something Goes Wrong

### Rollback

```bash
# List versions
ls -1 .deployment-versions/

# Rollback to specific version
./scripts/rollback.sh <version>

# Force rollback (skip confirmation)
./scripts/rollback.sh <version> --force
```

### Debug

```bash
# Check logs
tail -f logs/deployment-*.log

# Run health checks
./scripts/health-check.sh --verbose

# Check specific issue
# Database: ./scripts/db-migrate.sh validate
# Build: npm run build
# Tests: npm test
```

## Environment Variables Required

```env
DATABASE_URL=mysql://user:pass@host/db
JWT_SECRET=your-secret
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
```

## Deployment Checklist

- [ ] Environment file created
- [ ] All tests passing locally
- [ ] Database backup created
- [ ] Team notified
- [ ] Deployment script executed
- [ ] Health checks passed
- [ ] Functionality verified

## Support

- **Logs**: `logs/deployment-*.log`
- **Health**: `./scripts/health-check.sh --verbose`
- **Docs**: See `DEPLOYMENT.md` for detailed guide

---

**Deployment Time**: ~5-10 minutes  
**Rollback Time**: ~2-3 minutes  
**Downtime**: ~30 seconds (during restart)
