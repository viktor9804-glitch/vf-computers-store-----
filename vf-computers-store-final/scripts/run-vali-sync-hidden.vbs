Option Explicit

Dim shell, mode, powershellPath, scriptPath, command, exitCode

Set shell = CreateObject("WScript.Shell")

mode = "availability"
If WScript.Arguments.Named.Exists("Mode") Then
  mode = WScript.Arguments.Named.Item("Mode")
End If

If mode <> "availability" And mode <> "full" Then
  WScript.Quit 2
End If

powershellPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
scriptPath = "E:\sait\vf-computers-store-final\vf-computers-store-final\scripts\run-vali-sync.ps1"

command = Chr(34) & powershellPath & Chr(34) & _
  " -NoProfile -ExecutionPolicy Bypass -File " & Chr(34) & scriptPath & Chr(34) & _
  " -Mode " & mode

' Window style 0 keeps the child process hidden. Waiting preserves its exit code.
exitCode = shell.Run(command, 0, True)
WScript.Quit exitCode
