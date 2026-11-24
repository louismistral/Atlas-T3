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

# [Atlas] A21 : identifiant propre à ATLAS T3 ; la barre des tâches prend l'icône du raccourci du menu Démarrer qui le porte
$env:T3CODE_DESKTOP_APP_USER_MODEL_ID = 'louismistral.atlas-t3'
# [Atlas] A21 : la fenêtre dit à Windows de relancer ce script quand on l'épingle (sinon il épingle electron.exe)
$env:ATLAS_T3_LANCEUR = $PSCommandPath
& $vp run start:desktop
