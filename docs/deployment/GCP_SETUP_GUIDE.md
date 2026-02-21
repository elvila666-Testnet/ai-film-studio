# Google Cloud Platform Setup Guide for AI Film Studio

**Version:** 1.0  
**Author:** Manus AI  
**Last Updated:** January 31, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Cloud SQL Database](#cloud-sql-database)
5. [Artifact Registry](#artifact-registry)
6. [Service Accounts & IAM](#service-accounts--iam)
7. [VPC & Networking](#vpc--networking)
8. [Secret Manager](#secret-manager)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Disaster Recovery](#backup--disaster-recovery)
11. [Resource Verification Checklist](#resource-verification-checklist)

---

## Introduction

This guide walks you through setting up all required Google Cloud Platform (GCP) resources for deploying AI Film Studio to Cloud Run. The setup includes database infrastructure, container registry, security configurations, and monitoring systems. Following this guide ensures your deployment is secure, scalable, and production-ready.

### Architecture Overview

AI Film Studio on Google Cloud consists of several interconnected services. Cloud Run hosts the application container, providing automatic scaling and serverless management. Cloud SQL provides the MySQL database backend for storing projects, brands, and user data. Artifact Registry stores Docker images for deployment. Secret Manager secures sensitive credentials like API keys and database passwords. Cloud Storage handles file uploads and media assets. Monitoring and logging systems track application health and performance.

### Estimated Setup Time

Completing this entire setup typically takes 45-90 minutes depending on your familiarity with Google Cloud. Each section is designed to be completed sequentially, though some steps can be parallelized if you have multiple team members.

---

## Prerequisites

### Required Tools

Before starting, ensure you have the following tools installed on your local machine:

**Google Cloud SDK** — Download from [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install). After installation, authenticate with your Google account by running `gcloud auth login`. Verify installation with `gcloud --version`.

**Docker** — Download from [docker.com](https://www.docker.com/products/docker-desktop). Docker is required to build and test container images locally. Verify installation with `docker --version`.

**Git** — Download from [git-scm.com](https://git-scm.com/). Git is used to clone and manage your repository. Verify installation with `git --version`.

**kubectl** — Install via `gcloud components install kubectl`. This is optional but useful for advanced troubleshooting.

### GCP Account Setup

You need a Google Cloud account with billing enabled. If you don't have one, create a free account at [cloud.google.com](https://cloud.google.com). Google Cloud provides a $300 free credit for new accounts, which is sufficient for testing and initial deployment.

### Required Permissions

Your Google Cloud account must have the following roles to complete this setup:

- **Project Editor** — Full access to create and manage resources
- **Security Admin** — Ability to create service accounts and manage IAM roles
- **Cloud SQL Admin** — Permission to create and manage databases
- **Artifact Registry Admin** — Permission to create and manage repositories

If you're using an existing project with limited permissions, contact your project administrator to grant these roles.

---

## Project Setup

### Creating a New GCP Project

**Step 1: Open Google Cloud Console**

Navigate to [console.cloud.google.com](https://console.cloud.google.com) and sign in with your Google account.

**Step 2: Create New Project**

Click the project dropdown at the top of the page (showing "My First Project" or similar). Click "New Project". A dialog will appear asking for project details.

**Step 3: Enter Project Information**

Enter the following information:

- **Project Name:** "AI Film Studio Production" (or your preferred name)
- **Organization:** Select your organization if available (optional)
- **Billing Account:** Select your billing account

Click "Create". Project creation typically takes 1-2 minutes.

**Step 4: Set Default Project**

Once created, set this as your default project:

```bash
gcloud config set project ai-films-prod
```

Replace `ai-films-prod` with your actual project ID.

### Enabling Required APIs

Several Google Cloud APIs must be enabled for AI Film Studio to function properly.

**Step 1: Open APIs & Services**

In the Google Cloud Console, go to APIs & Services → Library.

**Step 2: Enable Cloud Run API**

Search for "Cloud Run API". Click the result and click "Enable". This allows you to deploy containerized applications.

**Step 3: Enable Cloud SQL Admin API**

Search for "Cloud SQL Admin API". Click "Enable". This provides database management capabilities.

**Step 4: Enable Artifact Registry API**

Search for "Artifact Registry API". Click "Enable". This allows you to store Docker images.

**Step 5: Enable Secret Manager API**

Search for "Secret Manager API". Click "Enable". This secures sensitive credentials.

**Step 6: Enable Cloud Storage API**

Search for "Cloud Storage API". Click "Enable". This provides file storage for media assets.

**Step 7: Enable Cloud Logging API**

Search for "Cloud Logging API". Click "Enable". This enables application logging.

**Step 8: Enable Cloud Monitoring API**

Search for "Cloud Monitoring API". Click "Enable". This provides performance monitoring.

Verify all APIs are enabled by going to APIs & Services → Enabled APIs. You should see all eight APIs listed.

---

## Cloud SQL Database

### Creating a Cloud SQL Instance

**Step 1: Open Cloud SQL**

In the Google Cloud Console, go to SQL → Instances.

**Step 2: Create Instance**

Click "Create Instance". You'll be asked to choose a database engine. Select "MySQL" and click "Next".

**Step 3: Configure Instance**

Fill in the following information:

**Instance ID:** `ai-film-studio-db` (this becomes part of your connection string)

**Password:** Generate a strong password for the root user. Store this securely—you'll need it later.

**Database Version:** Select "MySQL 8.0" (latest stable version)

**Region:** Select "us-central1" (or your preferred region)

**Zonal Availability:** Select "Multiple zones (Highly available)" for production reliability

**Machine Type:** Select "db-f1-micro" for development/testing or "db-n1-standard-1" for production

**Storage Type:** Select "SSD" for better performance

**Storage Capacity:** Start with 10 GB (can be increased later)

**Step 4: Configure Connectivity**

Under "Connectivity", select "Private IP" for security. You'll configure VPC connectivity later. For initial testing, you can select "Public IP" and add your IP address to the authorized networks.

**Step 5: Create Instance**

Click "Create Instance". Instance creation typically takes 5-10 minutes. You'll see a progress indicator.

### Creating the Application Database

**Step 1: Connect to Cloud SQL**

Once the instance is created, click on the instance name to open its details page.

**Step 2: Open Cloud Shell**

Click the "Cloud Shell" icon in the top toolbar. This opens a terminal connected to your GCP project.

**Step 3: Connect to Database**

Run the following command to connect to your Cloud SQL instance:

```bash
gcloud sql connect ai-film-studio-db --user=root
```

You'll be prompted for the root password you created earlier.

**Step 4: Create Application Database**

Once connected, create the application database:

```sql
CREATE DATABASE ai_film_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Step 5: Create Application User**

Create a dedicated user for the application (don't use root for applications):

```sql
CREATE USER 'ai_film_studio'@'%' IDENTIFIED BY 'strong-password-here';
GRANT ALL PRIVILEGES ON ai_film_studio.* TO 'ai_film_studio'@'%';
FLUSH PRIVILEGES;
```

Replace `'strong-password-here'` with a secure password. Store this password securely.

**Step 6: Verify Database**

Verify the database was created:

```sql
SHOW DATABASES;
```

You should see `ai_film_studio` in the list. Type `exit` to close the connection.

### Configuring Database Connection

**Step 1: Get Connection String**

In the Cloud SQL instance details page, find the "Public IP address" or "Private IP address" depending on your connectivity setup.

**Step 2: Format Connection String**

Your database connection string should follow this format:

```
mysql://ai_film_studio:password@IP_ADDRESS:3306/ai_film_studio
```

Replace `password` with the password you created for the `ai_film_studio` user, and `IP_ADDRESS` with your Cloud SQL instance's IP address.

**Step 3: Store Connection String**

You'll use this connection string when configuring environment variables later. Store it securely.

---

## Artifact Registry

### Creating an Artifact Registry Repository

**Step 1: Open Artifact Registry**

In the Google Cloud Console, go to Artifact Registry → Repositories.

**Step 2: Create Repository**

Click "Create Repository". A form will appear.

**Step 3: Configure Repository**

Fill in the following information:

**Repository Name:** `ai-film-studio`

**Repository Format:** Select "Docker"

**Location Type:** Select "Region"

**Region:** Select "us-central1" (match your Cloud Run region)

**Description:** "Docker image repository for AI Film Studio application"

**Step 4: Create Repository**

Click "Create". Repository creation is immediate.

### Configuring Docker Authentication

**Step 1: Configure Docker Authentication**

Run the following command to configure Docker to authenticate with Artifact Registry:

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

This adds credentials to your Docker configuration file.

**Step 2: Verify Configuration**

Verify the configuration by checking your Docker config:

```bash
cat ~/.docker/config.json
```

You should see an entry for `us-central1-docker.pkg.dev`.

### Building and Pushing Docker Images

**Step 1: Build Docker Image**

Navigate to your AI Film Studio project directory and build the Docker image:

```bash
docker build -t us-central1-docker.pkg.dev/ai-films-prod/ai-film-studio/app:latest .
```

Replace `ai-films-prod` with your actual project ID.

**Step 2: Push to Artifact Registry**

Push the image to your Artifact Registry repository:

```bash
docker push us-central1-docker.pkg.dev/ai-films-prod/ai-film-studio/app:latest
```

This uploads the image to your repository. First push typically takes 2-5 minutes.

**Step 3: Verify Image**

Verify the image was pushed successfully:

```bash
gcloud artifacts docker images list us-central1-docker.pkg.dev/ai-films-prod/ai-film-studio
```

You should see your image listed.

---

## Service Accounts & IAM

### Creating a Service Account

**Step 1: Open Service Accounts**

In the Google Cloud Console, go to IAM & Admin → Service Accounts.

**Step 2: Create Service Account**

Click "Create Service Account". A form will appear.

**Step 3: Configure Service Account**

Fill in the following information:

**Service Account Name:** `ai-film-studio-app`

**Service Account ID:** This is auto-generated based on the name

**Description:** "Service account for AI Film Studio Cloud Run application"

Click "Create and Continue".

**Step 4: Grant Roles**

Grant the following roles to the service account:

- **Cloud SQL Client** — Allows connection to Cloud SQL database
- **Artifact Registry Reader** — Allows pulling Docker images
- **Secret Manager Secret Accessor** — Allows reading secrets
- **Cloud Storage Object Viewer** — Allows reading files from Cloud Storage
- **Cloud Logging Log Writer** — Allows writing logs
- **Cloud Monitoring Metric Writer** — Allows writing metrics

Select each role and click "Continue" after each one. After adding all roles, click "Done".

### Creating Service Account Keys

**Step 1: Open Service Account**

In Service Accounts, click on the `ai-film-studio-app` service account to open its details.

**Step 2: Create Key**

Click the "Keys" tab. Click "Add Key" → "Create new key".

**Step 3: Select Key Type**

Select "JSON" as the key type. Click "Create". A JSON file will be downloaded to your computer.

**Step 4: Store Key Securely**

Store this key file securely. This key provides access to your GCP resources. Never commit it to version control or share it publicly.

### Configuring IAM Permissions

**Step 1: Open IAM**

In the Google Cloud Console, go to IAM & Admin → IAM.

**Step 2: Verify Service Account Roles**

Find your `ai-film-studio-app` service account in the list. Verify it has all the required roles listed above.

**Step 3: Grant Additional Permissions (if needed)**

If you need to grant additional permissions, click "Edit Principal" next to the service account and add roles as needed.

---

## VPC & Networking

### Creating a VPC Network

**Step 1: Open VPC Networks**

In the Google Cloud Console, go to VPC Network → VPCs.

**Step 2: Create VPC**

Click "Create VPC Network". A form will appear.

**Step 3: Configure VPC**

Fill in the following information:

**Name:** `ai-film-studio-vpc`

**Description:** "VPC for AI Film Studio infrastructure"

**Subnet Creation Mode:** Select "Custom"

**Step 4: Create Subnet**

Click "Add Subnet". Configure the subnet:

**Name:** `ai-film-studio-subnet`

**Region:** `us-central1`

**IPv4 CIDR Range:** `10.0.0.0/24`

Click "Add" to add the subnet.

**Step 5: Create VPC**

Click "Create" to create the VPC network.

### Configuring Cloud SQL for Private IP

**Step 1: Open Cloud SQL Instance**

Go to SQL → Instances and click on your `ai-film-studio-db` instance.

**Step 2: Edit Connectivity**

Click "Edit" in the instance details. Scroll to the "Connectivity" section.

**Step 3: Add Private IP**

Under "Private IP", click "Add Network". Select the `ai-film-studio-vpc` you created. Click "Set Up Connection".

This creates a private service connection between Cloud SQL and your VPC.

**Step 4: Save Changes**

Click "Save" to apply the changes. This typically takes 5-10 minutes.

### Configuring Cloud Run for VPC

**Step 1: Open Cloud Run**

Go to Cloud Run → Services.

**Step 2: Deploy Service (or Edit Existing)**

When deploying or editing a Cloud Run service, scroll to "Networking" section.

**Step 3: Configure VPC Connector**

Under "VPC Connector", select "Use a VPC connector". If no connector exists, create one:

- Click "Create VPC Connector"
- Name: `ai-film-studio-connector`
- Region: `us-central1`
- Network: `ai-film-studio-vpc`
- Subnet: `ai-film-studio-subnet`
- Machine type: `f1-micro`

Click "Create".

**Step 4: Save Configuration**

Once the VPC connector is created, select it in the "VPC Connector" dropdown. This ensures your Cloud Run service can communicate with Cloud SQL over the private network.

---

## Secret Manager

### Creating Secrets

**Step 1: Open Secret Manager**

In the Google Cloud Console, go to Security → Secret Manager.

**Step 2: Create Database Password Secret**

Click "Create Secret". Configure:

**Name:** `ai-film-studio-db-password`

**Secret Value:** The password you created for the `ai_film_studio` database user

Click "Create Secret".

**Step 3: Create API Keys Secrets**

Repeat the process for each API key your application needs:

- `ai-film-studio-openai-key` — Your OpenAI API key
- `ai-film-studio-elevenlabs-key` — Your ElevenLabs API key
- `ai-film-studio-jwt-secret` — A random string for JWT signing
- `ai-film-studio-oauth-secret` — Your OAuth client secret

For each secret, click "Create Secret", enter the name and value, and click "Create Secret".

### Granting Service Account Access

**Step 1: Open Secret Manager**

Go to Security → Secret Manager.

**Step 2: Grant Access to Secret**

For each secret, click on the secret name to open its details. Click the "Permissions" tab.

**Step 3: Add Service Account**

Click "Grant Access". In the dialog:

**New Principals:** Enter `ai-film-studio-app@ai-films-prod.iam.gserviceaccount.com` (replace `ai-films-prod` with your project ID)

**Role:** Select "Secret Manager Secret Accessor"

Click "Save".

Repeat this for all secrets you created.

### Referencing Secrets in Cloud Run

When deploying to Cloud Run, you can reference secrets as environment variables. In your deployment configuration, reference secrets like this:

```yaml
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: ai-film-studio-db-password
        key: latest
```

---

## Monitoring & Logging

### Setting Up Cloud Logging

**Step 1: Open Cloud Logging**

In the Google Cloud Console, go to Logging → Logs Explorer.

**Step 2: Create Log Sink**

Click "Create Sink". Configure:

**Sink Name:** `ai-film-studio-logs`

**Sink Service:** Select "Cloud Storage" or "BigQuery" (Cloud Storage is simpler for starting)

**Destination:** Create a new Cloud Storage bucket named `ai-film-studio-logs`

Click "Create Sink".

### Setting Up Cloud Monitoring

**Step 1: Open Cloud Monitoring**

In the Google Cloud Console, go to Monitoring → Dashboards.

**Step 2: Create Dashboard**

Click "Create Dashboard". Give it a name: "AI Film Studio Production"

**Step 3: Add Metrics**

Click "Add Widget" to add monitoring widgets:

**Cloud Run Metrics:**
- Request Count
- Request Latencies
- Error Rate
- CPU Utilization

**Cloud SQL Metrics:**
- Database CPU Utilization
- Database Memory Utilization
- Connections

**Step 4: Configure Alerts**

Go to Monitoring → Alerting Policies. Click "Create Policy".

Configure alerts for:

- High error rate (>5% of requests)
- High latency (>2 seconds)
- Cloud SQL CPU >80%
- Cloud SQL connections >80 of max


---

## Backup & Disaster Recovery

### Configuring Cloud SQL Backups

**Step 1: Open Cloud SQL Instance**

Go to SQL → Instances and click on your `ai-film-studio-db` instance.

**Step 2: Configure Backups**

Click "Edit" in the instance details. Scroll to "Backup and Recovery".

**Step 3: Set Backup Schedule**

Configure the following:

**Backup Location:** Select your region (us-central1)

**Automated Backups:** Enable "Automated backups"

**Backup Window:** Set a time when your application has low traffic (e.g., 2:00 AM UTC)

**Backup Retention:** Set to "30 days" for production

**Transaction Log Retention:** Enable for point-in-time recovery

**Step 4: Save Configuration**

Click "Save" to apply backup settings.

### Creating Manual Backups

**Step 1: Open Cloud SQL Instance**

Go to SQL → Instances and click on your instance.

**Step 2: Create Backup**

Click "Backups" tab. Click "Create Backup".

**Step 3: Name Backup**

Give your backup a descriptive name: `ai-film-studio-backup-2026-01-31`

Click "Create".

### Testing Disaster Recovery

Periodically test your disaster recovery process:

**Step 1: Create a Test Instance**

Create a new Cloud SQL instance for testing.

**Step 2: Restore from Backup**

Restore your backup to the test instance to verify backups work correctly.

**Step 3: Verify Data**

Connect to the restored instance and verify data integrity.

**Step 4: Document Process**

Document the time required to restore and any issues encountered.

---

## Resource Verification Checklist

Before deploying to Cloud Run, verify all resources are properly configured:

### Cloud SQL Verification

- [ ] Cloud SQL instance created and running
- [ ] Database `ai_film_studio` created
- [ ] Application user `ai_film_studio` created with appropriate permissions
- [ ] Private IP configured and VPC connection established
- [ ] Automated backups enabled with 30-day retention
- [ ] Connection string documented and stored securely

### Artifact Registry Verification

- [ ] Artifact Registry repository `ai-film-studio` created
- [ ] Docker authentication configured locally
- [ ] Docker image successfully built and pushed to repository
- [ ] Image is accessible and can be pulled

### Service Account Verification

- [ ] Service account `ai-film-studio-app` created
- [ ] All required roles granted (Cloud SQL Client, Artifact Registry Reader, Secret Manager Secret Accessor, etc.)
- [ ] Service account key created and stored securely
- [ ] Service account has appropriate permissions in IAM

### VPC & Networking Verification

- [ ] VPC `ai-film-studio-vpc` created
- [ ] Subnet `ai-film-studio-subnet` created with correct CIDR range
- [ ] Cloud SQL configured with private IP in the VPC
- [ ] VPC connector created for Cloud Run connectivity

### Secret Manager Verification

- [ ] All required secrets created (database password, API keys, etc.)
- [ ] Service account has Secret Manager Secret Accessor role
- [ ] Secrets are properly referenced in deployment configuration

### Monitoring & Logging Verification

- [ ] Cloud Logging sink configured to capture application logs
- [ ] Cloud Monitoring dashboard created with key metrics
- [ ] Alert policies configured for critical thresholds

### Backup & Disaster Recovery Verification

- [ ] Automated backups enabled on Cloud SQL
- [ ] Manual backup created and tested
- [ ] Disaster recovery procedure documented
- [ ] Team members trained on recovery process

---

## Troubleshooting Common Issues

### Issue: Cannot Connect to Cloud SQL from Cloud Run

**Solution:** Verify VPC connector is properly configured and Cloud SQL has private IP enabled. Check security group rules allow traffic from Cloud Run to Cloud SQL.

### Issue: Docker Image Push Fails

**Solution:** Verify Docker authentication is configured with `gcloud auth configure-docker`. Ensure Artifact Registry API is enabled. Check that the image tag matches the repository path.

### Issue: Service Account Lacks Permissions

**Solution:** Verify all required roles are granted to the service account. Go to IAM & Admin → IAM and check the service account has all necessary roles listed.

### Issue: Secrets Not Accessible to Cloud Run

**Solution:** Verify the service account has "Secret Manager Secret Accessor" role. Ensure the secret name is correct in the deployment configuration.

### Issue: High Database Connection Errors

**Solution:** Increase the Cloud SQL instance machine type to handle more connections. Check application code for connection leaks. Monitor connection count in Cloud Monitoring.

---

## Next Steps

After completing this setup:

1. **Configure Environment Variables** — Update `.env.production` with your database connection string, API keys, and other configuration values.

2. **Run Database Migrations** — Execute Drizzle migrations to create application tables: `pnpm db:push`

3. **Deploy to Cloud Run** — Execute the deployment script: `./scripts/deploy-gcp.sh ai-films-prod us-central1 production`

4. **Configure Custom Domain** — Set up your custom domain with Cloud Run DNS mapping for production access.

5. **Set Up CI/CD** — Configure GitHub Actions to automatically deploy on code pushes.

---

## Support & Resources

For additional help:

- **Google Cloud Documentation:** [cloud.google.com/docs](https://cloud.google.com/docs)
- **Cloud SQL Documentation:** [cloud.google.com/sql/docs](https://cloud.google.com/sql/docs)
- **Cloud Run Documentation:** [cloud.google.com/run/docs](https://cloud.google.com/run/docs)
- **Artifact Registry Documentation:** [cloud.google.com/artifact-registry/docs](https://cloud.google.com/artifact-registry/docs)
- **Secret Manager Documentation:** [cloud.google.com/secret-manager/docs](https://cloud.google.com/secret-manager/docs)

---

**End of GCP Setup Guide**

**Version:** 1.0  
**Last Updated:** January 31, 2026  
**Next Review:** April 31, 2026

For feedback or corrections, please contact support@manus.im
