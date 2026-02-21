param(
    [string]$ProjectId = "ai-films-prod-486422"
)

Write-Host "AI Film Studio - Secret Configuration Helper" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Set project
gcloud config set project $ProjectId

Write-Host "This script will help you configure all required secrets for deployment." -ForegroundColor Yellow
Write-Host ""
Write-Host "REQUIRED SECRETS:" -ForegroundColor Cyan
Write-Host "  1. DATABASE_URL - MySQL connection string" -ForegroundColor White
Write-Host "  2. JWT_SECRET - Secret for JWT tokens" -ForegroundColor White
Write-Host "  3. REPLICATE_API_KEY - Replicate API key for image generation" -ForegroundColor White
Write-Host "  4. BUILT_IN_FORGE_API_URL - Forge API URL for storage" -ForegroundColor White
Write-Host "  5. BUILT_IN_FORGE_API_KEY - Forge API key for storage" -ForegroundColor White
Write-Host ""

# Function to create or update secret
function Set-Secret {
    param(
        [string]$SecretName,
        [string]$Description,
        [string]$Example
    )
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "Configuring: $SecretName" -ForegroundColor Cyan
    Write-Host "Description: $Description" -ForegroundColor Yellow
    Write-Host "Example: $Example" -ForegroundColor Gray
    Write-Host ""
    
    # Check if secret exists
    $exists = gcloud secrets describe $SecretName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Secret already exists. Do you want to update it? (y/n): " -ForegroundColor Yellow -NoNewline
        $update = Read-Host
        if ($update -ne 'y') {
            Write-Host "Skipping $SecretName" -ForegroundColor Gray
            return
        }
    }
    
    Write-Host "Enter value for $SecretName (or 'skip' to skip): " -ForegroundColor Green -NoNewline
    $value = Read-Host -AsSecureString
    
    # Convert SecureString to plain text
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
    $plainValue = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    if ($plainValue -eq 'skip') {
        Write-Host "Skipping $SecretName" -ForegroundColor Gray
        return
    }
    
    if ($plainValue -eq '') {
        Write-Host "Empty value, skipping $SecretName" -ForegroundColor Gray
        return
    }
    
    # Create or update secret
    if ($exists) {
        Write-Host "Updating secret..." -ForegroundColor Yellow
        echo $plainValue | gcloud secrets versions add $SecretName --data-file=-
    }
    else {
        Write-Host "Creating secret..." -ForegroundColor Yellow
        echo $plainValue | gcloud secrets create $SecretName --data-file=-
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $SecretName configured successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Failed to configure $SecretName" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Configure each secret
Set-Secret -SecretName "DATABASE_URL" `
    -Description "MySQL database connection string" `
    -Example "mysql://user:password@host:3306/database"

Set-Secret -SecretName "JWT_SECRET" `
    -Description "Secret key for JWT token signing (min 32 chars)" `
    -Example "your-super-secret-jwt-key-here-min-32-chars"

Set-Secret -SecretName "REPLICATE_API_KEY" `
    -Description "Replicate API key for AI image generation" `
    -Example "r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

Set-Secret -SecretName "BUILT_IN_FORGE_API_URL" `
    -Description "Forge API base URL for file storage" `
    -Example "https://forge-api.example.com"

Set-Secret -SecretName "BUILT_IN_FORGE_API_KEY" `
    -Description "Forge API key for authentication" `
    -Example "forge_xxxxxxxxxxxxxxxxxxxxx"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Secret Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# List all secrets
Write-Host "Configured secrets:" -ForegroundColor Cyan
gcloud secrets list --filter="name:DATABASE_URL OR name:JWT_SECRET OR name:REPLICATE_API_KEY OR name:BUILT_IN_FORGE_API_URL OR name:BUILT_IN_FORGE_API_KEY"

Write-Host ""
Write-Host "Optional secrets (you can configure these later):" -ForegroundColor Yellow
Write-Host "  - NANOBANANA_API_KEY (alternative image generation)" -ForegroundColor Gray
Write-Host "  - GOOGLE_CLIENT_ID (Google OAuth login)" -ForegroundColor Gray
Write-Host "  - GOOGLE_CLIENT_SECRET (Google OAuth login)" -ForegroundColor Gray
Write-Host "  - SORA_API_KEY (Sora video generation)" -ForegroundColor Gray
Write-Host "  - VEO3_API_KEY (Veo3 video generation)" -ForegroundColor Gray
Write-Host ""
Write-Host "Next step: Run .\gcloud\deploy-updated.ps1 to deploy!" -ForegroundColor Cyan
Write-Host ""
