# Build the Electron app using Docker
Write-Host "Building Araxia Trinity Launcher using Docker..." -ForegroundColor Cyan

# Build the Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -f Dockerfile.build -t araxia-launcher-builder .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

# Create a temporary container and copy the output
Write-Host "Extracting build artifacts..." -ForegroundColor Yellow
$containerId = docker create araxia-launcher-builder

# Create dist directory if it doesn't exist
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

# Copy the built files from the container
docker cp "${containerId}:/app/dist/." "./dist/"

# Clean up the container
docker rm $containerId | Out-Null

if (Test-Path "dist/Araxia Trinity Launcher.exe") {
    Write-Host "`nBuild completed successfully!" -ForegroundColor Green
    Write-Host "Executable location: dist\Araxia Trinity Launcher.exe" -ForegroundColor Green
} else {
    Write-Host "`nBuild may have failed - executable not found!" -ForegroundColor Red
    Write-Host "Check the dist folder for output files." -ForegroundColor Yellow
}
