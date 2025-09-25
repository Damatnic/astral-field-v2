# AstralField v2.1 Environment Bootstrap Script
# Creates .env from .env.example, generates secrets, verifies services

Write-Host "🚀 AstralField v2.1 Environment Bootstrap" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Function to generate random secrets
function Generate-Secret {
    param([int]$Length = 32)
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $secret = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $secret += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $secret
}

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
    $createNew = Read-Host "Do you want to create a new .env file? (y/N)"
    if ($createNew -ne "y" -and $createNew -ne "Y") {
        Write-Host "Using existing .env file" -ForegroundColor Yellow
        $useExisting = $true
    }
}

if (-not $useExisting) {
    Write-Host "📝 Creating .env from template..." -ForegroundColor Blue
    
    # Create .env.example if it doesn't exist
    if (-not (Test-Path ".env.example")) {
        Write-Host "📋 Creating .env.example template..." -ForegroundColor Blue
        $envTemplate = @"
# AstralField v2.1 Environment Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/astralfield_dev?schema=public"

# Authentication Secrets
NEXTAUTH_URL="http://localhost:3007"
NEXTAUTH_SECRET="your-nextauth-secret-here"
JWT_SECRET="your-jwt-secret-here"

# Redis Cache
REDIS_URL="redis://localhost:6379"

# External API Keys (Optional - fallback to cached data if not provided)
ESPN_API_KEY=""
SLEEPER_API_KEY=""

# Application Configuration  
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3007"
NEXT_PUBLIC_APP_NAME="AstralField"

# Monitoring (Optional)
SENTRY_DSN=""
ANALYTICS_ID=""

# Email Configuration (Optional)
EMAIL_SERVER_HOST=""
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM=""

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_FEATURES="true"
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS="true"
NEXT_PUBLIC_ENABLE_OFFLINE_MODE="true"
"@
        $envTemplate | Out-File -FilePath ".env.example" -Encoding UTF8
    }
    
    # Generate secrets and create .env
    Write-Host "🔑 Generating secure secrets..." -ForegroundColor Blue
    
    $nextauthSecret = Generate-Secret -Length 32
    $jwtSecret = Generate-Secret -Length 64
    
    # Read template and replace secrets
    $envContent = Get-Content ".env.example" -Raw
    $envContent = $envContent -replace "your-nextauth-secret-here", $nextauthSecret
    $envContent = $envContent -replace "your-jwt-secret-here", $jwtSecret
    $envContent = $envContent -replace "Generated: .*", "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    # Write to .env
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "✅ .env file created successfully" -ForegroundColor Green
}

# Load environment variables
Write-Host "📖 Loading environment variables..." -ForegroundColor Blue
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim('"')
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Verification Phase
Write-Host "`n🔍 VERIFICATION RESULTS" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Detect and verify services
$services = @{}

# Database URL verification
$databaseUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL")
if ($databaseUrl) {
    if ($databaseUrl -match "postgresql://.*?:.*?@(.*?):(.*?)/(.*?)\?") {
        $services.Database = @{
            Type = "PostgreSQL"
            Host = $matches[1]
            Port = $matches[2]  
            Name = $matches[3]
            Status = "Configured"
        }
        Write-Host "✅ Database: PostgreSQL at $($matches[1]):$($matches[2])/$($matches[3])" -ForegroundColor Green
    }
} else {
    $services.Database = @{ Status = "Not Configured" }
    Write-Host "⚠️  Database: Not configured" -ForegroundColor Yellow
}

# Redis URL verification  
$redisUrl = [System.Environment]::GetEnvironmentVariable("REDIS_URL")
if ($redisUrl) {
    if ($redisUrl -match "redis://([^:]+):?(\d+)?") {
        $redisHost = $matches[1]
        $redisPort = if ($matches[2]) { $matches[2] } else { "6379" }
        $services.Redis = @{
            Type = "Redis"  
            Host = $redisHost
            Port = $redisPort
            Status = "Configured"
        }
        Write-Host "✅ Redis: $redisHost:$redisPort" -ForegroundColor Green
    }
} else {
    $services.Redis = @{ Status = "Not Configured" }
    Write-Host "⚠️  Redis: Not configured" -ForegroundColor Yellow
}

# Authentication secrets verification
$nextauthSecret = [System.Environment]::GetEnvironmentVariable("NEXTAUTH_SECRET")
$jwtSecret = [System.Environment]::GetEnvironmentVariable("JWT_SECRET")

if ($nextauthSecret -and $nextauthSecret.Length -ge 32) {
    $services.NextAuthSecret = @{
        Length = $nextauthSecret.Length
        Hash = (Get-FileHash -InputStream ([System.IO.MemoryStream]::new([System.Text.Encoding]::UTF8.GetBytes($nextauthSecret))) -Algorithm MD5).Hash.Substring(0, 8)
        Status = "Secure"
    }
    Write-Host "✅ NextAuth Secret: $($nextauthSecret.Length) chars (hash: $($services.NextAuthSecret.Hash)...)" -ForegroundColor Green
} else {
    $services.NextAuthSecret = @{ Status = "Weak or Missing" }
    Write-Host "⚠️  NextAuth Secret: Weak or missing" -ForegroundColor Yellow
}

if ($jwtSecret -and $jwtSecret.Length -ge 32) {
    $services.JWTSecret = @{
        Length = $jwtSecret.Length
        Hash = (Get-FileHash -InputStream ([System.IO.MemoryStream]::new([System.Text.Encoding]::UTF8.GetBytes($jwtSecret))) -Algorithm MD5).Hash.Substring(0, 8)
        Status = "Secure"  
    }
    Write-Host "✅ JWT Secret: $($jwtSecret.Length) chars (hash: $($services.JWTSecret.Hash)...)" -ForegroundColor Green
} else {
    $services.JWTSecret = @{ Status = "Weak or Missing" }
    Write-Host "⚠️  JWT Secret: Weak or missing" -ForegroundColor Yellow
}

# External API keys verification
$espnKey = [System.Environment]::GetEnvironmentVariable("ESPN_API_KEY")
$sleeperKey = [System.Environment]::GetEnvironmentVariable("SLEEPER_API_KEY")

$services.ExternalAPIs = @{
    ESPN = if ($espnKey) { "Configured" } else { "Not Configured (Will use cached data)" }
    Sleeper = if ($sleeperKey) { "Configured" } else { "Not Configured (Will use cached data)" }
}

Write-Host "ℹ️  ESPN API: $($services.ExternalAPIs.ESPN)" -ForegroundColor Blue
Write-Host "ℹ️  Sleeper API: $($services.ExternalAPIs.Sleeper)" -ForegroundColor Blue

# Feature flags verification
$aiFeatures = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_ENABLE_AI_FEATURES")
$pushNotifications = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS")  
$offlineMode = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_ENABLE_OFFLINE_MODE")

$services.FeatureFlags = @{
    AI = $aiFeatures
    PushNotifications = $pushNotifications
    OfflineMode = $offlineMode
}

Write-Host "🎛️  Feature Flags:" -ForegroundColor Blue
Write-Host "   AI Features: $aiFeatures" -ForegroundColor Blue
Write-Host "   Push Notifications: $pushNotifications" -ForegroundColor Blue  
Write-Host "   Offline Mode: $offlineMode" -ForegroundColor Blue

# Summary
Write-Host "`n📊 BOOTSTRAP SUMMARY" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

$configuredServices = ($services.GetEnumerator() | Where-Object { $_.Value.Status -eq "Configured" -or $_.Value.Status -eq "Secure" }).Count
$totalServices = $services.Keys.Count

Write-Host "✅ Environment file: Created/Updated" -ForegroundColor Green
Write-Host "🔑 Secrets generated: $($services.NextAuthSecret.Status), $($services.JWTSecret.Status)" -ForegroundColor Green
Write-Host "📡 Services configured: $configuredServices/$totalServices" -ForegroundColor Blue
Write-Host "🎯 Ready for development: $(if ($configuredServices -ge 4) { 'YES' } else { 'PARTIAL - Some services need configuration' })" -ForegroundColor $(if ($configuredServices -ge 4) { 'Green' } else { 'Yellow' })

# Next steps
Write-Host "`n🚀 NEXT STEPS" -ForegroundColor Cyan  
Write-Host "============" -ForegroundColor Cyan
Write-Host "1. Run 'npm install' to install dependencies" -ForegroundColor White
Write-Host "2. Run './scripts/dev_up.ps1' to start services" -ForegroundColor White
Write-Host "3. Run 'npm run dev' to start the development server" -ForegroundColor White

Write-Host "`n✨ Bootstrap completed successfully!" -ForegroundColor Green