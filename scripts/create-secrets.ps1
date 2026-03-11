$sa = "553654730386-compute@developer.gserviceaccount.com"
$secrets = @{
    "DATABASE_URL"         = "placeholder"
    "GEMINI_API_KEY"       = "placeholder"
    "NANOBANANA_API_KEY"   = "placeholder"
    "SORA_API_KEY"         = "placeholder"
    "VEO3_API_KEY"         = "placeholder"
    "GOOGLE_CLIENT_ID"     = "placeholder"
    "GOOGLE_CLIENT_SECRET" = "placeholder"
    "JWT_SECRET"           = "placeholder"
}

foreach ($key in $secrets.Keys) {
    $val = $secrets[$key]
    Write-Host "Creating secret $key..."
    gcloud secrets create $key --replication-policy="automatic"
    Write-Output $val | gcloud secrets versions add $key --data-file=-
    gcloud secrets add-iam-policy-binding $key --member="serviceAccount:$sa" --role="roles/secretmanager.secretAccessor"
}
