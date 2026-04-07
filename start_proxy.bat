@echo off
set "GOOGLE_APPLICATION_CREDENTIALS=d:\ai-film-studio\gcloud\service-account.json"
d:\ai-film-studio\cloud-sql-proxy.exe ai-film-studio-485900:us-central1:ai-film-studio-db --port 3307
