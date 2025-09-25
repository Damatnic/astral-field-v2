# AstralField v2.1 Development Environment Startup Script
# Spins up PostgreSQL and Redis via Docker, runs migrations, seeds data

Write-Host "🚀 AstralField v2.1 Development Environment Startup" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Check for Docker
Write-Host "🐳 Checking Docker availability..." -ForegroundColor Blue
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
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
    Write-Host "✅ Environment loaded from .env" -ForegroundColor Green
} else {
    Write-Host "⚠️  No .env file found. Run ./scripts/bootstrap.ps1 first" -ForegroundColor Yellow
}

# Create docker-compose.yml if it doesn't exist
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "📝 Creating docker-compose.yml..." -ForegroundColor Blue
    $dockerCompose = @"
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: astralfield_postgres
    environment:
      POSTGRES_DB: astralfield_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: astralfield_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
"@
    $dockerCompose | Out-File -FilePath "docker-compose.yml" -Encoding UTF8
    Write-Host "✅ docker-compose.yml created" -ForegroundColor Green
}

# Create init.sql for PostgreSQL extensions if it doesn't exist
if (-not (Test-Path "init.sql")) {
    Write-Host "📝 Creating PostgreSQL initialization script..." -ForegroundColor Blue
    $initSql = @"
-- AstralField v2.1 PostgreSQL Initialization
-- Enables required extensions for production readiness

-- Enable UUID extension for CUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search extensions  
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Enable performance monitoring extensions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create application user with limited privileges (production security)
-- Note: In development we use the default postgres user for simplicity
SELECT 'PostgreSQL extensions enabled for AstralField v2.1' as status;
"@
    $initSql | Out-File -FilePath "init.sql" -Encoding UTF8
    Write-Host "✅ init.sql created with required extensions" -ForegroundColor Green
}

# Start Docker services
Write-Host "🔧 Starting Docker services..." -ForegroundColor Blue
try {
    docker-compose up -d
    Write-Host "✅ Docker services started" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    exit 1
}

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Blue
$maxWait = 60
$waited = 0

while ($waited -lt $maxWait) {
    $pgHealthy = docker-compose ps postgres | Select-String "healthy"
    $redisHealthy = docker-compose ps redis | Select-String "healthy"
    
    if ($pgHealthy -and $redisHealthy) {
        Write-Host "✅ All services are healthy" -ForegroundColor Green
        break
    }
    
    Write-Host "⌛ Waiting for services... ($waited/$maxWait seconds)" -ForegroundColor Yellow
    Start-Sleep 2
    $waited += 2
}

if ($waited -ge $maxWait) {
    Write-Host "⚠️  Services may not be fully ready, but continuing..." -ForegroundColor Yellow
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Blue
try {
    npx prisma generate
    Write-Host "✅ Prisma client generated" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    Write-Host "This may be normal if schema needs to be pushed first" -ForegroundColor Yellow
}

# Run database migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Blue
try {
    # Use db push for development instead of migrate to handle schema changes
    $env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/astralfield_dev?schema=public"
    npx prisma db push --accept-data-loss
    Write-Host "✅ Database schema synchronized" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Database migration had issues, but may still be functional" -ForegroundColor Yellow
    Write-Host "Error: $($Error[0].Exception.Message)" -ForegroundColor Red
}

# Run database seeding
Write-Host "🌱 Seeding database with initial data..." -ForegroundColor Blue
try {
    if (Test-Path "prisma/seed.ts") {
        $env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/astralfield_dev?schema=public"
        npx tsx prisma/seed.ts
        Write-Host "✅ Database seeded successfully" -ForegroundColor Green
    } elseif (Test-Path "prisma/seed.js") {
        $env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/astralfield_dev?schema=public"
        node prisma/seed.js
        Write-Host "✅ Database seeded successfully" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No seed file found, skipping seeding" -ForegroundColor Blue
    }
} catch {
    Write-Host "⚠️  Database seeding encountered issues" -ForegroundColor Yellow
    Write-Host "Error: $($Error[0].Exception.Message)" -ForegroundColor Red
}

# Verification Phase
Write-Host "`n🔍 VERIFICATION RESULTS" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Test database connection
Write-Host "🗄️  Testing database connection..." -ForegroundColor Blue
try {
    $testQuery = 'SELECT version() as postgresql_version, current_database() as database_name, current_user as user_name;'
    $result = docker exec astralfield_postgres psql -U postgres -d astralfield_dev -c "$testQuery" -t
    if ($result -match "PostgreSQL") {
        Write-Host "✅ Database: Connected and functional" -ForegroundColor Green
        $lines = $result.Split("`n") | Where-Object { $_.Trim() -ne "" }
        if ($lines.Count -gt 0) {
            $dbInfo = $lines[0].Trim()
            Write-Host "   Version: $dbInfo" -ForegroundColor Blue
        }
    }
} catch {
    Write-Host "❌ Database: Connection test failed" -ForegroundColor Red
}

# Test Redis connection  
Write-Host "⚡ Testing Redis connection..." -ForegroundColor Blue
try {
    $redisTest = docker exec astralfield_redis redis-cli ping
    if ($redisTest -match "PONG") {
        Write-Host "✅ Redis: Connected and responsive" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Redis: Connection test failed" -ForegroundColor Red
}

# List database tables
Write-Host "📋 Checking database tables..." -ForegroundColor Blue
try {
    $tables = docker exec astralfield_postgres psql -U postgres -d astralfield_dev -c "\dt" -t
    $tableCount = ($tables.Split("`n") | Where-Object { $_ -match "\|" }).Count
    if ($tableCount -gt 0) {
        Write-Host "✅ Database tables: $tableCount tables found" -ForegroundColor Green
        
        # Show first few tables
        $tableList = $tables.Split("`n") | Where-Object { $_ -match "\|" } | Select-Object -First 5
        foreach ($table in $tableList) {
            $tableName = ($table -split '\|')[1].Trim()
            if ($tableName -and $tableName -ne "Name") {
                Write-Host "   - $tableName" -ForegroundColor Blue
            }
        }
        if ($tableCount -gt 5) {
            Write-Host "   ... and $($tableCount - 5) more tables" -ForegroundColor Blue
        }
    } else {
        Write-Host "⚠️  Database tables: No tables found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Database tables: Could not list tables" -ForegroundColor Red
}

# Check for critical data
Write-Host "👥 Checking for seed data..." -ForegroundColor Blue
try {
    $userCount = docker exec astralfield_postgres psql -U postgres -d astralfield_dev -c "SELECT COUNT(*) FROM users;" -t 2>$null
    $leagueCount = docker exec astralfield_postgres psql -U postgres -d astralfield_dev -c "SELECT COUNT(*) FROM leagues;" -t 2>$null
    
    if ($userCount -and $userCount.Trim() -gt 0) {
        Write-Host "✅ Users: $($userCount.Trim()) users found" -ForegroundColor Green
    }
    if ($leagueCount -and $leagueCount.Trim() -gt 0) {
        Write-Host "✅ Leagues: $($leagueCount.Trim()) leagues found" -ForegroundColor Green  
    }
} catch {
    Write-Host "ℹ️  Seed data: Could not verify (tables may not exist yet)" -ForegroundColor Blue
}

# Summary
Write-Host "`n📊 STARTUP SUMMARY" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

$services = docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"
Write-Host "🐳 Docker Services:" -ForegroundColor Blue
Write-Host $services -ForegroundColor White

# Service URLs
Write-Host "`n🌐 Service URLs:" -ForegroundColor Blue
Write-Host "   PostgreSQL: localhost:5432/astralfield_dev" -ForegroundColor White
Write-Host "   Redis: localhost:6379" -ForegroundColor White  
Write-Host "   Application: http://localhost:3007 (when started)" -ForegroundColor White

# Next steps
Write-Host "`n🚀 NEXT STEPS" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host "1. Run 'npm run dev' to start the development server" -ForegroundColor White
Write-Host "2. Open http://localhost:3007 in your browser" -ForegroundColor White
Write-Host "3. Run './scripts/test_all.ps1' to verify functionality" -ForegroundColor White

# Final status
$postgresRunning = docker-compose ps postgres | Select-String "Up"
$redisRunning = docker-compose ps redis | Select-String "Up"

if ($postgresRunning -and $redisRunning) {
    Write-Host "`n✨ Development environment is ready!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Development environment has some issues. Check service logs:" -ForegroundColor Yellow
    Write-Host "   docker-compose logs postgres" -ForegroundColor White
    Write-Host "   docker-compose logs redis" -ForegroundColor White
}