param([switch]$RunAsSystem)

$ErrorActionPreference = "Stop"
$runner = Join-Path $PSScriptRoot "run-vali-sync.ps1"
$powerShell = (Get-Command powershell.exe).Source
$principal = if ($RunAsSystem) {
  New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
} else {
  New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
}
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3)

$availabilityAction = New-ScheduledTaskAction -Execute $powerShell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -Mode availability"
$availabilityTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
$availabilityTask = New-ScheduledTask -Action $availabilityAction -Trigger $availabilityTrigger -Principal $principal -Settings $settings -Description "Updates VALI prices and availability every 15 minutes."
Register-ScheduledTask -TaskName "VF Computers - VALI availability" -InputObject $availabilityTask -Force | Out-Null

$fullAction = New-ScheduledTaskAction -Execute $powerShell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -Mode full"
$fullTrigger = New-ScheduledTaskTrigger -Daily -At "03:00"
$fullTask = New-ScheduledTask -Action $fullAction -Trigger $fullTrigger -Principal $principal -Settings $settings -Description "Runs a complete VALI catalog synchronization every day."
Register-ScheduledTask -TaskName "VF Computers - VALI full catalog" -InputObject $fullTask -Force | Out-Null

Get-ScheduledTask -TaskName "VF Computers - VALI availability", "VF Computers - VALI full catalog" |
  Select-Object TaskName, State
