# [Atlas] Lanceur d'ATLAS T3 (raccourci du Bureau « ATLAS T3 »). Voir ATLAS.md.
# Ouvre l'app de bureau sans fenêtre noire. Recompile seulement si le code a changé depuis la dernière
# compilation réussie (empreinte : commit + modifications + fichiers nouveaux).
# shortcut: empreinte git seulement, un fichier ignoré par git qui change ne déclenche pas de compilation.
# Pas 'Stop' : sous PowerShell 5.1, la moindre ligne sur stderr (avertissements de git, de vp) arrêterait le script.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)
$vp = Join-Path $env:LOCALAPPDATA 'vite-plus\bin\vp.exe'
$gitDir = (git rev-parse --absolute-git-dir)
$stamp = Join-Path $gitDir 'atlas-build-stamp'
$log = Join-Path $gitDir 'atlas-build.log'

$state = (git rev-parse HEAD) + "`n" + ((git -c core.safecrlf=false diff HEAD 2>$null) -join "`n") + "`n" + ((git ls-files --others --exclude-standard) -join "`n")
$sha = [System.Security.Cryptography.SHA256]::Create()
$key = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($state)))
$old = if (Test-Path $stamp) { Get-Content $stamp -Raw } else { '' }

if ($old.Trim() -ne $key) {
  cmd /c "`"$vp`" run build:desktop > `"$log`" 2>&1"
  if ($LASTEXITCODE -ne 0) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show("La compilation d'ATLAS T3 a échoué.`nJournal : $log", 'ATLAS T3') | Out-Null
    Start-Process notepad $log
    exit 1
  }
  Set-Content $stamp $key -NoNewline
}

& $vp run start:desktop
