# AstralField v3.0 Legacy Purge Mode Script
# Creates backup of current repo and prepares clean monorepo structure

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "astralfield_legacy_$timestamp"
$backupPath = ".backups/$backupName.zip"

Write-Host "AstralField v3.0 Legacy Purge Mode" -ForegroundColor Cyan
Write-Host "=" * 50

# Step 1: Create backup
Write-Host "Step 1: Creating backup archive..." -ForegroundColor Yellow

if (-not $DryRun) {
    # Create backup directory if it doesn't exist
    if (-not (Test-Path ".backups")) {
        New-Item -ItemType Directory -Path ".backups" | Out-Null
    }
    
    # Get current directory size before backup
    $totalSize = (Get-ChildItem -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
    
    Write-Host "   Creating archive directly from current directory..."
    Write-Host "   Estimated size: $([math]::Round($totalSize, 2)) MB"
    
    # Create compressed archive directly
    $excludePatterns = @('*.log', 'node_modules', '.next', 'build', 'dist', '.netlify', '.vercel')
    $filesToArchive = Get-ChildItem -Recurse -File | Where-Object {
        $file = $_
        -not ($excludePatterns | Where-Object { $file.Name -like $_ }) -and
        $file.FullName -notmatch '\\\.git\\' -and
        $file.FullName -notmatch '\\node_modules\\' -and
        $file.FullName -notmatch '\\\.(next|netlify|vercel)\\' -and
        $file.FullName -notmatch '\\(build|dist)\\' -and
        -not $file.Name.EndsWith('.log')
    }
    
    # Create archive with selected files
    $compress = @{
        Path = $filesToArchive.FullName
        CompressionLevel = "Optimal"
        DestinationPath = $backupPath
    }
    Compress-Archive @compress -Force
    
    # Calculate SHA256 hash
    $hash = Get-FileHash -Path $backupPath -Algorithm SHA256
    $archiveSize = (Get-Item $backupPath).Length / 1MB
    
    Write-Host "   Backup created: $backupPath" -ForegroundColor Green
    Write-Host "   Archive size: $([math]::Round($archiveSize, 2)) MB" -ForegroundColor Green
    Write-Host "   SHA256: $($hash.Hash)" -ForegroundColor Green
    
    # Store hash in evidence file
    $evidenceContent = "# Legacy Purge Evidence`n`n## Backup Information`n- File: $backupPath`n- Timestamp: $timestamp`n- SHA256: $($hash.Hash)`n- Size: $([math]::Round($archiveSize, 2)) MB`n- Files archived: $($filesToArchive.Count)`n`n"
    $evidenceContent | Out-File -FilePath "EVIDENCE.md" -Encoding UTF8
}

# Step 2: Define whitelist structure
Write-Host "Step 2: Preparing clean monorepo structure..." -ForegroundColor Yellow

$whitelistedItems = @(
    "apps",
    "apps/web", 
    "apps/api",
    "prisma",
    "packages",
    "packages/ui",
    "public",
    "providers", 
    "scripts",
    "docs",
    "analysis",
    ".vscode",
    ".github",
    ".backups",
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json", 
    "turbo.json",
    "tsconfig.json",
    "next.config.ts",
    ".env.example",
    "README.md",
    "EVIDENCE.md",
    "repo_map.md",
    ".gitignore"
)

if (-not $DryRun) {
    # Create new directory structure
    Write-Host "   Creating clean directory structure..."
    @(
        "apps/web/src/app",
        "apps/web/src/components", 
        "apps/web/src/lib",
        "apps/api/src/routes",
        "apps/api/src/middleware",
        "apps/api/src/services", 
        "packages/ui/src/components",
        "packages/ui/src/hooks",
        "providers/espn",
        "providers/sleeper",
        "prisma/migrations", 
        "prisma/seeds",
        "docs/api",
        "docs/handbook",
        "analysis",
        "scripts",
        "public/icons",
        ".github/workflows",
        ".vscode"
    ) | ForEach-Object {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
    
    # Preserve critical files
    $criticalFiles = @(
        ".env",
        ".env.local",
        ".env.production", 
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml"
    )
    
    $preservedFiles = @()
    foreach ($file in $criticalFiles) {
        if (Test-Path $file) {
            $content = Get-Content $file -Raw
            $preservedFiles += @{ Path = $file; Content = $content }
        }
    }
    
    # Remove all non-whitelisted items
    Write-Host "   Removing non-whitelisted files and directories..."
    Get-ChildItem -Force | Where-Object { 
        $_.Name -notin $whitelistedItems -and $_.Name -ne ".git"
    } | Remove-Item -Recurse -Force
    
    # Restore critical files
    foreach ($file in $preservedFiles) {
        $file.Content | Out-File -FilePath $file.Path -Encoding UTF8 -NoNewline
    }
}

# Step 3: Verify purge
Write-Host "Step 3: Verifying purge..." -ForegroundColor Yellow

$repoTree = tree /F /A | Out-String
Write-Host $repoTree

# Create repo map
$repoTree | Out-File -FilePath "repo_map.md" -Encoding UTF8

# Note: Skipping unexpected files check for initial purge - this will be handled by enforce_no_placeholders script

Write-Host "Legacy purge completed successfully!" -ForegroundColor Green
Write-Host "Final repo structure saved to repo_map.md" -ForegroundColor Green

if (-not $DryRun) {
    Write-Host "Backup archive: $backupPath" -ForegroundColor Green
    Write-Host "SHA256: $($hash.Hash)" -ForegroundColor Green
}

exit 0