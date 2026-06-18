param(
  [ValidateSet("availability", "full")]
  [string]$Mode = "availability"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot "logs"
$lockDirectory = Join-Path $env:TEMP "vf-computers-vali-sync.lock"
$logFile = Join-Path $logDirectory ("vali-{0}-{1}.log" -f $Mode, (Get-Date -Format "yyyy-MM"))

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

try {
  New-Item -ItemType Directory -Path $lockDirectory -ErrorAction Stop | Out-Null
} catch {
  "[$(Get-Date -Format o)] Skipped $Mode sync because another VALI sync is running." | Add-Content -LiteralPath $logFile
  exit 0
}

try {
  Set-Location -LiteralPath $projectRoot
  "[$(Get-Date -Format o)] Starting $Mode sync." | Add-Content -LiteralPath $logFile
  $scriptName = if ($Mode -eq "full") { "sync:vali:full" } else { "sync:vali:availability" }
  $npm = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
  if (-not (Test-Path -LiteralPath $npm)) {
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
  }
  & $npm run $scriptName *>> $logFile
  if ($LASTEXITCODE -ne 0) {
    throw "VALI $Mode sync failed with exit code $LASTEXITCODE."
  }
  "[$(Get-Date -Format o)] Finished $Mode sync." | Add-Content -LiteralPath $logFile
} catch {
  "[$(Get-Date -Format o)] ERROR: $($_.Exception.Message)" | Add-Content -LiteralPath $logFile
  exit 1
} finally {
  Remove-Item -LiteralPath $lockDirectory -Force -Recurse -ErrorAction SilentlyContinue
}
