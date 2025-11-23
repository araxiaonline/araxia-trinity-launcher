# Build script for Araxia Trinity Launcher
# This script builds the production executable

Write-Host "Building Araxia Trinity Launcher..." -ForegroundColor Cyan

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script needs to run as Administrator to create symbolic links." -ForegroundColor Yellow
    Write-Host "Restarting as Administrator..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Set production environment
$env:NODE_ENV = "production"

# Disable code signing to speed up build
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

# Run the build
Write-Host "Compiling TypeScript and building application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild completed successfully!" -ForegroundColor Green
    Write-Host "Executable location: dist\Araxia Trinity Launcher.exe" -ForegroundColor Green
    Write-Host "`nTo test the launcher:" -ForegroundColor Cyan
    Write-Host "1. Copy 'Araxia Trinity Launcher.exe' to your World of Warcraft folder" -ForegroundColor White
    Write-Host "2. Copy 'araxiatrinity.yml' to the same folder" -ForegroundColor White
    Write-Host "3. Place your 'Arctium Game Launcher.exe' in the same folder" -ForegroundColor White
    Write-Host "4. Run 'Araxia Trinity Launcher.exe'" -ForegroundColor White
} else {
    Write-Host "`nBuild failed!" -ForegroundColor Red
    exit 1
}
