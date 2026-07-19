$ErrorActionPreference = "Stop"

$powershell = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$syncScript = "E:\sait\vf-computers-store-final\vf-computers-store-final\scripts\run-vali-sync.ps1"

$tasks = @(
  @{ Name = "VF Computers - VALI availability"; Mode = "availability" },
  @{ Name = "VF Computers - VALI full catalog"; Mode = "full" }
)

foreach ($task in $tasks) {
  $arguments = '-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "{0}" -Mode {1}' -f $syncScript, $task.Mode
  $action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments
  Set-ScheduledTask -TaskName $task.Name -Action $action | Out-Null
}

Write-Host "The original VALI scheduled-task actions were restored."
