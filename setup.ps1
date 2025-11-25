#!/usr/bin/env pwsh
Write-Host "=== Initialisation du projet Bibliotheque API (Windows PowerShell) ===" -ForegroundColor Cyan

# Vérifier Node.js et npm
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js introuvable. Installez Node.js >=16 et assurez-vous que 'node' est dans le PATH."
  exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm introuvable. Installez npm puis relancez."
  exit 1
}

# Afficher versions
Write-Host ("Node : " + (node -v)) -ForegroundColor Green
Write-Host ("npm  : " + (npm -v)) -ForegroundColor Green

# Copier .env si absent
if (-not (Test-Path -Path ".env")) {
  if (Test-Path -Path ".env.example") {
    Copy-Item -Path ".env.example" -Destination ".env"
    Write-Host ".env créé à partir de .env.example. Éditez .env et renseignez DATABASE_URL avant de continuer." -ForegroundColor Yellow
  } else {
    Write-Warning "Aucun .env.example trouvé — créez un .env avec DATABASE_URL."
  }
} else {
  Write-Host ".env existe déjà" -ForegroundColor Green
}

# Vérifier DATABASE_URL dans .env
$hasDb = $false
try {
  if (Test-Path -Path ".env") {
    $lines = Get-Content -Path ".env"
    $dbLine = $lines | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' }
    if ($dbLine) {
      $value = $dbLine -replace '^\s*DATABASE_URL\s*=\s*', ''
      $value = $value.Trim('"').Trim()
      if ($value -and $value -ne '') { $hasDb = $true }
    }
  }
} catch {
  # ignore
}

if (-not $hasDb) {
  Write-Warning "DATABASE_URL introuvable ou vide dans .env. Éditez .env et ajoutez la valeur fournie par Neon/Postgres."
  $cont = Read-Host "Voulez-vous continuer malgré tout ? [y/N]"
  if ($cont -notin @('y','Y','yes','YES')) {
    Write-Host "Arrêt de l'initialisation. Mettez à jour .env puis relancez setup.ps1." -ForegroundColor Red
    exit 1
  }
}

Read-Host "Appuyez sur Entrée pour continuer (ou Ctrl+C pour annuler)..."

# Installer dépendances
Write-Host "`nInstallation des dépendances (npm install)..." -ForegroundColor Cyan
$rc = npm install
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm install a échoué (code $LASTEXITCODE). Voir la sortie ci-dessus."
  exit $LASTEXITCODE
}

# Lancer migrations Prisma
Write-Host "`nLancer les migrations Prisma et générer le client..." -ForegroundColor Cyan
try {
  & npx prisma migrate dev --name init
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Prisma migrate a rencontré une erreur (code $LASTEXITCODE). Vérifiez DATABASE_URL et la connexion à la DB."
    exit $LASTEXITCODE
  }
} catch {
  Write-Error "Erreur lors de l'exécution de 'npx prisma migrate dev --name init' : $_"
  exit 1
}

# Générer client Prisma
try {
  & npx prisma generate
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Prisma generate a échoué (code $LASTEXITCODE)."
    exit $LASTEXITCODE
  }
} catch {
  Write-Error "Erreur lors de 'npx prisma generate' : $_"
  exit 1
}

# Seed optionnel
if (Test-Path -Path "prisma/seed.js") {
  $runSeed = Read-Host "Voulez-vous exécuter prisma seed (prisma/seed.js) maintenant ? [Y/n]"
  if ($runSeed -in @('','Y','y','yes','Yes')) {
    Write-Host "Exécution du seed..." -ForegroundColor Cyan
    node prisma/seed.js
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Le seed a retourné un code non nul ($LASTEXITCODE). Vérifiez la sortie."
    } else {
      Write-Host "Seed terminé." -ForegroundColor Green
    }
  } else {
    Write-Host "Seed ignoré." -ForegroundColor Yellow
  }
}

# Démarrer le serveur en dev (option)
$startNow = Read-Host "Démarrer le serveur en mode développement maintenant ? (npm run dev) [Y/n]"
if ($startNow -in @('','Y','y','yes','Yes')) {
  Write-Host "`nDémarrage du serveur (npm run dev). Utilisez Ctrl+C pour arrêter." -ForegroundColor Cyan
  & npm run dev
} else {
  Write-Host "`nInitialisation terminée. Pour démarrer le serveur plus tard : npm run dev" -ForegroundColor Green
  Write-Host "Pour exécuter ce script : powershell -ExecutionPolicy Bypass -File .\setup.ps1" -ForegroundColor Gray
}
