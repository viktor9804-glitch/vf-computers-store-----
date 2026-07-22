param(
  [ValidateSet("availability", "full")]
  [string]$Mode = "availability"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot "logs"
$lockDirectory = Join-Path $env:TEMP "vf-computers-vali-sync.lock"
$lockMetadataFile = Join-Path $lockDirectory "owner.json"
$logFile = Join-Path $logDirectory ("vali-{0}-{1}.log" -f $Mode, (Get-Date -Format "yyyy-MM"))
$lockToken = [guid]::NewGuid().ToString("N")
$lockAcquired = $false

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Test-LockOwnerIsRunning {
  if (-not (Test-Path -LiteralPath $lockMetadataFile)) {
    return $false
  }

  try {
    $owner = Get-Content -LiteralPath $lockMetadataFile -Raw | ConvertFrom-Json
    $process = Get-Process -Id ([int]$owner.ProcessId) -ErrorAction Stop
    $expectedStart = [datetime]::Parse($owner.ProcessStartTime).ToUniversalTime()
    $actualStart = $process.StartTime.ToUniversalTime()
    return [math]::Abs(($actualStart - $expectedStart).TotalSeconds) -lt 2
  } catch {
    return $false
  }
}

function Enter-ValiSyncLock {
  try {
    New-Item -ItemType Directory -Path $lockDirectory -ErrorAction Stop | Out-Null
  } catch {
    $lockItem = Get-Item -LiteralPath $lockDirectory -ErrorAction SilentlyContinue
    $lockAge = if ($lockItem) { (Get-Date) - $lockItem.CreationTime } else { [timespan]::Zero }
    $ownerIsRunning = Test-LockOwnerIsRunning

    # A newly-created lock may not have its metadata yet. Give it a short
    # grace period, but automatically recover abandoned locks after that.
    if ($ownerIsRunning -or $lockAge.TotalMinutes -lt 5) {
      # The active sync can hold the monthly log open while redirecting npm
      # output. A concurrent scheduled run must still exit cleanly if its
      # informational log line cannot be written.
      try {
        "[$(Get-Date -Format o)] Skipped $Mode sync because another VALI sync is running." | Add-Content -LiteralPath $logFile -ErrorAction Stop
      } catch {
        # The active owner is healthy, so a locked log file is harmless here.
      }
      return $false
    }

    $resolvedLock = [System.IO.Path]::GetFullPath($lockDirectory)
    $expectedLock = [System.IO.Path]::GetFullPath((Join-Path $env:TEMP "vf-computers-vali-sync.lock"))
    if ($resolvedLock -ne $expectedLock) {
      throw "Refusing to remove unexpected lock path: $resolvedLock"
    }

    "[$(Get-Date -Format o)] Recovering abandoned VALI sync lock (age: $([math]::Round($lockAge.TotalMinutes, 1)) minutes)." | Add-Content -LiteralPath $logFile
    Remove-Item -LiteralPath $resolvedLock -Force -Recurse -ErrorAction Stop
    New-Item -ItemType Directory -Path $lockDirectory -ErrorAction Stop | Out-Null
  }

  $currentProcess = Get-Process -Id $PID
  @{
    Token = $lockToken
    ProcessId = $PID
    ProcessStartTime = $currentProcess.StartTime.ToUniversalTime().ToString("o")
    Mode = $Mode
    AcquiredAt = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json | Set-Content -LiteralPath $lockMetadataFile -Encoding UTF8

  return $true
}

try {
  $lockAcquired = Enter-ValiSyncLock
  if (-not $lockAcquired) {
    exit 0
  }
} catch {
  "[$(Get-Date -Format o)] ERROR acquiring VALI sync lock: $($_.Exception.Message)" | Add-Content -LiteralPath $logFile
  exit 1
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
  if ($lockAcquired -and (Test-Path -LiteralPath $lockMetadataFile)) {
    try {
      $owner = Get-Content -LiteralPath $lockMetadataFile -Raw | ConvertFrom-Json
      if ($owner.Token -eq $lockToken) {
        Remove-Item -LiteralPath $lockDirectory -Force -Recurse -ErrorAction SilentlyContinue
      }
    } catch {
      "[$(Get-Date -Format o)] WARNING: Could not clean VALI sync lock: $($_.Exception.Message)" | Add-Content -LiteralPath $logFile
    }
  }
}
