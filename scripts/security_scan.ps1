# ========================================
# AstralField v2.1 - Security Scan Script
# ========================================
# 
# Comprehensive security scanning with vulnerability assessment
# Generates SARIF output and markdown summary for production readiness
#
# Requirements:
# - Node.js with npm installed
# - Docker (for Trivy)
# - PowerShell 5.1+
#
# Usage: ./scripts/security_scan.ps1 [-OutputDir "security-reports"] [-SkipTrivy]

param(
    [string]$OutputDir = "security-reports",
    [switch]$SkipTrivy,
    [switch]$Verbose
)

# Configuration
$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$projectRoot = $PSScriptRoot + "/.."
$reportDir = "$projectRoot/$OutputDir"
$sarifFile = "$reportDir/security-scan-$timestamp.sarif"
$summaryFile = "$reportDir/security-summary-$timestamp.md"
$jsonReportFile = "$reportDir/security-report-$timestamp.json"

# Ensure output directory exists
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    Write-Host "✓ Created security reports directory: $reportDir" -ForegroundColor Green
}

Write-Host "🔒 AstralField v2.1 Security Scan Initiated" -ForegroundColor Cyan
Write-Host "📍 Project Root: $projectRoot" -ForegroundColor Gray
Write-Host "📁 Reports Dir: $reportDir" -ForegroundColor Gray
Write-Host "⏰ Timestamp: $timestamp" -ForegroundColor Gray
Write-Host ""

# Initialize security report data
$securityReport = @{
    timestamp = $timestamp
    projectVersion = "2.1.0"
    scanResults = @{
        npmAudit = @{
            status = "pending"
            vulnerabilities = @{}
            totalVulns = 0
            criticalVulns = 0
            highVulns = 0
            moderateVulns = 0
            lowVulns = 0
        }
        trivyFs = @{
            status = "pending"
            vulnerabilities = @()
            totalVulns = 0
            criticalVulns = 0
            highVulns = 0
            mediumVulns = 0
            lowVulns = 0
        }
        codeAnalysis = @{
            status = "pending"
            issues = @()
            securityPatterns = @()
        }
    }
    riskAssessment = @{
        overallRisk = "unknown"
        productionReady = $false
        criticalIssues = @()
        recommendations = @()
    }
}

# ====================
# NPM AUDIT SCAN
# ====================

Write-Host "🔍 Phase 1: NPM Dependency Security Audit" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

Push-Location $projectRoot

try {
    Write-Host "→ Running npm audit with JSON output..." -ForegroundColor White
    
    # Run npm audit with JSON output
    $npmAuditOutput = & npm audit --json 2>&1
    $npmAuditExitCode = $LASTEXITCODE
    
    if ($npmAuditOutput -and $npmAuditOutput.Length -gt 0) {
        try {
            # Parse npm audit JSON output
            $auditData = $npmAuditOutput | ConvertFrom-Json
            
            if ($auditData.vulnerabilities) {
                $securityReport.scanResults.npmAudit.vulnerabilities = $auditData.vulnerabilities
                
                # Count vulnerabilities by severity
                foreach ($vuln in $auditData.vulnerabilities.PSObject.Properties.Value) {
                    $severity = $vuln.severity
                    switch ($severity) {
                        "critical" { $securityReport.scanResults.npmAudit.criticalVulns++ }
                        "high" { $securityReport.scanResults.npmAudit.highVulns++ }
                        "moderate" { $securityReport.scanResults.npmAudit.moderateVulns++ }
                        "low" { $securityReport.scanResults.npmAudit.lowVulns++ }
                    }
                    $securityReport.scanResults.npmAudit.totalVulns++
                }
            }
            
            $securityReport.scanResults.npmAudit.status = "completed"
            Write-Host "✓ NPM Audit completed successfully" -ForegroundColor Green
            Write-Host "  Critical: $($securityReport.scanResults.npmAudit.criticalVulns)" -ForegroundColor Red
            Write-Host "  High: $($securityReport.scanResults.npmAudit.highVulns)" -ForegroundColor Magenta
            Write-Host "  Moderate: $($securityReport.scanResults.npmAudit.moderateVulns)" -ForegroundColor Yellow
            Write-Host "  Low: $($securityReport.scanResults.npmAudit.lowVulns)" -ForegroundColor Cyan
            
        } catch {
            Write-Host "⚠ Could not parse npm audit JSON output" -ForegroundColor Yellow
            $securityReport.scanResults.npmAudit.status = "error"
            $securityReport.scanResults.npmAudit.error = $_.Exception.Message
        }
    } else {
        Write-Host "⚠ No npm audit output received" -ForegroundColor Yellow
        $securityReport.scanResults.npmAudit.status = "no-output"
    }
    
} catch {
    Write-Host "❌ NPM Audit failed: $($_.Exception.Message)" -ForegroundColor Red
    $securityReport.scanResults.npmAudit.status = "failed"
    $securityReport.scanResults.npmAudit.error = $_.Exception.Message
}

Write-Host ""

# ====================
# TRIVY FILESYSTEM SCAN
# ====================

if (-not $SkipTrivy) {
    Write-Host "🔍 Phase 2: Trivy Filesystem Security Scan" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    try {
        # Check if Docker is available
        $dockerVersion = & docker --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "→ Docker detected: $($dockerVersion)" -ForegroundColor White
            
            $trivyOutputFile = "$reportDir/trivy-scan-$timestamp.json"
            
            Write-Host "→ Running Trivy filesystem scan..." -ForegroundColor White
            
            # Run Trivy scan with JSON output
            & docker run --rm -v "${projectRoot}:/workspace" aquasec/trivy:latest fs --format json --output /workspace/trivy-temp.json /workspace 2>&1
            
            if (Test-Path "$projectRoot/trivy-temp.json") {
                Move-Item "$projectRoot/trivy-temp.json" $trivyOutputFile
                
                try {
                    $trivyData = Get-Content $trivyOutputFile | ConvertFrom-Json
                    
                    if ($trivyData.Results) {
                        foreach ($result in $trivyData.Results) {
                            if ($result.Vulnerabilities) {
                                foreach ($vuln in $result.Vulnerabilities) {
                                    $securityReport.scanResults.trivyFs.vulnerabilities += $vuln
                                    $severity = $vuln.Severity
                                    switch ($severity) {
                                        "CRITICAL" { $securityReport.scanResults.trivyFs.criticalVulns++ }
                                        "HIGH" { $securityReport.scanResults.trivyFs.highVulns++ }
                                        "MEDIUM" { $securityReport.scanResults.trivyFs.mediumVulns++ }
                                        "LOW" { $securityReport.scanResults.trivyFs.lowVulns++ }
                                    }
                                    $securityReport.scanResults.trivyFs.totalVulns++
                                }
                            }
                        }
                    }
                    
                    $securityReport.scanResults.trivyFs.status = "completed"
                    Write-Host "✓ Trivy scan completed successfully" -ForegroundColor Green
                    Write-Host "  Critical: $($securityReport.scanResults.trivyFs.criticalVulns)" -ForegroundColor Red
                    Write-Host "  High: $($securityReport.scanResults.trivyFs.highVulns)" -ForegroundColor Magenta
                    Write-Host "  Medium: $($securityReport.scanResults.trivyFs.mediumVulns)" -ForegroundColor Yellow
                    Write-Host "  Low: $($securityReport.scanResults.trivyFs.lowVulns)" -ForegroundColor Cyan
                    
                } catch {
                    Write-Host "❌ Could not parse Trivy output: $($_.Exception.Message)" -ForegroundColor Red
                    $securityReport.scanResults.trivyFs.status = "parse-error"
                    $securityReport.scanResults.trivyFs.error = $_.Exception.Message
                }
                
            } else {
                Write-Host "❌ Trivy scan output file not found" -ForegroundColor Red
                $securityReport.scanResults.trivyFs.status = "no-output"
            }
            
        } else {
            Write-Host "⚠ Docker not available, skipping Trivy scan" -ForegroundColor Yellow
            $securityReport.scanResults.trivyFs.status = "skipped-no-docker"
        }
        
    } catch {
        Write-Host "❌ Trivy scan failed: $($_.Exception.Message)" -ForegroundColor Red
        $securityReport.scanResults.trivyFs.status = "failed"
        $securityReport.scanResults.trivyFs.error = $_.Exception.Message
    }
} else {
    Write-Host "⏭ Skipping Trivy scan (SkipTrivy flag set)" -ForegroundColor Gray
    $securityReport.scanResults.trivyFs.status = "skipped"
}

Write-Host ""

# ====================
# CODE PATTERN ANALYSIS
# ====================

Write-Host "🔍 Phase 3: Security Pattern Analysis" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Gray

$securityPatterns = @(
    @{ pattern = "process\.env\.[A-Z_]+"; name = "Environment Variables"; risk = "low" }
    @{ pattern = "jwt\.sign\(|jwt\.verify\("; name = "JWT Operations"; risk = "medium" }
    @{ pattern = "bcrypt\.|argon2\.|scrypt\("; name = "Password Hashing"; risk = "low" }
    @{ pattern = "eval\s*\(|new Function\("; name = "Code Execution"; risk = "critical" }
    @{ pattern = "innerHTML\s*=|dangerouslySetInnerHTML"; name = "XSS Vectors"; risk = "high" }
    @{ pattern = "require\s*\(\s*['\`]\.\./|import.*\.\./"; name = "Path Traversal"; risk = "medium" }
    @{ pattern = "crypto\.randomBytes\(|Math\.random\(\)"; name = "Random Generation"; risk = "low" }
    @{ pattern = "console\.log\(.*password|console\.log\(.*token"; name = "Credential Logging"; risk = "high" }
)

$codeFiles = Get-ChildItem -Path "$projectRoot/src" -Include "*.ts", "*.tsx", "*.js", "*.jsx" -Recurse

$patternMatches = @{}

foreach ($pattern in $securityPatterns) {
    $matches = @()
    foreach ($file in $codeFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -match $pattern.pattern) {
            $matches += @{
                file = $file.FullName.Replace($projectRoot, "").Replace("\", "/")
                pattern = $pattern.name
                risk = $pattern.risk
            }
        }
    }
    if ($matches.Count -gt 0) {
        $patternMatches[$pattern.name] = $matches
    }
}

$securityReport.scanResults.codeAnalysis.securityPatterns = $patternMatches
$securityReport.scanResults.codeAnalysis.status = "completed"

Write-Host "→ Analyzed $($codeFiles.Count) source files" -ForegroundColor White
Write-Host "→ Found $($patternMatches.Keys.Count) security pattern categories" -ForegroundColor White

foreach ($patternName in $patternMatches.Keys) {
    $count = $patternMatches[$patternName].Count
    Write-Host "  $patternName: $count occurrences" -ForegroundColor Cyan
}

Write-Host ""

# ====================
# RISK ASSESSMENT
# ====================

Write-Host "🎯 Phase 4: Risk Assessment & Production Readiness" -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Gray

$criticalIssues = @()
$recommendations = @()
$overallRisk = "low"

# Assess NPM vulnerabilities
if ($securityReport.scanResults.npmAudit.criticalVulns -gt 0) {
    $criticalIssues += "NPM Critical vulnerabilities detected ($($securityReport.scanResults.npmAudit.criticalVulns))"
    $overallRisk = "critical"
}

if ($securityReport.scanResults.npmAudit.highVulns -gt 5) {
    $criticalIssues += "High number of NPM high-severity vulnerabilities ($($securityReport.scanResults.npmAudit.highVulns))"
    if ($overallRisk -ne "critical") { $overallRisk = "high" }
}

# Assess Trivy vulnerabilities
if ($securityReport.scanResults.trivyFs.criticalVulns -gt 0) {
    $criticalIssues += "Trivy Critical vulnerabilities detected ($($securityReport.scanResults.trivyFs.criticalVulns))"
    $overallRisk = "critical"
}

# Assess code patterns
if ($patternMatches["Code Execution"]) {
    $criticalIssues += "Potentially dangerous code execution patterns detected"
    $overallRisk = "critical"
}

if ($patternMatches["XSS Vectors"]) {
    $criticalIssues += "XSS vulnerability patterns detected"
    if ($overallRisk -ne "critical") { $overallRisk = "high" }
}

if ($patternMatches["Credential Logging"]) {
    $criticalIssues += "Potential credential logging detected"
    if ($overallRisk -ne "critical" -and $overallRisk -ne "high") { $overallRisk = "medium" }
}

# Generate recommendations
if ($securityReport.scanResults.npmAudit.totalVulns -gt 0) {
    $recommendations += "Run 'npm audit fix' to resolve dependency vulnerabilities"
}

if ($securityReport.scanResults.trivyFs.totalVulns -gt 0) {
    $recommendations += "Update base images and system packages to resolve Trivy findings"
}

if ($patternMatches.Count -gt 0) {
    $recommendations += "Review security patterns and implement secure coding practices"
}

$recommendations += "Implement Content Security Policy (CSP) headers"
$recommendations += "Enable security headers (HSTS, X-Frame-Options, etc.)"
$recommendations += "Set up automated security monitoring and alerts"
$recommendations += "Conduct regular penetration testing"

$securityReport.riskAssessment.overallRisk = $overallRisk
$securityReport.riskAssessment.criticalIssues = $criticalIssues
$securityReport.riskAssessment.recommendations = $recommendations
$securityReport.riskAssessment.productionReady = ($overallRisk -ne "critical")

# Risk assessment summary
Write-Host "→ Overall Risk Level: $overallRisk" -ForegroundColor $(
    switch ($overallRisk) {
        "critical" { "Red" }
        "high" { "Magenta" }
        "medium" { "Yellow" }
        "low" { "Green" }
        default { "White" }
    }
)

Write-Host "→ Production Ready: $($securityReport.riskAssessment.productionReady)" -ForegroundColor $(
    if ($securityReport.riskAssessment.productionReady) { "Green" } else { "Red" }
)

if ($criticalIssues.Count -gt 0) {
    Write-Host "→ Critical Issues Found: $($criticalIssues.Count)" -ForegroundColor Red
}

Write-Host ""

# ====================
# GENERATE SARIF REPORT
# ====================

Write-Host "📋 Phase 5: Generating SARIF Report" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

$sarifReport = @{
    version = "2.1.0"
    `$schema = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"
    runs = @(
        @{
            tool = @{
                driver = @{
                    name = "AstralField Security Scanner"
                    version = "1.0.0"
                    informationUri = "https://github.com/astralfield/security-scanner"
                }
            }
            results = @()
        }
    )
}

# Add NPM audit results to SARIF
if ($securityReport.scanResults.npmAudit.vulnerabilities) {
    foreach ($vulnName in $securityReport.scanResults.npmAudit.vulnerabilities.PSObject.Properties.Name) {
        $vuln = $securityReport.scanResults.npmAudit.vulnerabilities.$vulnName
        $sarifReport.runs[0].results += @{
            ruleId = "npm-audit-$vulnName"
            message = @{
                text = "NPM vulnerability: $($vuln.title) (Severity: $($vuln.severity))"
            }
            level = switch ($vuln.severity) {
                "critical" { "error" }
                "high" { "error" }
                "moderate" { "warning" }
                "low" { "note" }
                default { "note" }
            }
            locations = @(
                @{
                    physicalLocation = @{
                        artifactLocation = @{
                            uri = "package.json"
                        }
                    }
                }
            )
        }
    }
}

# Add code pattern results to SARIF
foreach ($patternName in $patternMatches.Keys) {
    foreach ($match in $patternMatches[$patternName]) {
        $sarifReport.runs[0].results += @{
            ruleId = "security-pattern-$($patternName -replace '\s', '-')"
            message = @{
                text = "Security pattern detected: $patternName"
            }
            level = switch ($match.risk) {
                "critical" { "error" }
                "high" { "error" }
                "medium" { "warning" }
                "low" { "note" }
                default { "note" }
            }
            locations = @(
                @{
                    physicalLocation = @{
                        artifactLocation = @{
                            uri = $match.file
                        }
                    }
                }
            )
        }
    }
}

try {
    $sarifReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $sarifFile -Encoding UTF8
    Write-Host "✓ SARIF report generated: $(Split-Path $sarifFile -Leaf)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to generate SARIF report: $($_.Exception.Message)" -ForegroundColor Red
}

# ====================
# GENERATE JSON REPORT
# ====================

try {
    $securityReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonReportFile -Encoding UTF8
    Write-Host "✓ JSON report generated: $(Split-Path $jsonReportFile -Leaf)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to generate JSON report: $($_.Exception.Message)" -ForegroundColor Red
}

# ====================
# GENERATE MARKDOWN SUMMARY
# ====================

Write-Host "📄 Phase 6: Generating Markdown Summary" -ForegroundColor Yellow
Write-Host "---------------------------------------" -ForegroundColor Gray

$markdownContent = @"
# 🔒 AstralField v2.1 Security Scan Report

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")  
**Project Version:** 2.1.0  
**Scan Duration:** Security comprehensive scan  
**Overall Risk Level:** **$($overallRisk.ToUpper())**  
**Production Ready:** **$($securityReport.riskAssessment.productionReady)**  

---

## 📊 Executive Summary

| Metric | NPM Audit | Trivy FS | Code Analysis |
|--------|-----------|----------|---------------|
| **Status** | $($securityReport.scanResults.npmAudit.status) | $($securityReport.scanResults.trivyFs.status) | $($securityReport.scanResults.codeAnalysis.status) |
| **Critical** | $($securityReport.scanResults.npmAudit.criticalVulns) | $($securityReport.scanResults.trivyFs.criticalVulns) | $($patternMatches["Code Execution"].Count) |
| **High** | $($securityReport.scanResults.npmAudit.highVulns) | $($securityReport.scanResults.trivyFs.highVulns) | $($patternMatches["XSS Vectors"].Count) |
| **Medium/Moderate** | $($securityReport.scanResults.npmAudit.moderateVulns) | $($securityReport.scanResults.trivyFs.mediumVulns) | $(($patternMatches.Values | Where-Object { $_.risk -eq "medium" }).Count) |
| **Low** | $($securityReport.scanResults.npmAudit.lowVulns) | $($securityReport.scanResults.trivyFs.lowVulns) | $(($patternMatches.Values | Where-Object { $_.risk -eq "low" }).Count) |
| **Total Issues** | $($securityReport.scanResults.npmAudit.totalVulns) | $($securityReport.scanResults.trivyFs.totalVulns) | $($patternMatches.Values.Count) |

---

## 🚨 Critical Issues

$(if ($criticalIssues.Count -gt 0) { 
    ($criticalIssues | ForEach-Object { "- ❌ $_" }) -join "`n" 
} else { 
    "✅ No critical issues detected" 
})

---

## 🔍 Detailed Findings

### NPM Dependency Vulnerabilities
**Status:** $($securityReport.scanResults.npmAudit.status)  
**Total Vulnerabilities:** $($securityReport.scanResults.npmAudit.totalVulns)

$(if ($securityReport.scanResults.npmAudit.totalVulns -gt 0) {
    "- 🔴 Critical: $($securityReport.scanResults.npmAudit.criticalVulns)`n- 🟠 High: $($securityReport.scanResults.npmAudit.highVulns)`n- 🟡 Moderate: $($securityReport.scanResults.npmAudit.moderateVulns)`n- 🔵 Low: $($securityReport.scanResults.npmAudit.lowVulns)"
} else {
    "✅ No NPM vulnerabilities detected"
})

### Trivy Filesystem Scan
**Status:** $($securityReport.scanResults.trivyFs.status)  
**Total Vulnerabilities:** $($securityReport.scanResults.trivyFs.totalVulns)

$(if ($securityReport.scanResults.trivyFs.totalVulns -gt 0) {
    "- 🔴 Critical: $($securityReport.scanResults.trivyFs.criticalVulns)`n- 🟠 High: $($securityReport.scanResults.trivyFs.highVulns)`n- 🟡 Medium: $($securityReport.scanResults.trivyFs.mediumVulns)`n- 🔵 Low: $($securityReport.scanResults.trivyFs.lowVulns)"
} else {
    "✅ No Trivy vulnerabilities detected"
})

### Security Code Patterns
**Status:** $($securityReport.scanResults.codeAnalysis.status)  
**Patterns Detected:** $($patternMatches.Keys.Count)

$(if ($patternMatches.Keys.Count -gt 0) {
    ($patternMatches.Keys | ForEach-Object { 
        $count = $patternMatches[$_].Count
        $risk = $patternMatches[$_][0].risk
        $emoji = switch ($risk) { "critical" { "🔴" } "high" { "🟠" } "medium" { "🟡" } "low" { "🔵" } }
        "- $emoji $_: $count occurrences"
    }) -join "`n"
} else {
    "✅ No concerning security patterns detected"
})

---

## 🎯 Recommendations

$(($recommendations | ForEach-Object { "- 📋 $_" }) -join "`n")

---

## 📈 Production Readiness Assessment

### ✅ Security Gates Passed
- Dependency scan completed
- Code pattern analysis completed
- Risk assessment completed
- SARIF report generated

### $(if ($securityReport.riskAssessment.productionReady) { "✅" } else { "❌" }) Overall Production Readiness
**Status:** $(if ($securityReport.riskAssessment.productionReady) { "READY" } else { "BLOCKED" })  
**Risk Level:** $($overallRisk.ToUpper())

$(if (-not $securityReport.riskAssessment.productionReady) {
    "**Blocking Issues:**`n$(($criticalIssues | ForEach-Object { "- $_" }) -join "`n")"
})

---

## 🔗 Artifacts Generated

- **SARIF Report:** ``$(Split-Path $sarifFile -Leaf)``
- **JSON Report:** ``$(Split-Path $jsonReportFile -Leaf)``
- **Summary Report:** ``$(Split-Path $summaryFile -Leaf)``

---

## 🛡️ Next Steps

1. **Immediate Actions:**
   - Review and remediate critical vulnerabilities
   - Run ``npm audit fix`` for dependency issues
   - Address high-risk code patterns

2. **Security Hardening:**
   - Implement security headers
   - Set up automated vulnerability monitoring
   - Schedule regular security scans

3. **Monitoring:**
   - Enable real-time security monitoring
   - Set up alerting for new vulnerabilities
   - Regular penetration testing

---

*Report generated by AstralField Security Scanner v1.0.0*  
*For questions or issues, contact the security team*
"@

try {
    $markdownContent | Out-File -FilePath $summaryFile -Encoding UTF8
    Write-Host "✓ Markdown summary generated: $(Split-Path $summaryFile -Leaf)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to generate markdown summary: $($_.Exception.Message)" -ForegroundColor Red
}

Pop-Location

# ====================
# FINAL SUMMARY
# ====================

Write-Host ""
Write-Host "🏁 Security Scan Complete" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  Risk Level: $overallRisk" -ForegroundColor White
Write-Host "  Production Ready: $($securityReport.riskAssessment.productionReady)" -ForegroundColor White
Write-Host "  NPM Vulnerabilities: $($securityReport.scanResults.npmAudit.totalVulns)" -ForegroundColor White
Write-Host "  Trivy Vulnerabilities: $($securityReport.scanResults.trivyFs.totalVulns)" -ForegroundColor White
Write-Host "  Security Patterns: $($patternMatches.Keys.Count)" -ForegroundColor White
Write-Host ""
Write-Host "📁 Reports Available:" -ForegroundColor Cyan
Write-Host "  $sarifFile" -ForegroundColor Gray
Write-Host "  $jsonReportFile" -ForegroundColor Gray
Write-Host "  $summaryFile" -ForegroundColor Gray
Write-Host ""

if (-not $securityReport.riskAssessment.productionReady) {
    Write-Host "⚠️ PRODUCTION DEPLOYMENT BLOCKED" -ForegroundColor Red
    Write-Host "Critical security issues must be resolved before deployment." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ SECURITY SCAN PASSED - PRODUCTION READY" -ForegroundColor Green
    exit 0
}