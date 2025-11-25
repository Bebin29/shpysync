# Self-Signed-Zertifikat für Code-Signing erstellen (nur für Entwicklung/Test!)
# Für Produktion sollte ein echtes Zertifikat von einer vertrauenswürdigen CA verwendet werden

param(
    [string]$CertName = "WAWISync Development Certificate",
    [string]$CertPath = "build\certificate.pfx",
    [int]$ValidityYears = 1
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WAWISync Code-Signing Zertifikat Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe, ob das Skript als Administrator ausgeführt wird
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    Write-Host "WARNUNG: Dieses Skript sollte als Administrator ausgeführt werden," -ForegroundColor Yellow
    Write-Host "um das Zertifikat im Windows-Zertifikatspeicher zu installieren." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Möchten Sie trotzdem fortfahren? (j/n)"
    if ($continue -ne "j" -and $continue -ne "J") {
        Write-Host "Abgebrochen." -ForegroundColor Red
        exit 1
    }
}

# Erstelle build-Verzeichnis, falls es nicht existiert
$buildDir = Split-Path -Parent $CertPath
if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
    Write-Host "Verzeichnis erstellt: $buildDir" -ForegroundColor Green
}

# Frage nach Passwort für das Zertifikat
Write-Host "Geben Sie ein Passwort für das Zertifikat ein (mindestens 6 Zeichen):" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$passwordConfirm = Read-Host "Passwort bestätigen:"

# Konvertiere SecureString zu String für Vergleich
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

if ($plainPassword.Length -lt 6) {
    Write-Host "FEHLER: Passwort muss mindestens 6 Zeichen lang sein!" -ForegroundColor Red
    exit 1
}

if ($plainPassword -ne $passwordConfirm) {
    Write-Host "FEHLER: Passwörter stimmen nicht überein!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Erstelle Self-Signed-Zertifikat..." -ForegroundColor Cyan

try {
    # Gültigkeitsende berechnen
    $notAfter = (Get-Date).AddYears($ValidityYears)

    # Erstelle Self-Signed-Zertifikat
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=$CertName" `
        -KeyUsage DigitalSignature `
        -FriendlyName "$CertName" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyExportPolicy Exportable `
        -KeySpec Signature `
        -KeyLength 2048 `
        -KeyAlgorithm RSA `
        -HashAlgorithm SHA256 `
        -NotAfter $notAfter

    Write-Host "Zertifikat erstellt." -ForegroundColor Green
    Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
    Write-Host "  Gültig bis: $($cert.NotAfter)" -ForegroundColor Gray

    # Exportiere Zertifikat als PFX
    $certPathFull = Join-Path (Get-Location) $CertPath
    $certPathFull = [System.IO.Path]::GetFullPath($certPathFull)
    
    Write-Host ""
    Write-Host "Exportiere Zertifikat als PFX..." -ForegroundColor Cyan
    
    $certPassword = ConvertTo-SecureString -String $plainPassword -Force -AsPlainText

    Export-PfxCertificate `
        -Cert $cert `
        -FilePath $certPathFull `
        -Password $certPassword | Out-Null

    Write-Host "Zertifikat exportiert: $certPathFull" -ForegroundColor Green

    # Versuche, Passwort in .env-Datei zu speichern (optional)
    $envPath = Join-Path (Get-Location) ".env"
    
    if (-not (Test-Path $envPath)) {
        Write-Host ""
        Write-Host "Speichere Passwort in .env-Datei für automatische Verwendung..." -ForegroundColor Cyan
        Add-Content -Path $envPath -Value "CSC_KEY_PASSWORD=$plainPassword"
        Write-Host "Passwort in .env-Datei gespeichert." -ForegroundColor Green
        Write-Host "Hinweis: .env-Datei sollte in .gitignore eingetragen sein." -ForegroundColor Gray
    } else {
        # Prüfe, ob CSC_KEY_PASSWORD bereits existiert
        $envContent = Get-Content $envPath -Raw
        if ($envContent -match "CSC_KEY_PASSWORD=") {
            Write-Host ""
            Write-Host ".env-Datei existiert bereits mit CSC_KEY_PASSWORD." -ForegroundColor Yellow
            Write-Host "Passwort wurde nicht automatisch aktualisiert." -ForegroundColor Yellow
            Write-Host "Bitte aktualisieren Sie CSC_KEY_PASSWORD manuell in .env." -ForegroundColor Yellow
        } else {
            Add-Content -Path $envPath -Value "CSC_KEY_PASSWORD=$plainPassword"
            Write-Host ""
            Write-Host "Passwort zu bestehender .env-Datei hinzugefügt." -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Setup abgeschlossen." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Zertifikat erstellt und konfiguriert." -ForegroundColor Green
    Write-Host ""
    Write-Host "Sie können jetzt den Build mit Code-Signing ausführen:" -ForegroundColor Yellow
    Write-Host "  npm run electron:build:prod" -ForegroundColor White
    Write-Host ""
    Write-Host "Das Build-Skript erkennt automatisch:" -ForegroundColor Cyan
    Write-Host "  - Zertifikat: $certPathFull" -ForegroundColor Gray
    Write-Host "  - Passwort: Aus .env-Datei oder Umgebungsvariable" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Hinweis: Dieses Self-Signed-Zertifikat wird von Windows" -ForegroundColor Yellow
    Write-Host "nicht automatisch als vertrauenswürdig erkannt. Benutzer" -ForegroundColor Yellow
    Write-Host "müssen das Zertifikat manuell installieren, um Warnungen" -ForegroundColor Yellow
    Write-Host "zu vermeiden." -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "FEHLER beim Erstellen des Zertifikats:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
