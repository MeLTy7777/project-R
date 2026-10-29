# OS-level input (no CDP) for the Phase H2B-3A "manual-like" Playtest.  (ASCII only: Windows PowerShell 5.1 reads BOM-less files as ANSI.)
#   powershell -NoProfile -File os_input.ps1 -Action focus
#   powershell -NoProfile -File os_input.ps1 -Action origin          client-area top-left in screen pixels, as JSON
#   powershell -NoProfile -File os_input.ps1 -Action tap -Key Q -HoldMs 80
#   powershell -NoProfile -File os_input.ps1 -Action keydown -Key D  /  -Action keyup -Key D
#   powershell -NoProfile -File os_input.ps1 -Action move -X 800 -Y 500   move the mouse to a screen pixel
#   powershell -NoProfile -File os_input.ps1 -Action keys            JSON list of watched keys that are still held (GetAsyncKeyState)
#   powershell -NoProfile -File os_input.ps1 -Action server          long-lived worker: reads one command per stdin line ("move X Y", "tap Q 80", "keydown D", "keyup D", "origin", "focus", "keys", "quit") and prints one result line each
# Sends real key/mouse events (keybd_event / SetCursorPos) to the NW.js window. It never uses CDP Input.dispatch*.
param([string]$Action, [string]$Key = "", [int]$X = 0, [int]$Y = 0, [int]$HoldMs = 80)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint code, uint type);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vk);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
}
"@
[Win]::SetProcessDPIAware() | Out-Null
$vk = @{ Q = 0x51; E = 0x45; X = 0x58; C = 0x43; V = 0x56; F = 0x46; U = 0x55; R = 0x52; J = 0x4A; W = 0x57; A = 0x41; S = 0x53; D = 0x44; Esc = 0x1B }
function Get-Hwnd {
  $p = Get-Process nw -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($p) { return $p.MainWindowHandle } else { return [IntPtr]::Zero }
}
function Press($code, $up) {
  $scan = [byte][Win]::MapVirtualKey([uint32]$code, 0)
  $flags = 0
  if ($up) { $flags = 2 }
  [Win]::keybd_event([byte]$code, $scan, $flags, [UIntPtr]::Zero)
}
function Run($act, $key, $x, $y, $hold) {
  switch ($act) {
    "focus" { $h = Get-Hwnd; [Win]::ShowWindow($h, 9) | Out-Null; [Win]::SetForegroundWindow($h) | Out-Null; Start-Sleep -Milliseconds 300; return "focused" }
    "origin" { $h = Get-Hwnd; $pt = New-Object Win+POINT; $pt.X = 0; $pt.Y = 0; [Win]::ClientToScreen($h, [ref]$pt) | Out-Null; return ('{"x":' + $pt.X + ',"y":' + $pt.Y + '}') }
    "tap" { Press $vk[$key] $false; Start-Sleep -Milliseconds $hold; Press $vk[$key] $true; return "tapped $key" }
    "keydown" { Press $vk[$key] $false; return "down $key" }
    "keyup" { Press $vk[$key] $true; return "up $key" }
    "move" { [Win]::SetCursorPos($x, $y) | Out-Null; return "moved $x $y" }
    "keys" {
      $down = @()
      foreach ($k in $vk.Keys) { if (([Win]::GetAsyncKeyState($vk[$k]) -band 0x8000) -ne 0) { $down += $k } }
      return ("[" + (($down | ForEach-Object { '"' + $_ + '"' }) -join ",") + "]")
    }
  }
  return "unknown"
}
if ($Action -eq "server") {
  while (($line = [Console]::In.ReadLine()) -ne $null) {
    $t = $line.Trim() -split "\s+"
    if ($t[0] -eq "quit") { break }
    $key = ""; $x = 0; $y = 0; $hold = 80
    if ($t[0] -eq "move") { $x = [int]$t[1]; $y = [int]$t[2] }
    elseif ($t[0] -eq "tap") { $key = $t[1]; if ($t.Count -gt 2) { $hold = [int]$t[2] } }
    elseif ($t[0] -eq "keydown" -or $t[0] -eq "keyup") { $key = $t[1] }
    [Console]::Out.WriteLine((Run $t[0] $key $x $y $hold))
    [Console]::Out.Flush()
  }
} else {
  Write-Output (Run $Action $Key $X $Y $HoldMs)
}
