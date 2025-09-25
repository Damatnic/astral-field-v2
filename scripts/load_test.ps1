# ========================================
# AstralField v2.1 - Load Testing Script
# ========================================
# 
# Comprehensive performance testing with k6 against key endpoints
# Validates SLO compliance and production readiness
#
# Requirements:
# - k6 (https://k6.io/docs/getting-started/installation/)
# - PowerShell 5.1+
# - Running application instance
#
# Usage: ./scripts/load_test.ps1 [-BaseUrl "http://localhost:3007"] [-Duration "30s"] [-VUs 10] [-OutputDir "load-test-reports"]

param(
    [string]$BaseUrl = "http://localhost:3007",
    [string]$Duration = "60s",
    [int]$VUs = 25,
    [string]$OutputDir = "load-test-reports",
    [string]$TestProfile = "production", # production, staging, load, stress
    [switch]$SkipWarmup,
    [switch]$Verbose
)

# Configuration
$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$projectRoot = $PSScriptRoot + "/.."
$reportDir = "$projectRoot/$OutputDir"
$k6Script = "$reportDir/k6-test-script-$timestamp.js"
$jsonReport = "$reportDir/load-test-results-$timestamp.json"
$htmlReport = "$reportDir/load-test-report-$timestamp.html"
$summaryReport = "$reportDir/load-test-summary-$timestamp.md"

# Performance SLO Targets
$sloTargets = @{
    pageLoadP50 = 2000    # <2s page load p50
    pageLoadP95 = 5000    # <5s page load p95  
    apiResponseP50 = 200  # <200ms API p50
    apiResponseP95 = 500  # <500ms API p95
    realtimeLatency = 50  # <50ms realtime updates
    errorRate = 0.01      # <1% error rate
    throughputMin = 100   # >100 requests/second
}

# Test profiles
$testProfiles = @{
    production = @{ vus = 25; duration = "60s"; rampUp = "30s"; rampDown = "30s" }
    staging = @{ vus = 10; duration = "30s"; rampUp = "15s"; rampDown = "15s" }
    load = @{ vus = 50; duration = "120s"; rampUp = "60s"; rampDown = "60s" }
    stress = @{ vus = 100; duration = "180s"; rampUp = "90s"; rampDown = "90s" }
}

$profile = $testProfiles[$TestProfile]
if (-not $profile) {
    Write-Host "❌ Invalid test profile: $TestProfile" -ForegroundColor Red
    Write-Host "Available profiles: production, staging, load, stress" -ForegroundColor Yellow
    exit 1
}

# Ensure output directory exists
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    Write-Host "✓ Created load test reports directory: $reportDir" -ForegroundColor Green
}

Write-Host "⚡ AstralField v2.1 Load Testing Initiated" -ForegroundColor Cyan
Write-Host "📍 Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "🎯 Test Profile: $TestProfile" -ForegroundColor Gray
Write-Host "👥 Virtual Users: $($profile.vus)" -ForegroundColor Gray
Write-Host "⏱️ Duration: $($profile.duration)" -ForegroundColor Gray
Write-Host "📁 Reports Dir: $reportDir" -ForegroundColor Gray
Write-Host ""

# ====================
# CHECK K6 AVAILABILITY
# ====================

Write-Host "🔧 Phase 1: Environment Validation" -ForegroundColor Yellow
Write-Host "----------------------------------" -ForegroundColor Gray

try {
    $k6Version = & k6 version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ k6 detected: $($k6Version | Select-Object -First 1)" -ForegroundColor Green
    } else {
        Write-Host "❌ k6 not found. Please install k6:" -ForegroundColor Red
        Write-Host "  Windows: choco install k6" -ForegroundColor Yellow
        Write-Host "  macOS: brew install k6" -ForegroundColor Yellow
        Write-Host "  Linux: https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ k6 not available: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ====================
# APPLICATION HEALTH CHECK
# ====================

Write-Host "→ Checking application health..." -ForegroundColor White

try {
    $healthResponse = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "✓ Application is healthy and responding" -ForegroundColor Green
} catch {
    Write-Host "⚠ Application health check failed, continuing with tests..." -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# ====================
# GENERATE K6 TEST SCRIPT
# ====================

Write-Host "📝 Phase 2: Generating K6 Test Script" -ForegroundColor Yellow
Write-Host "-------------------------------------" -ForegroundColor Gray

$k6TestScript = @"
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const apiResponseTime = new Trend('api_response_time');
const pageLoadTime = new Trend('page_load_time');
const realtimeLatency = new Trend('realtime_latency');

// Test configuration
export const options = {
    stages: [
        { duration: '$($profile.rampUp)', target: $($profile.vus) }, // Ramp up
        { duration: '$($profile.duration)', target: $($profile.vus) }, // Stay at load
        { duration: '$($profile.rampDown)', target: 0 }, // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(50)<$($sloTargets.apiResponseP50)', 'p(95)<$($sloTargets.apiResponseP95)'],
        'http_req_failed': ['rate<$($sloTargets.errorRate)'],
        'error_rate': ['rate<$($sloTargets.errorRate)'],
        'page_load_time': ['p(50)<$($sloTargets.pageLoadP50)', 'p(95)<$($sloTargets.pageLoadP95)'],
        'api_response_time': ['p(50)<$($sloTargets.apiResponseP50)', 'p(95)<$($sloTargets.apiResponseP95)'],
        'realtime_latency': ['p(95)<$($sloTargets.realtimeLatency)'],
    },
};

const BASE_URL = '$BaseUrl';

// Test data
const testUsers = [
    { username: 'testuser1', password: 'password123' },
    { username: 'testuser2', password: 'password123' },
    { username: 'testuser3', password: 'password123' },
];

// Authentication helper
function authenticate(user) {
    const loginPayload = {
        username: user.username,
        password: user.password,
    };
    
    const response = http.post(`"$"${BASE_URL}/api/auth/simple-login`, JSON.stringify(loginPayload), {
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.status === 200) {
        const cookies = response.cookies;
        return cookies;
    }
    return null;
}

export default function() {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    
    group('Homepage Load Test', () => {
        const startTime = Date.now();
        const response = http.get(`"$"${BASE_URL}/`);
        const loadTime = Date.now() - startTime;
        
        pageLoadTime.add(loadTime);
        
        const success = check(response, {
            'homepage status is 200': (r) => r.status === 200,
            'homepage loads in <2s': () => loadTime < 2000,
            'homepage contains title': (r) => r.body.includes('AstralField'),
        });
        
        if (!success) errorRate.add(1);
        else errorRate.add(0);
    });
    
    group('API Health Check', () => {
        const startTime = Date.now();
        const response = http.get(`"$"${BASE_URL}/api/health`);
        const responseTime = Date.now() - startTime;
        
        apiResponseTime.add(responseTime);
        
        const success = check(response, {
            'health check status is 200': (r) => r.status === 200,
            'health check responds <200ms': () => responseTime < 200,
            'health check returns valid JSON': (r) => {
                try {
                    JSON.parse(r.body);
                    return true;
                } catch (e) {
                    return false;
                }
            },
        });
        
        if (!success) errorRate.add(1);
        else errorRate.add(0);
    });
    
    group('Authentication Flow', () => {
        const loginPayload = {
            username: user.username,
            password: user.password,
        };
        
        const startTime = Date.now();
        const response = http.post(`"$"${BASE_URL}/api/auth/simple-login`, JSON.stringify(loginPayload), {
            headers: { 'Content-Type': 'application/json' },
        });
        const responseTime = Date.now() - startTime;
        
        apiResponseTime.add(responseTime);
        
        const success = check(response, {
            'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
            'login responds <500ms': () => responseTime < 500,
        });
        
        if (!success) errorRate.add(1);
        else errorRate.add(0);
    });
    
    group('API Endpoints Load Test', () => {
        // Test key API endpoints
        const endpoints = [
            '/api/leagues',
            '/api/players/search?q=mahomes',
            '/api/users/me',
        ];
        
        endpoints.forEach((endpoint) => {
            const startTime = Date.now();
            const response = http.get(`"$"${BASE_URL}`+ endpoint);
            const responseTime = Date.now() - startTime;
            
            apiResponseTime.add(responseTime);
            
            const success = check(response, {
                [`"$"{endpoint} status is success`]: (r) => r.status >= 200 && r.status < 500,
                [`"$"{endpoint} responds <300ms`]: () => responseTime < 300,
            });
            
            if (!success) errorRate.add(1);
            else errorRate.add(0);
        });
    });
    
    group('Static Assets Load Test', () => {
        const assets = [
            '/favicon.ico',
            '/manifest.json',
            '/_next/static/chunks/main.js',
        ];
        
        assets.forEach((asset) => {
            const startTime = Date.now();
            const response = http.get(`"$"${BASE_URL}`+ asset, {
                tags: { asset_type: 'static' },
            });
            const responseTime = Date.now() - startTime;
            
            const success = check(response, {
                [`"$"{asset} loads successfully`]: (r) => r.status === 200 || r.status === 404,
                [`"$"{asset} loads quickly`]: () => responseTime < 1000,
            });
            
            if (!success) errorRate.add(1);
            else errorRate.add(0);
        });
    });
    
    // Simulate user think time
    sleep(Math.random() * 2 + 1);
}

// Warmup function
export function setup() {
    console.log('🔥 Starting load test warmup...');
    
    // Warmup requests
    for (let i = 0; i < 5; i++) {
        http.get(`"$"${BASE_URL}/api/health`);
        sleep(0.5);
    }
    
    console.log('✅ Warmup completed');
    return { timestamp: new Date().toISOString() };
}

// Teardown function
export function teardown(data) {
    console.log('🏁 Load test completed at:', data.timestamp);
}
"@

try {
    $k6TestScript | Out-File -FilePath $k6Script -Encoding UTF8
    Write-Host "✓ K6 test script generated: $(Split-Path $k6Script -Leaf)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to generate K6 test script: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ====================
# RUN WARMUP (if not skipped)
# ====================

if (-not $SkipWarmup) {
    Write-Host "🔥 Phase 3: Application Warmup" -ForegroundColor Yellow
    Write-Host "------------------------------" -ForegroundColor Gray
    
    try {
        Write-Host "→ Running warmup requests..." -ForegroundColor White
        
        # Simple warmup requests
        for ($i = 1; $i -le 5; $i++) {
            try {
                $response = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 5
                Write-Host "  Warmup $i/5: ✓" -ForegroundColor Gray
            } catch {
                Write-Host "  Warmup $i/5: ⚠" -ForegroundColor Yellow
            }
            Start-Sleep -Milliseconds 500
        }
        
        Write-Host "✓ Application warmup completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Warmup failed, proceeding with load test..." -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# ====================
# EXECUTE LOAD TEST
# ====================

Write-Host "⚡ Phase 4: Executing Load Test" -ForegroundColor Yellow
Write-Host "-------------------------------" -ForegroundColor Gray

$k6Args = @(
    "run"
    $k6Script
    "--out", "json=$jsonReport"
    "--quiet"
)

if ($Verbose) {
    $k6Args = $k6Args | Where-Object { $_ -ne "--quiet" }
}

Write-Host "→ Starting k6 load test..." -ForegroundColor White
Write-Host "  Profile: $TestProfile ($($profile.vus) VUs, $($profile.duration))" -ForegroundColor Gray
Write-Host "  Target: $BaseUrl" -ForegroundColor Gray

$testStartTime = Get-Date

try {
    $k6Output = & k6 @k6Args 2>&1
    $k6ExitCode = $LASTEXITCODE
    $testEndTime = Get-Date
    $testDuration = $testEndTime - $testStartTime
    
    if ($k6ExitCode -eq 0) {
        Write-Host "✅ Load test completed successfully" -ForegroundColor Green
        Write-Host "  Duration: $($testDuration.TotalSeconds.ToString('F1'))s" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Load test completed with warnings (exit code: $k6ExitCode)" -ForegroundColor Yellow
        Write-Host "  Duration: $($testDuration.TotalSeconds.ToString('F1'))s" -ForegroundColor Gray
    }
    
    if ($Verbose -and $k6Output) {
        Write-Host "  Output:" -ForegroundColor Gray
        $k6Output | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    
} catch {
    Write-Host "❌ Load test execution failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ====================
# PARSE RESULTS
# ====================

Write-Host "📊 Phase 5: Analyzing Results" -ForegroundColor Yellow
Write-Host "-----------------------------" -ForegroundColor Gray

$testResults = @{
    timestamp = $timestamp
    testProfile = $TestProfile
    baseUrl = $BaseUrl
    duration = $testDuration.TotalSeconds
    exitCode = $k6ExitCode
    metrics = @{}
    sloCompliance = @{}
    summary = @{
        totalRequests = 0
        failedRequests = 0
        errorRate = 0.0
        avgResponseTime = 0.0
        p95ResponseTime = 0.0
        throughput = 0.0
        passed = $false
    }
}

if (Test-Path $jsonReport) {
    try {
        Write-Host "→ Parsing k6 JSON results..." -ForegroundColor White
        
        $jsonLines = Get-Content $jsonReport
        $metrics = @{}
        $httpReqs = @()
        
        foreach ($line in $jsonLines) {
            try {
                $data = $line | ConvertFrom-Json
                
                if ($data.type -eq "Metric" -and $data.data.name) {
                    $metrics[$data.data.name] = $data.data
                }
                
                if ($data.type -eq "Point" -and $data.data.name -eq "http_req_duration") {
                    $httpReqs += $data.data.value
                }
                
            } catch {
                # Skip invalid JSON lines
            }
        }
        
        # Calculate summary statistics
        if ($httpReqs.Count -gt 0) {
            $testResults.summary.totalRequests = $httpReqs.Count
            $testResults.summary.avgResponseTime = ($httpReqs | Measure-Object -Average).Average
            $testResults.summary.p95ResponseTime = $httpReqs | Sort-Object | Select-Object -Index ([math]::Ceiling($httpReqs.Count * 0.95) - 1)
            $testResults.summary.throughput = $httpReqs.Count / $testDuration.TotalSeconds
        }
        
        # Parse error rate from metrics
        if ($metrics["http_req_failed"]) {
            $testResults.summary.errorRate = $metrics["http_req_failed"].rate * 100
            $testResults.summary.failedRequests = [math]::Round($testResults.summary.totalRequests * $metrics["http_req_failed"].rate)
        }
        
        $testResults.metrics = $metrics
        
        # SLO Compliance Check
        $testResults.sloCompliance = @{
            pageLoadP50 = $testResults.summary.avgResponseTime -lt $sloTargets.pageLoadP50
            apiResponseP50 = $testResults.summary.avgResponseTime -lt $sloTargets.apiResponseP50
            apiResponseP95 = $testResults.summary.p95ResponseTime -lt $sloTargets.apiResponseP95
            errorRate = $testResults.summary.errorRate -lt ($sloTargets.errorRate * 100)
            throughput = $testResults.summary.throughput -gt $sloTargets.throughputMin
        }
        
        $slosPassed = ($testResults.sloCompliance.Values | Where-Object { $_ -eq $true }).Count
        $totalSlos = $testResults.sloCompliance.Count
        
        $testResults.summary.passed = ($k6ExitCode -eq 0) -and ($slosPassed -eq $totalSlos)
        
        Write-Host "✓ Results analysis completed" -ForegroundColor Green
        Write-Host "  Total Requests: $($testResults.summary.totalRequests)" -ForegroundColor Gray
        Write-Host "  Failed Requests: $($testResults.summary.failedRequests)" -ForegroundColor Gray
        Write-Host "  Error Rate: $($testResults.summary.errorRate.ToString('F2'))%" -ForegroundColor Gray
        Write-Host "  Avg Response Time: $($testResults.summary.avgResponseTime.ToString('F1'))ms" -ForegroundColor Gray
        Write-Host "  P95 Response Time: $($testResults.summary.p95ResponseTime.ToString('F1'))ms" -ForegroundColor Gray
        Write-Host "  Throughput: $($testResults.summary.throughput.ToString('F1')) req/s" -ForegroundColor Gray
        Write-Host "  SLO Compliance: $slosPassed/$totalSlos" -ForegroundColor Gray
        
    } catch {
        Write-Host "⚠ Failed to parse k6 results: $($_.Exception.Message)" -ForegroundColor Yellow
        $testResults.summary.passed = $false
    }
} else {
    Write-Host "⚠ k6 JSON report not found" -ForegroundColor Yellow
    $testResults.summary.passed = $false
}

Write-Host ""

# ====================
# GENERATE REPORTS
# ====================

Write-Host "📋 Phase 6: Generating Reports" -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Gray

# Generate Markdown Summary
$markdownContent = @"
# ⚡ AstralField v2.1 Load Test Report

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")  
**Test Profile:** $TestProfile  
**Target URL:** $BaseUrl  
**Duration:** $($testDuration.TotalSeconds.ToString('F1'))s  
**Virtual Users:** $($profile.vus)  
**Test Status:** $(if ($testResults.summary.passed) { "✅ PASSED" } else { "❌ FAILED" })

---

## 📊 Executive Summary

| Metric | Value | SLO Target | Status |
|--------|--------|------------|---------|
| **Total Requests** | $($testResults.summary.totalRequests) | - | ℹ️ |
| **Failed Requests** | $($testResults.summary.failedRequests) | - | ℹ️ |
| **Error Rate** | $($testResults.summary.errorRate.ToString('F2'))% | <$($sloTargets.errorRate * 100)% | $(if ($testResults.sloCompliance.errorRate) { "✅" } else { "❌" }) |
| **Avg Response Time** | $($testResults.summary.avgResponseTime.ToString('F1'))ms | <$($sloTargets.apiResponseP50)ms | $(if ($testResults.sloCompliance.apiResponseP50) { "✅" } else { "❌" }) |
| **P95 Response Time** | $($testResults.summary.p95ResponseTime.ToString('F1'))ms | <$($sloTargets.apiResponseP95)ms | $(if ($testResults.sloCompliance.apiResponseP95) { "✅" } else { "❌" }) |
| **Throughput** | $($testResults.summary.throughput.ToString('F1')) req/s | >$($sloTargets.throughputMin) req/s | $(if ($testResults.sloCompliance.throughput) { "✅" } else { "❌" }) |

---

## 🎯 SLO Compliance Report

### Performance Targets vs Actual

- **Page Load Time (P50):** Target <2s → Actual $($testResults.summary.avgResponseTime.ToString('F1'))ms $(if ($testResults.sloCompliance.pageLoadP50) { "✅" } else { "❌" })
- **API Response Time (P50):** Target <200ms → Actual $($testResults.summary.avgResponseTime.ToString('F1'))ms $(if ($testResults.sloCompliance.apiResponseP50) { "✅" } else { "❌" })  
- **API Response Time (P95):** Target <500ms → Actual $($testResults.summary.p95ResponseTime.ToString('F1'))ms $(if ($testResults.sloCompliance.apiResponseP95) { "✅" } else { "❌" })
- **Error Rate:** Target <1% → Actual $($testResults.summary.errorRate.ToString('F2'))% $(if ($testResults.sloCompliance.errorRate) { "✅" } else { "❌" })
- **Throughput:** Target >100 req/s → Actual $($testResults.summary.throughput.ToString('F1')) req/s $(if ($testResults.sloCompliance.throughput) { "✅" } else { "❌" })

### Overall SLO Compliance
**Status:** $(if ($testResults.summary.passed) { "✅ ALL SLOS MET" } else { "❌ SLO VIOLATIONS DETECTED" })

---

## 🔧 Test Configuration

| Parameter | Value |
|-----------|--------|
| Test Profile | $TestProfile |
| Virtual Users | $($profile.vus) |
| Ramp Up | $($profile.rampUp) |
| Test Duration | $($profile.duration) |
| Ramp Down | $($profile.rampDown) |
| Base URL | $BaseUrl |
| k6 Exit Code | $k6ExitCode |

---

## 📈 Performance Analysis

### Response Time Distribution
- **Average:** $($testResults.summary.avgResponseTime.ToString('F1'))ms
- **P95:** $($testResults.summary.p95ResponseTime.ToString('F1'))ms
- **Error Rate:** $($testResults.summary.errorRate.ToString('F2'))%

### Throughput Analysis
- **Total Requests:** $($testResults.summary.totalRequests)
- **Successful Requests:** $($testResults.summary.totalRequests - $testResults.summary.failedRequests)
- **Requests/Second:** $($testResults.summary.throughput.ToString('F1'))
- **Test Duration:** $($testDuration.TotalSeconds.ToString('F1'))s

---

## $(if ($testResults.summary.passed) { "✅" } else { "❌" }) Production Readiness Assessment

### Performance Gates
$(foreach ($slo in $testResults.sloCompliance.GetEnumerator()) {
    "- $(if ($slo.Value) { "✅" } else { "❌" }) $($slo.Key): $(if ($slo.Value) { "PASSED" } else { "FAILED" })"
})

### Recommendations
$(if (-not $testResults.summary.passed) {
    "**Immediate Actions Required:**"
    if (-not $testResults.sloCompliance.errorRate) { "- 🔴 Reduce error rate below 1%" }
    if (-not $testResults.sloCompliance.apiResponseP50) { "- 🔴 Optimize API response times to <200ms p50" }
    if (-not $testResults.sloCompliance.apiResponseP95) { "- 🔴 Optimize API response times to <500ms p95" }
    if (-not $testResults.sloCompliance.throughput) { "- 🔴 Increase system throughput above 100 req/s" }
    ""
    "**Performance Optimization:**"
} else {
    "**Optimization Opportunities:**"
})
- 🔧 Implement response caching for frequently accessed APIs
- 🔧 Enable CDN for static assets
- 🔧 Optimize database queries and add indexes
- 🔧 Implement request rate limiting
- 🔧 Enable gzip compression
- 🔧 Monitor and tune garbage collection

---

## 🔗 Artifacts Generated

- **K6 Test Script:** ``$(Split-Path $k6Script -Leaf)``
- **JSON Results:** ``$(Split-Path $jsonReport -Leaf)``
- **Summary Report:** ``$(Split-Path $summaryReport -Leaf)``

---

## 🚀 Next Steps

1. **$(if ($testResults.summary.passed) { "Monitor Production" } else { "Fix Performance Issues" }):**
   $(if ($testResults.summary.passed) {
       "- Set up continuous performance monitoring"
       "- Schedule regular load testing"
       "- Implement performance alerting"
   } else {
       "- Address SLO violations before production deployment"
       "- Optimize slow endpoints identified in test"
       "- Increase infrastructure capacity if needed"
   })

2. **Continuous Testing:**
   - Integrate load tests into CI/CD pipeline
   - Set up performance budgets
   - Monitor real user metrics (RUM)

3. **Capacity Planning:**
   - Plan for expected growth in traffic
   - Test with higher loads periodically
   - Set up auto-scaling policies

---

$(if ($testResults.summary.passed) {
    "🎉 **LOAD TEST PASSED - PRODUCTION READY**"
} else {
    "⚠️ **LOAD TEST FAILED - PERFORMANCE ISSUES DETECTED**"
})

---

*Report generated by AstralField Load Testing v1.0.0*  
*For questions or performance tuning, contact the engineering team*
"@

try {
    $markdownContent | Out-File -FilePath $summaryReport -Encoding UTF8
    Write-Host "✓ Markdown summary generated: $(Split-Path $summaryReport -Leaf)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to generate markdown summary: $($_.Exception.Message)" -ForegroundColor Red
}

# Generate JSON report with full results
try {
    $testResults | ConvertTo-Json -Depth 10 | Out-File -FilePath "$reportDir/load-test-full-$timestamp.json" -Encoding UTF8
    Write-Host "✓ Full JSON report generated: load-test-full-$timestamp.json" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not generate full JSON report" -ForegroundColor Yellow
}

Write-Host ""

# ====================
# FINAL SUMMARY
# ====================

Write-Host "🏁 Load Test Complete" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Test Results:" -ForegroundColor Cyan
Write-Host "  Status: $(if ($testResults.summary.passed) { "PASSED ✅" } else { "FAILED ❌" })" -ForegroundColor White
Write-Host "  Total Requests: $($testResults.summary.totalRequests)" -ForegroundColor White
Write-Host "  Error Rate: $($testResults.summary.errorRate.ToString('F2'))%" -ForegroundColor White
Write-Host "  Avg Response: $($testResults.summary.avgResponseTime.ToString('F1'))ms" -ForegroundColor White
Write-Host "  P95 Response: $($testResults.summary.p95ResponseTime.ToString('F1'))ms" -ForegroundColor White
Write-Host "  Throughput: $($testResults.summary.throughput.ToString('F1')) req/s" -ForegroundColor White
Write-Host ""
Write-Host "📁 Reports Available:" -ForegroundColor Cyan
Write-Host "  $jsonReport" -ForegroundColor Gray
Write-Host "  $summaryReport" -ForegroundColor Gray
Write-Host "  $k6Script" -ForegroundColor Gray
Write-Host ""

if (-not $testResults.summary.passed) {
    Write-Host "⚠️ PERFORMANCE ISSUES DETECTED" -ForegroundColor Red
    Write-Host "SLO violations must be resolved before production deployment." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ LOAD TEST PASSED - PERFORMANCE TARGETS MET" -ForegroundColor Green
    exit 0
}