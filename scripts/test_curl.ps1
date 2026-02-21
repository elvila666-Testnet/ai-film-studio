$ErrorActionPreference = "Stop"
$base = "https://ai-film-studio-1021191579798.us-central1.run.app"
$cookieFile = "$PWD\cookies.txt"
if (Test-Path $cookieFile) { Remove-Item $cookieFile }

function Exec-Curl {
    param($argsList)
    # Use direct invocation with splatting/array
    # Note: PowerShell escaping for external exes can be tricky.
    # We rely on array of arguments.
    $res = & curl.exe $argsList
    if ($LASTEXITCODE -ne 0) { throw "Curl failed with code $LASTEXITCODE" }
    return $res
}

Write-Host "1. Logging in..."
$loginJson = '{"email":"admin@filmstudio.ai","password":"admin123"}'
$loginJson | Set-Content "login.json"
# Quote the header value manually? No, PowerShell handles it if passed as single string in array.
$argsLogin = @("-s", "-c", $cookieFile, "-H", "Content-Type: application/json", "-d", "@login.json", "$base/api/auth/login")
$loginRes = Exec-Curl $argsLogin
Write-Host "   Login Response: $loginRes"

Write-Host "`n2. Creating Project..."
$createJson = '{"0":{"name":"Curl Test Drive ' + (Get-Date).ToString("mm-ss") + '"}}'
# Escape quotes for cmd line? curl handles it if passed as single args usually?
# PowerShell passing vars to start-process argumentlist is tricky with quotes.
# We'll write body to file to be safe.
$createJson | Set-Content "create.json"
$argsCreate = @("-s", "-b", $cookieFile, "-H", "Content-Type: application/json", "-d", "@create.json", "$base/api/trpc/projects.create?batch=1")
$createRes = Exec-Curl $argsCreate
# Parse
try {
    $createObj = $createRes | ConvertFrom-Json
    # Check if array
    if ($createObj -is [array]) { $pidVal = $createObj[0].result.data.id } else { $pidVal = $createObj.result.data.id }
}
catch {
    Write-Error "Failed to parse create response: $createRes"
    exit
}
Write-Host "   Project ID: $pidVal"

Write-Host "`n3. Updating Brief..."
$briefText = "A detective story in a cyber-noir city."
$updateJson = '{"0":{"projectId":' + $pidVal + ',"brief":"' + $briefText + '"}}'
$updateJson | Set-Content "update.json"
$argsUpdate = @("-s", "-b", $cookieFile, "-H", "Content-Type: application/json", "-d", "@update.json", "$base/api/trpc/projects.updateContent?batch=1")
Exec-Curl $argsUpdate | Out-Null
Write-Host "   Update Sent."

Write-Host "`n4. Verifying Brief..."
$inputJson = '{"0":{"id":' + $pidVal + '}}'
$encInput = [uri]::EscapeDataString($inputJson)
# Note: curl needs the URL to be quoted if characters like & are present
$urlGet = "$base/api/trpc/projects.get?batch=1&input=$encInput"
$argsGet = @("-s", "-b", $cookieFile, $urlGet)
$getRes = Exec-Curl $argsGet
$getObj = $getRes | ConvertFrom-Json
$savedBrief = if ($getObj -is [array]) { $getObj[0].result.data.content.brief } else { $getObj.result.data.content.brief }

if ($savedBrief -eq $briefText) { Write-Host "   [PASS] Brief Persisted: $savedBrief" -ForegroundColor Green }
else { Write-Host "   [FAIL] Brief Mismatch. Got: '$savedBrief'" -ForegroundColor Red }

Write-Host "`n5. Generating Script..."
$genJson = '{"0":{"brief":"' + $briefText + '","projectId":' + $pidVal + '}}'
$genJson | Set-Content "gen.json"
$argsGen = @("-s", "-b", $cookieFile, "-H", "Content-Type: application/json", "-d", "@gen.json", "$base/api/trpc/ai.generateScript?batch=1")
$genRes = Exec-Curl $argsGen
try {
    $genObj = $genRes | ConvertFrom-Json
    $script = if ($genObj -is [array]) { $genObj[0].result.data.script } else { $genObj.result.data.script }
    
    if ($script.Length -gt 10) { Write-Host "   [PASS] Script Generated ($($script.Length) chars)." -ForegroundColor Green }
    else { Write-Host "   [FAIL] Script empty. Response: $genRes" -ForegroundColor Red }
}
catch {
    Write-Host "   [FAIL] Generation Failed. Response: $genRes" -ForegroundColor Red
}

Write-Host "`n6. Verifying Script Persistence..."
$getRes2 = Exec-Curl $argsGet
$getObj2 = $getRes2 | ConvertFrom-Json
$savedScript = if ($getObj2 -is [array]) { $getObj2[0].result.data.content.script } else { $getObj2.result.data.content.script }

if ($savedScript.Length -gt 10) { Write-Host "   [PASS] Script Persisted." -ForegroundColor Green }
else { Write-Host "   [FAIL] Script Not Persisted." -ForegroundColor Red }
