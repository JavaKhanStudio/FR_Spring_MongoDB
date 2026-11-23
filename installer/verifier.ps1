# Ecrit par Ficelle (activite/gen.py) depuis activite/checks.toml b1a3c1b01346 : ne pas modifier a la main.
# Verifie ce que l'activite demande ; au premier manque, dit quoi faire et sort en erreur (1).
# Windows PowerShell 5.1 : ce fichier est en UTF-8 avec BOM, sans quoi 5.1 lirait mal ses accents.
$AvantEncodage = [Console]::OutputEncoding
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }
function Fin([int]$Code) { try { [Console]::OutputEncoding = $AvantEncodage } catch { }; exit $Code }
function Ok([string]$t) { Write-Output "  ok  $t" }
function Manque([string]$A, [string]$Quoi, [string]$Def, [string]$Action, [string[]]$Run) {
    Write-Output ''; Write-Output "  X   $Quoi"; Write-Output ''; Write-Output "      $Def"; Write-Output "      $Action"
    if ($Run) { Write-Output ''; foreach ($l in $Run) { Write-Output "          $l" } }
    if ($Page) { Write-Output ''; Write-Output "      Pas à pas : $Page#$A" }
    Write-Output ''
    Fin 1
}
function Sur([string]$c) { [bool](Get-Command $c -CommandType Application -ErrorAction SilentlyContinue) }
function Lance([string[]]$a) {
    if (-not (Sur $a[0])) { return @{ rc = 127; out = '' } }
    $rest = @(); if ($a.Length -gt 1) { $rest = $a[1..($a.Length - 1)] }
    $o = & $a[0] @rest 2>&1 | Out-String
    @{ rc = $LASTEXITCODE; out = $o }
}
function Ecoute([int]$p) {
    $c = New-Object Net.Sockets.TcpClient
    try { $c.Connect('127.0.0.1', $p); $true } catch { $false } finally { $c.Close() }
}
function Conteneur([int]$p) {
    $r = Lance @('docker', 'ps', '--format', '{{.Names}} {{.Ports}}')
    if ($r.rc -ne 0) { return '' }
    foreach ($l in ($r.out -split "`r?`n")) { if ($l -match ":$p->") { return ($l -split ' ')[0] } }
    ''
}
function Tient([int]$p) {
    try {
        $k = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction Stop | Select-Object -First 1
        $pr = Get-Process -Id $k.OwningProcess -ErrorAction Stop
        @($pr.ProcessName, $k.OwningProcess)
    } catch { @('', '') }
}
$Page = 'https://simonbedardprog.com/ficelle/mongodb/carnet/direct/'
Write-Output ('Vérification : Le carnet, en direct' + ' (windows)'); Write-Output ''

# docker.present
if (Sur 'docker') { Ok 'Docker est installé' }
else {
    Manque docker-present 'Docker n''est pas installé sur cet ordinateur.' 'Docker fait tourner la base de données de l''activité dans un conteneur : une petite machine isolée, déjà prête.' 'Installez Docker Desktop avec la commande ci-dessous, ouvrez-le une fois depuis le menu Démarrer (il peut demander de redémarrer), puis relancez la vérification :' @('winget install -e --id Docker.DockerDesktop')
}

# docker.running
if ((Lance @('docker', 'info')).rc -eq 0) { Ok 'Docker tourne' }
else {
    Manque docker-running 'Docker est installé, mais il ne tourne pas.' 'Docker doit être démarré pour lancer les conteneurs de l''activité.' 'Ouvrez Docker Desktop (menu Démarrer, « Docker Desktop ») ou tapez la commande ci-dessous. Attendez que la baleine, près de l''horloge, ne bouge plus, puis relancez la vérification :' @('Start-Process "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"')
}

# compose.present
if ((Lance @('docker', 'compose', 'version')).rc -eq 0) { Ok 'Docker Compose est là' }
else {
    Manque compose-present 'La commande « docker compose » ne répond pas.' 'Docker Compose lance d''un coup les conteneurs que l''activité décrit dans son fichier docker-compose.yml.' 'Il vient avec Docker Desktop : mettez Docker Desktop à jour (sa roue dentée, « Software updates »), puis relancez la vérification :' @('winget upgrade -e --id Docker.DockerDesktop')
}

# port.free
if (-not (Ecoute 27017)) { Ok 'Le port 27017 est libre' }
elseif ($CN = Conteneur 27017) { Ok ('L''activité tourne déjà{holder} : rien à faire pour le port 27017'.Replace('{holder}', " (conteneur $CN)")) }
else {
    $HN, $HP = Tient 27017; $H = ''; if ($HN) { $H = " ($HN, pid $HP)" }
    if ($HN -eq 'mongod') { Manque port-free ('Le port 27017 est déjà pris par un autre programme{holder}.'.Replace('{holder}', $H)) 'Un port est un numéro de porte sur l''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l''activité a besoin du 27017.' 'C''est un MongoDB déjà installé sur cet ordinateur. Arrêtez-le le temps de l''activité, puis relancez la vérification :' @('net stop MongoDB') }
    Manque port-free ('Le port 27017 est déjà pris par un autre programme{holder}.'.Replace('{holder}', $H)) 'Un port est un numéro de porte sur l''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l''activité a besoin du 27017.' 'Fermez ce programme, puis relancez la vérification. Si c''est un service MongoDB, arrêtez-le dans un PowerShell ouvert en administrateur (clic droit sur PowerShell, « Exécuter en tant qu''administrateur ») :' @('net stop MongoDB')
}

# port.free
if (-not (Ecoute 8820)) { Ok 'Le port 8820 est libre' }
elseif ($CN = Conteneur 8820) { Ok ('L''activité tourne déjà{holder} : rien à faire pour le port 8820'.Replace('{holder}', " (conteneur $CN)")) }
else {
    $HN, $HP = Tient 8820; $H = ''; if ($HN) { $H = " ($HN, pid $HP)" }
    if ($HN -eq 'mongod') { Manque port-free ('Le port 8820 est déjà pris par un autre programme{holder}.'.Replace('{holder}', $H)) 'Un port est un numéro de porte sur l''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l''activité a besoin du 8820.' 'C''est un MongoDB déjà installé sur cet ordinateur. Arrêtez-le le temps de l''activité, puis relancez la vérification :' @('net stop MongoDB') }
    Manque port-free ('Le port 8820 est déjà pris par un autre programme{holder}.'.Replace('{holder}', $H)) 'Un port est un numéro de porte sur l''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l''activité a besoin du 8820.' 'Fermez ce programme, puis relancez la vérification. Si c''est un service MongoDB, arrêtez-le dans un PowerShell ouvert en administrateur (clic droit sur PowerShell, « Exécuter en tant qu''administrateur ») :' @('net stop MongoDB')
}

# mongosh.present
if (Sur 'mongosh') { Ok 'mongosh est installé' }
else {
    Manque mongosh-present 'mongosh n''est pas installé sur cet ordinateur.' 'mongosh est le programme où l''on tape les commandes MongoDB.' 'Installez mongosh, fermez ce PowerShell et rouvrez-en un, puis relancez la vérification :' @('winget install -e --id MongoDB.Shell')
}

Write-Output ''; Write-Output '  Tout est prêt.'; Write-Output ''
Fin 0
