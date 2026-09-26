# StopFrauda Cloud Run Deployment Script (Windows PowerShell)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  StopFrauda - Google Cloud Run Deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check gcloud login
Write-Host "`n[1/3] Checking gcloud authentication..." -ForegroundColor Yellow
try {
    $currentAccount = gcloud config get-value account 2>$null
    if (-not $currentAccount) {
        Write-Host "Please authenticate with Google Cloud in the browser window that opens..." -ForegroundColor Cyan
        gcloud auth login
    } else {
        Write-Host "Authenticated as: $currentAccount" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking gcloud authentication. Running 'gcloud auth login'..." -ForegroundColor Yellow
    gcloud auth login
}

# 2. Select Project
Write-Host "`n[2/3] Setting Google Cloud Project..." -ForegroundColor Yellow
$currentProject = gcloud config get-value project 2>$null
if (-not $currentProject) {
    Write-Host "Available projects:" -ForegroundColor Cyan
    gcloud projects list
    $projectId = Read-Host "`nEnter your Google Cloud Project ID"
    gcloud config set project $projectId
} else {
    Write-Host "Current Project: $currentProject" -ForegroundColor Green
    $change = Read-Host "Use this project? (Y/n)"
    if ($change -eq "n" -or $change -eq "N") {
        gcloud projects list
        $projectId = Read-Host "`nEnter your Google Cloud Project ID"
        gcloud config set project $projectId
    }
}

# 3. Deploy to Cloud Run
Write-Host "`n[3/3] Building and deploying container to Cloud Run..." -ForegroundColor Yellow
Write-Host "Deploying service 'stopfrauda-backend'..." -ForegroundColor Cyan

gcloud run deploy stopfrauda-backend `
    --source . `
    --region us-central1 `
    --allow-unauthenticated `
    --set-env-vars ENVIRONMENT=production

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  Deployment Complete! " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Copy the Service URL above and paste it into:" -ForegroundColor Cyan
Write-Host "1) frontend/app.json (under extra.backendUrl)" -ForegroundColor White
Write-Host "2) The Settings tab in the StopFrauda mobile app" -ForegroundColor White
