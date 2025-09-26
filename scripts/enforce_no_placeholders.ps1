# AstralField v3.0 - Enforce No Placeholders Script
# Scans repository for forbidden placeholder content

param(
    [switch]$Fix = $false
)

$ErrorActionPreference = "Stop"

Write-Host "AstralField v3.0 - Placeholder Content Scanner" -ForegroundColor Cyan
Write-Host "=" * 50

# Define forbidden patterns
$forbiddenPatterns = @(
    'TODO(?!Write)', # Allow TodoWrite but not TODO
    'FIXME',
    'PLACEHOLDER', 
    'LOREM',
    '\bWIP\b',
    'TKTK',
    'coming soon',
    'Coming Soon',
    'COMING SOON',
    '// stub',
    '/* stub',
    '# stub',
    'NotImplemented',
    'throw new Error\([''"]Not implemented',
    'console\.log\([''"]TODO',
    'function\s+\w+\(\)\s*{\s*}',
    'const\s+\w+\s*=\s*\(\)\s*=>\s*{\s*}',
    'export\s+(function|const)\s+\w+.*{\s*}',
    '<div>TODO</div>',
    '<p>Coming soon</p>',
    'Lorem ipsum'
)

# Files and directories to exclude
$excludePatterns = @(
    '\.git',
    'node_modules',
    '\.next',
    'dist',
    '\.turbo',
    '\.backups',
    'coverage',
    '\.nyc_output',
    'scripts\\legacy_purge\.ps1',
    'scripts\\enforce_no_placeholders\.ps1',
    'EVIDENCE\.md',
    'repo_map\.md',
    '\.log$',
    '\.md$' # Excluding markdown files from this check
)

$violations = @()
$totalFiles = 0
$scannedFiles = 0

# Function to check if file should be excluded
function Should-ExcludeFile {
    param($filePath)
    
    foreach ($pattern in $excludePatterns) {
        if ($filePath -match $pattern) {
            return $true
        }
    }
    return $false
}

# Get all files to scan
$allFiles = Get-ChildItem -Recurse -File | Where-Object { 
    -not (Should-ExcludeFile $_.FullName) -and 
    $_.Extension -match '\.(ts|tsx|js|jsx|json|html|css|scss)$'
}

$totalFiles = $allFiles.Count
Write-Host "Scanning $totalFiles files for forbidden content patterns..." -ForegroundColor Yellow

foreach ($file in $allFiles) {
    $scannedFiles++
    Write-Progress -Activity "Scanning files" -Status "$scannedFiles of $totalFiles" -PercentComplete (($scannedFiles / $totalFiles) * 100)
    
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        foreach ($pattern in $forbiddenPatterns) {
            $matches = [regex]::Matches($content, $pattern, 'IgnoreCase')
            foreach ($match in $matches) {
                $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
                $violations += [PSCustomObject]@{
                    File = $file.FullName.Replace($PWD, '.')
                    Line = $lineNumber
                    Pattern = $pattern
                    Match = $match.Value.Trim()
                    Context = ($content -split "`n")[$lineNumber - 1].Trim()
                }
            }
        }
    }
    catch {
        Write-Warning "Could not scan file: $($file.FullName)"
    }
}

Write-Progress -Completed -Activity "Scanning files"

# Report results
if ($violations.Count -eq 0) {
    Write-Host "SUCCESS: No forbidden placeholder content found!" -ForegroundColor Green
    Write-Host "Scanned $scannedFiles files across the repository" -ForegroundColor Green
    
    # Create success evidence
    $evidenceContent = "# Placeholder Enforcement Evidence`n`n"
    $evidenceContent += "**Status**: PASS`n"
    $evidenceContent += "**Files Scanned**: $scannedFiles`n"
    $evidenceContent += "**Violations Found**: 0`n"
    $evidenceContent += "**Scan Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"
    $evidenceContent += "Repository contains zero placeholder content and is ready for production.`n"
    
    $evidenceContent | Out-File -FilePath "PLACEHOLDER_ENFORCEMENT_EVIDENCE.md" -Encoding UTF8
    
    exit 0
} else {
    Write-Host "VIOLATIONS FOUND: $($violations.Count) instances of forbidden content" -ForegroundColor Red
    Write-Host ""
    
    # Group violations by file
    $violationsByFile = $violations | Group-Object -Property File
    
    foreach ($fileGroup in $violationsByFile) {
        Write-Host "File: $($fileGroup.Name)" -ForegroundColor Yellow
        foreach ($violation in $fileGroup.Group) {
            Write-Host "  Line $($violation.Line): $($violation.Match)" -ForegroundColor Red
            Write-Host "    Context: $($violation.Context)" -ForegroundColor Gray
            Write-Host "    Pattern: $($violation.Pattern)" -ForegroundColor DarkGray
        }
        Write-Host ""
    }
    
    # Create failure evidence
    $evidenceContent = "# Placeholder Enforcement Evidence`n`n"
    $evidenceContent += "**Status**: FAIL`n"
    $evidenceContent += "**Files Scanned**: $scannedFiles`n"
    $evidenceContent += "**Violations Found**: $($violations.Count)`n"
    $evidenceContent += "**Scan Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"
    $evidenceContent += "## Violations by File`n`n"
    
    foreach ($fileGroup in $violationsByFile) {
        $evidenceContent += "### $($fileGroup.Name)`n"
        foreach ($violation in $fileGroup.Group) {
            $evidenceContent += "- Line $($violation.Line): ``$($violation.Match)```n"
        }
        $evidenceContent += "`n"
    }
    
    $evidenceContent | Out-File -FilePath "PLACEHOLDER_ENFORCEMENT_EVIDENCE.md" -Encoding UTF8
    
    Write-Host "BUILD BLOCKED: Repository contains placeholder content that must be removed before deployment." -ForegroundColor Red
    Write-Host "Evidence saved to: PLACEHOLDER_ENFORCEMENT_EVIDENCE.md" -ForegroundColor Yellow
    
    exit 1
}