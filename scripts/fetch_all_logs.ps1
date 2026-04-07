gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" --limit=200 --format=json | Out-File -FilePath all_recent_logs.json -Encoding utf8
