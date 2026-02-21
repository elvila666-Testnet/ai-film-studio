$base = "https://ai-film-studio-1021191579798.us-central1.run.app"
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Login
Write-Host "1. Logging in..."
try {
    $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body (@{email = "admin@filmstudio.ai"; password = "admin123" } | ConvertTo-Json) -ContentType "application/json" -WebSession $s
    Write-Host "   Success: $($login.user.email)"
}
catch { Write-Error "Login Failed: $_"; exit }

# 2. Create Project
Write-Host "`n2. Creating Project..."
$createBody = '{"0":{"name":"API Test Drive ' + (Get-Date).ToString("mm-ss") + '"}}'
$create = Invoke-RestMethod -Uri "$base/api/trpc/projects.create?batch=1" -Method Post -Body $createBody -ContentType "application/json" -WebSession $s

Write-Host "Create Response: $($create | ConvertTo-Json -Depth 5)"

if ($create -is [array]) { $projectId = $create[0].result.data.id }
else { $projectId = $create.result.data.id }

if (!$projectId) { Write-Error "Failed to create project."; exit }
Write-Host "   Project ID: $projectId"

# 3. Update Brief
Write-Host "`n3. Updating Brief..."
$briefText = "A detective story in a rainy city."
$updBody = '{"0":{"projectId":' + $projectId + ',"brief":"' + $briefText + '"}}'
Invoke-RestMethod -Uri "$base/api/trpc/projects.updateContent?batch=1" -Method Post -Body $updBody -ContentType "application/json" -WebSession $s | Out-Null
Write-Host "   Update Sent."

# 4. Verify Brief Persistence
Write-Host "`n4. Verifying Brief..."
$getInput = [uri]::EscapeDataString('{"0":{"id":' + $projectId + '}}')
$proj = Invoke-RestMethod -Uri "$base/api/trpc/projects.get?batch=1&input=' + $getInput + '" -Method Get -WebSession $s

if ($proj -is [array]) { $brief = $proj[0].result.data.content.brief }
else { $brief = $proj.result.data.content.brief }

if ($brief -eq $briefText) { Write-Host "   [PASS] Brief Persisted: '$brief'" -ForegroundColor Green }
else { Write-Host "   [FAIL] Brief Mismatch. Got: '$brief'" -ForegroundColor Red }

# 5. Generate Script
Write-Host "`n5. Generating Script..."
$genBody = '{"0":{"brief":"' + $briefText + '","projectId":' + $projectId + '}}'
try {
    $gen = Invoke-RestMethod -Uri "$base/api/trpc/ai.generateScript?batch=1" -Method Post -Body $genBody -ContentType "application/json" -WebSession $s
    if ($gen -is [array]) { $script = $gen[0].result.data.script }
    else { $script = $gen.result.data.script }
    
    if ($script.Length -gt 10) { Write-Host "   [PASS] Script Generated ($($script.Length) chars)." -ForegroundColor Green }
    else { Write-Host "   [FAIL] Script empty." -ForegroundColor Red }
}
catch {
    Write-Host "   [FAIL] Generation Failed: $_" -ForegroundColor Red
}

# 6. Verify Script Persistence
Write-Host "`n6. Verifying Script Persistence..."
$proj2 = Invoke-RestMethod -Uri "$base/api/trpc/projects.get?batch=1&input=$getInput" -Method Get -WebSession $s
if ($proj2 -is [array]) { $savedScript = $proj2[0].result.data.content.script }
else { $savedScript = $proj2.result.data.content.script }

if ($savedScript.Length -gt 10) { Write-Host "   [PASS] Script Persisted." -ForegroundColor Green }
else { Write-Host "   [FAIL] Script Not Persisted." -ForegroundColor Red }
