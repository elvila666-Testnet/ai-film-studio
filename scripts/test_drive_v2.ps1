$ErrorActionPreference = "Stop"
$base = "https://ai-film-studio-1021191579798.us-central1.run.app"
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Post-Trpc {
    param($path, $payload)
    Write-Host "   DEBUG: Calling TRPC Path: $path"
    $json = $payload | ConvertTo-Json -Compress -Depth 10
    # Wrap in TRPC batch format if not already
    if ($json -notlike '{"0":*') { $json = '{"0":' + $json + '}' }
    
    try {
        $uri = "$base/api/trpc/$($path)?batch=1"
        Write-Host "   DEBUG: URI: $uri"
        Invoke-RestMethod -Uri $uri -Method Post -Body $json -ContentType "application/json" -WebSession $s
    }
    catch {
        Write-Host "   [ERROR] $path Failed: $_" -ForegroundColor Red
        if ($_.Response) {
            $reader = New-Object System.IO.StreamReader $_.Response.GetResponseStream()
            Write-Host "   Response Body: $($reader.ReadToEnd())" -ForegroundColor Yellow
        }
        throw $_
    }
}

function Get-Trpc {
    param($path, $inputObj)
    Write-Host "   DEBUG: Calling TRPC Path: $path"
    $json = $inputObj | ConvertTo-Json -Compress -Depth 10
    # Wrap in TRPC batch format
    $batchJson = '{"0":' + $json + '}'
    $enc = [uri]::EscapeDataString($batchJson)
    Invoke-RestMethod -Uri "$base/api/trpc/$path?batch=1&input=$enc" -Method Get -WebSession $s
}

Write-Host "1. Logging in..."
try {
    $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body (@{email = "admin@filmstudio.ai"; password = "admin123" } | ConvertTo-Json) -ContentType "application/json" -WebSession $s
    Write-Host "   Success: $($login.user.email)"
}
catch { Write-Error "Login Failed: $_"; exit }

Write-Host "`n2. Creating Project..."
$createRes = Post-Trpc "projects.create" @{ name = "Test Drive " + (Get-Date).ToString("HH:mm:ss") }
$pidVal = if ($createRes -is [array]) { $createRes[0].result.data.id } else { $createRes.result.data.id }
Write-Host "   Project ID: $pidVal"

Write-Host "`n3. Updating Brief..."
$briefText = "A detective story in a cyber-noir city."
Post-Trpc "projects.updateContent" @{ projectId = $pidVal; brief = $briefText } | Out-Null
Write-Host "   Update Sent."

Write-Host "`n4. Verifying Brief..."
$getRes = Get-Trpc "projects.get" @{ id = $pidVal }
$savedBrief = if ($getRes -is [array]) { $getRes[0].result.data.content.brief } else { $getRes.result.data.content.brief }

if ($savedBrief -eq $briefText) { Write-Host "   [PASS] Brief Persisted: $savedBrief" -ForegroundColor Green }
else { Write-Host "   [FAIL] Brief Mismatch. Got: '$savedBrief'" -ForegroundColor Red }

Write-Host "`n5. Generating Script..."
try {
    $genRes = Post-Trpc "ai.generateScript" @{ brief = $briefText; projectId = $pidVal }
    $script = if ($genRes -is [array]) { $genRes[0].result.data.script } else { $genRes.result.data.script }
    
    if ($script.Length -gt 10) { Write-Host "   [PASS] Script Generated ($($script.Length) chars)." -ForegroundColor Green }
    else { Write-Host "   [FAIL] Script empty." -ForegroundColor Red }
}
catch {
    Write-Host "   [FAIL] Generation Error: $_" -ForegroundColor Red
}

Write-Host "`n6. Verifying Script Persistence..."
$getRes2 = Get-Trpc "projects.get" @{ id = $pidVal }
$savedScript = if ($getRes2 -is [array]) { $getRes2[0].result.data.content.script } else { $getRes2.result.data.content.script }

if ($savedScript.Length -gt 10) { Write-Host "   [PASS] Script Persisted." -ForegroundColor Green }
else { Write-Host "   [FAIL] Script Not Persisted." -ForegroundColor Red }
