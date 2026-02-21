$ErrorActionPreference = "Stop"
$base = "https://ai-film-studio-e55c75l7ja-uc.a.run.app" 
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Post-Trpc {
    param($path, $payload)
    $json = $payload | ConvertTo-Json -Compress -Depth 10
    $body = '{"0":' + $json + '}'
    try {
        $uri = "$base/api/trpc/$($path)?batch=1"
        Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json" -WebSession $s
    }
    catch {
        Write-Host "Error calling $path" -ForegroundColor Red
        throw $_
    }
}

Write-Host "1. Logging in..."
Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body (@{email = "admin@filmstudio.ai"; password = "admin123" } | ConvertTo-Json) -ContentType "application/json" -WebSession $s

Write-Host "2. Creating Project..."
$p = Post-Trpc "projects.create" @{ name = "Debug Tech Script " + (Get-Date).ToString("mm-ss") }
$pidVal = $p[0].result.data.id

Write-Host "3. Seeding Content..."
$script = "INT. LAB - DAY. A scientist looks at a glowing vial."
$visual = "Cinematic, blue lighting, high contrast."
Post-Trpc "projects.updateContent" @{ projectId = $pidVal; script = $script; masterVisual = $visual } | Out-Null

Write-Host "4. Testing Technical Shots..."
try {
    $res = Post-Trpc "ai.generateTechnicalShots" @{ projectId = $pidVal; script = $script; visualStyle = $visual }
    $raw = $res[0].result.data
    $raw | Out-File -Encoding UTF8 "c:\ai_film_studio\tech_shots_response.txt"
    Write-Host "Saved tech_shots_response.txt"
} catch {
    Write-Host "Failed to generate shots: $_" -ForegroundColor Red
}

Write-Host "5. Testing Brand Archetypes..."
try {
    $b = Post-Trpc "brands.create" @{ name = "Debug Brand"; mission = "To test APIs" }
    $bid = $b[0].result.data.brandId
    
    $res2 = Post-Trpc "brands.generateArchetypes" @{ brandId = $bid; count = 1 }
    $archetypes = $res2[0].result.data.archetypes
    $archetypes | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8 "c:\ai_film_studio\archetypes_response.txt"
    Write-Host "Saved archetypes_response.txt"
} catch {
    Write-Host "Failed to generate archetypes: $_" -ForegroundColor Red
}
