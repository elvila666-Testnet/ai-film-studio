gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio AND severity>=ERROR' --limit=1000 --format=json > db_errors.json
