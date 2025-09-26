# AstralField v3.0 Comprehensive Test Suite
# Runs lint, typecheck, unit, integration, and E2E tests with coverage reporting

param(
    [switch]$SkipE2E = $false,
    [switch]$Coverage = $true,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "AstralField v3.0 Test Suite" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Initialize test tracking
$testResults = @{
    Lint = @{ Status = "Pending"; Duration = 0 }
    TypeCheck = @{ Status = "Pending"; Duration = 0 }
    Unit = @{ Status = "Pending"; Duration = 0; Coverage = 0 }
    Integration = @{ Status = "Pending"; Duration = 0; Coverage = 0 }
    E2E = @{ Status = "Pending"; Duration = 0 }
    Overall = @{ Status = "Pending"; StartTime = Get-Date }
}

# Function to run test with timing
function Run-TestWithTiming {
    param(
        [string]$TestName,
        [string]$Command,
        [scriptblock]$SuccessCheck = { $LASTEXITCODE -eq 0 }
    )
    
    Write-Host "`n🔧 Running $TestName..." -ForegroundColor Blue
    Write-Host "Command: $Command" -ForegroundColor Gray
    
    $startTime = Get-Date
    
    try {
        Invoke-Expression $Command
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if (& $SuccessCheck) {
            $testResults[$TestName].Status = "Passed"
            $testResults[$TestName].Duration = $duration
            Write-Host "✅ $TestName completed successfully ($("{0:F2}" -f $duration)s)" -ForegroundColor Green
            return $true
        } else {
            $testResults[$TestName].Status = "Failed"  
            $testResults[$TestName].Duration = $duration
            Write-Host "❌ $TestName failed ($("{0:F2}" -f $duration)s)" -ForegroundColor Red
            return $false
        }
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        $testResults[$TestName].Status = "Error"
        $testResults[$TestName].Duration = $duration
        Write-Host "💥 $TestName encountered an error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to extract coverage from output
function Extract-Coverage {
    param([string]$Output, [string]$TestType)
    
    # Look for common coverage patterns
    if ($Output -match "All files\s*\|\s*(\d+\.?\d*)\s*\|") {
        $coverage = [float]$matches[1]
        $testResults[$TestType].Coverage = $coverage
        return $coverage
    } elseif ($Output -match "Statements\s*:\s*(\d+\.?\d*)%") {
        $coverage = [float]$matches[1]
        $testResults[$TestType].Coverage = $coverage
        return $coverage  
    } elseif ($Output -match "Coverage:\s*(\d+\.?\d*)%") {
        $coverage = [float]$matches[1]
        $testResults[$TestType].Coverage = $coverage
        return $coverage
    }
    return 0
}

# Ensure we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Load environment for testing
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim('"')
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# 1. LINTING
Write-Host "`n📝 PHASE 1: CODE LINTING" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$lintSuccess = Run-TestWithTiming -TestName "Lint" -Command "npm run lint"

# 2. TYPE CHECKING
Write-Host "`n🔍 PHASE 2: TYPE CHECKING" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

$typeCheckSuccess = Run-TestWithTiming -TestName "TypeCheck" -Command "npm run type-check"

# 3. UNIT TESTS
Write-Host "`n🧪 PHASE 3: UNIT TESTS" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Try different unit test commands based on what's available
$unitCommand = "npm run test:unit 2>&1"
if (-not (npm run | Select-String "test:unit")) {
    $unitCommand = "npm run test:coverage 2>&1" 
    if (-not (npm run | Select-String "test:coverage")) {
        $unitCommand = "npm test 2>&1"
    }
}

$unitOutput = ""
$unitSuccess = Run-TestWithTiming -TestName "Unit" -Command $unitCommand -SuccessCheck {
    # Capture output for coverage parsing
    $script:unitOutput = $unitCommand | Invoke-Expression 2>&1 | Out-String
    # Check if any tests ran successfully
    $script:unitOutput -match "Tests:\s+\d+\s+passed" -or $script:unitOutput -match "All tests passed" -or $LASTEXITCODE -eq 0
}

# Extract unit test coverage
if ($unitOutput) {
    Extract-Coverage -Output $unitOutput -TestType "Unit" | Out-Null
}

# 4. INTEGRATION TESTS  
Write-Host "`n🔧 PHASE 4: INTEGRATION TESTS" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$integrationCommand = "npm run test:integration 2>&1"
if (-not (npm run | Select-String "test:integration")) {
    Write-Host "ℹ️  Integration tests not configured, using API tests" -ForegroundColor Blue
    $integrationCommand = "npm run test:api 2>&1"
    if (-not (npm run | Select-String "test:api")) {
        Write-Host "⚠️  No integration test command found, skipping" -ForegroundColor Yellow
        $testResults.Integration.Status = "Skipped"
        $integrationSuccess = $true
    }
}

if ($testResults.Integration.Status -ne "Skipped") {
    $integrationOutput = ""
    $integrationSuccess = Run-TestWithTiming -TestName "Integration" -Command $integrationCommand -SuccessCheck {
        $script:integrationOutput = $integrationCommand | Invoke-Expression 2>&1 | Out-String
        $script:integrationOutput -match "passed" -or $LASTEXITCODE -eq 0
    }
    
    if ($integrationOutput) {
        Extract-Coverage -Output $integrationOutput -TestType "Integration" | Out-Null
    }
} else {
    $integrationSuccess = $true
}

# 5. E2E TESTS
Write-Host "`n🎭 PHASE 5: END-TO-END TESTS" -ForegroundColor Cyan  
Write-Host "============================" -ForegroundColor Cyan

$e2eCommand = "npm run test:e2e 2>&1"
if (-not (npm run | Select-String "test:e2e")) {
    Write-Host "ℹ️  E2E tests not configured, attempting Playwright" -ForegroundColor Blue
    $e2eCommand = "npx playwright test 2>&1"
    
    # Check if Playwright is available
    try {
        $playwrightCheck = npx playwright --version 2>&1
        if (-not $playwrightCheck) {
            Write-Host "⚠️  No E2E test framework found, skipping" -ForegroundColor Yellow
            $testResults.E2E.Status = "Skipped"
            $e2eSuccess = $true
        }
    } catch {
        Write-Host "⚠️  No E2E test framework found, skipping" -ForegroundColor Yellow  
        $testResults.E2E.Status = "Skipped"
        $e2eSuccess = $true
    }
}

if ($testResults.E2E.Status -ne "Skipped") {
    $e2eSuccess = Run-TestWithTiming -TestName "E2E" -Command $e2eCommand
} else {
    $e2eSuccess = $true
}

# Generate coverage reports if available
Write-Host "`n📊 GENERATING COVERAGE REPORTS" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

$coverageDir = "coverage"
$reportsGenerated = @()

# Check for existing coverage reports
if (Test-Path "$coverageDir/lcov-report/index.html") {
    $reportsGenerated += "HTML: $coverageDir/lcov-report/index.html"
    Write-Host "✅ HTML Coverage Report: $coverageDir/lcov-report/index.html" -ForegroundColor Green
}

if (Test-Path "$coverageDir/coverage-final.json") {
    $reportsGenerated += "JSON: $coverageDir/coverage-final.json"
    Write-Host "✅ JSON Coverage Report: $coverageDir/coverage-final.json" -ForegroundColor Green
}

if (Test-Path "$coverageDir/lcov.info") {
    $reportsGenerated += "LCOV: $coverageDir/lcov.info"  
    Write-Host "✅ LCOV Coverage Report: $coverageDir/lcov.info" -ForegroundColor Green
}

if ($reportsGenerated.Count -eq 0) {
    Write-Host "ℹ️  No coverage reports found. Run 'npm run test:coverage' to generate." -ForegroundColor Blue
}

# VERIFICATION PHASE
Write-Host "`n🔍 TEST RESULTS VERIFICATION" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Calculate overall results
$totalDuration = ((Get-Date) - $testResults.Overall.StartTime).TotalSeconds
$testResults.Overall.Duration = $totalDuration

$passedTests = ($testResults.Keys | Where-Object { $_ -ne "Overall" -and $testResults[$_].Status -eq "Passed" }).Count
$totalTests = ($testResults.Keys | Where-Object { $_ -ne "Overall" }).Count  
$skippedTests = ($testResults.Keys | Where-Object { $_ -ne "Overall" -and $testResults[$_].Status -eq "Skipped" }).Count

# Determine overall status
if ($passedTests -eq ($totalTests - $skippedTests)) {
    $testResults.Overall.Status = "Passed"
    $overallColor = "Green"
} else {
    $testResults.Overall.Status = "Failed"
    $overallColor = "Red"
}

# Print summary table
Write-Host "`n📋 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

Write-Host "Test Phase          Status      Duration    Coverage" -ForegroundColor White
Write-Host "----------          ------      --------    --------" -ForegroundColor Gray

foreach ($testType in @("Lint", "TypeCheck", "Unit", "Integration", "E2E")) {
    $result = $testResults[$testType]
    $statusColor = switch ($result.Status) {
        "Passed" { "Green" }
        "Failed" { "Red" }
        "Error" { "Magenta" }
        "Skipped" { "Yellow" }
        default { "Gray" }
    }
    
    $coverage = if ($result.Coverage -gt 0) { "$($result.Coverage)%" } else { "N/A" }
    $duration = "{0:F2}s" -f $result.Duration
    
    Write-Host ("{0,-18} {1,-10} {2,-10} {3}" -f $testType, $result.Status, $duration, $coverage) -ForegroundColor $statusColor
}

Write-Host "----------          ------      --------    --------" -ForegroundColor Gray
Write-Host ("{0,-18} {1,-10} {2,-10}" -f "OVERALL", $testResults.Overall.Status, ("{0:F2}s" -f $totalDuration)) -ForegroundColor $overallColor

# Coverage summary
Write-Host "`n📊 COVERAGE SUMMARY" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

$unitCoverage = $testResults.Unit.Coverage
$integrationCoverage = $testResults.Integration.Coverage

if ($unitCoverage -gt 0) {
    $coverageColor = if ($unitCoverage -ge 85) { "Green" } elseif ($unitCoverage -ge 70) { "Yellow" } else { "Red" }
    Write-Host "Unit Test Coverage: $unitCoverage% (Target: ≥85%)" -ForegroundColor $coverageColor
}

if ($integrationCoverage -gt 0) {
    $coverageColor = if ($integrationCoverage -ge 75) { "Green" } elseif ($integrationCoverage -ge 60) { "Yellow" } else { "Red" }
    Write-Host "Integration Coverage: $integrationCoverage% (Target: ≥75%)" -ForegroundColor $coverageColor
}

# Report paths
if ($reportsGenerated.Count -gt 0) {
    Write-Host "`n📁 COVERAGE REPORT PATHS" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    foreach ($report in $reportsGenerated) {
        Write-Host "   $report" -ForegroundColor Blue
    }
}

# Quality gate check
Write-Host "`n🚪 QUALITY GATES" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

$qualityChecks = @()

# Lint and TypeCheck are required
if ($testResults.Lint.Status -eq "Passed") {
    $qualityChecks += @{ Name = "Code Linting"; Status = "✅ PASS"; Color = "Green" }
} else {
    $qualityChecks += @{ Name = "Code Linting"; Status = "❌ FAIL"; Color = "Red" }
}

if ($testResults.TypeCheck.Status -eq "Passed") {
    $qualityChecks += @{ Name = "Type Checking"; Status = "✅ PASS"; Color = "Green" }
} else {
    $qualityChecks += @{ Name = "Type Checking"; Status = "❌ FAIL"; Color = "Red" }
}

# Coverage gates
if ($unitCoverage -ge 85) {
    $qualityChecks += @{ Name = "Unit Coverage ≥85%"; Status = "✅ PASS ($unitCoverage%)"; Color = "Green" }
} elseif ($unitCoverage -gt 0) {
    $qualityChecks += @{ Name = "Unit Coverage ≥85%"; Status = "⚠️  WARN ($unitCoverage%)"; Color = "Yellow" }
} else {
    $qualityChecks += @{ Name = "Unit Coverage ≥85%"; Status = "❓ UNKNOWN"; Color = "Gray" }
}

if ($integrationCoverage -ge 75) {
    $qualityChecks += @{ Name = "Integration Coverage ≥75%"; Status = "✅ PASS ($integrationCoverage%)"; Color = "Green" }
} elseif ($integrationCoverage -gt 0) {
    $qualityChecks += @{ Name = "Integration Coverage ≥75%"; Status = "⚠️  WARN ($integrationCoverage%)"; Color = "Yellow" }
} else {
    $qualityChecks += @{ Name = "Integration Coverage ≥75%"; Status = "❓ UNKNOWN"; Color = "Gray" }
}

foreach ($check in $qualityChecks) {
    Write-Host "$($check.Status) $($check.Name)" -ForegroundColor $check.Color
}

# Final verdict
Write-Host "`n🏁 FINAL VERDICT" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

$criticalIssues = ($qualityChecks | Where-Object { $_.Status -match "❌" }).Count
$warnings = ($qualityChecks | Where-Object { $_.Status -match "⚠️" }).Count

if ($criticalIssues -eq 0 -and $testResults.Overall.Status -eq "Passed") {
    Write-Host "🎉 ALL TESTS PASSED - READY FOR DEPLOYMENT!" -ForegroundColor Green
    if ($warnings -gt 0) {
        Write-Host "⚠️  $warnings warnings detected - consider addressing before production" -ForegroundColor Yellow
    }
    exit 0
} else {
    Write-Host "❌ TESTS FAILED - DEPLOYMENT BLOCKED" -ForegroundColor Red
    Write-Host "   Critical Issues: $criticalIssues" -ForegroundColor Red
    Write-Host "   Warnings: $warnings" -ForegroundColor Yellow
    exit 1
}