# Pilote le bot en arriere-plan, sans fenetre : start | stop | status | logs | autostart-on | autostart-off
param(
  [ValidateSet('start', 'stop', 'status', 'logs', 'autostart-on', 'autostart-off')]
  [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $PSScriptRoot 'bump.pid'
$logFile = Join-Path $PSScriptRoot 'bump.log'
$indexJs = Join-Path $PSScriptRoot 'index.js'
$shortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'Discord auto-bump.lnk'

# conhost --headless fait tourner node sans aucune fenetre (meme avec Windows Terminal par defaut).
$conhost = Join-Path $env:WINDIR 'System32\conhost.exe'
$nodeExe = (Get-Command node).Source
$launchArgs = "--headless `"$nodeExe`" `"$indexJs`""

function Get-Bot {
  if (-not (Test-Path $pidFile)) { return $null }
  $botId = [int](Get-Content $pidFile -Raw).Trim()
  Get-Process -Id $botId -ErrorAction SilentlyContinue | Where-Object ProcessName -eq 'node'
}

function Show-Log([int]$Lines = 10) {
  if (Test-Path $logFile) { Get-Content $logFile -Tail $Lines -Encoding UTF8 }
}

switch ($Action) {
  'start' {
    if (Get-Bot) {
      Write-Host 'Le bot tourne deja.'
      break
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Start-Process $conhost -ArgumentList $launchArgs -WorkingDirectory $PSScriptRoot
    Write-Host 'Bot lance en arriere-plan. Connexion...'
    Start-Sleep -Seconds 8
    if (Get-Bot) { Write-Host 'OK, il tourne.' } else { Write-Host "Le bot s'est arrete :" }
    Show-Log
  }
  'stop' {
    $bot = Get-Bot
    if ($bot) {
      Stop-Process -Id $bot.Id -Force
      Write-Host 'Bot arrete.'
    } else {
      Write-Host "Le bot n'etait pas lance."
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
  }
  'status' {
    $bot = Get-Bot
    if ($bot) { Write-Host "Le bot tourne (PID $($bot.Id))." } else { Write-Host "Le bot n'est pas lance." }
    if (Test-Path $shortcut) { Write-Host 'Demarrage auto : active.' } else { Write-Host 'Demarrage auto : desactive.' }
    Show-Log
  }
  'logs' {
    Write-Host 'Journal en direct (Ctrl+C pour quitter)'
    if (Test-Path $logFile) { Get-Content $logFile -Tail 20 -Wait -Encoding UTF8 }
  }
  'autostart-on' {
    $lnk = (New-Object -ComObject WScript.Shell).CreateShortcut($shortcut)
    $lnk.TargetPath = $conhost
    $lnk.Arguments = $launchArgs
    $lnk.WorkingDirectory = $PSScriptRoot
    $lnk.Description = 'Lance le bot de bump Discord en arriere-plan'
    $lnk.Save()
    Write-Host 'Demarrage auto active : le bot se lancera sans fenetre a chaque ouverture de session.'
    Write-Host "(raccourci : $shortcut)"
  }
  'autostart-off' {
    if (Test-Path $shortcut) {
      Remove-Item $shortcut
      Write-Host 'Demarrage auto desactive.'
    } else {
      Write-Host "Le demarrage auto n'etait pas active."
    }
  }
}
