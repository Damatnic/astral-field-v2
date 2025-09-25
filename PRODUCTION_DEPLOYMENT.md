# AstralField Production Deployment Guide

## Prerequisites

### System Requirements
- Node.js 18+ (LTS recommended)
- PostgreSQL 13+ database
- Redis 6+ for caching and rate limiting
- At least 2GB RAM, 20GB storage
- SSL certificate for HTTPS

### Required Environment Variables
Copy `.env.production.example` to `.env.production` and configure:

```bash
cp .env.production.example .env.production
```

## Production Deployment Steps

### 1. Database Setup

```bash
# Create production database
createdb astralfield_prod

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

### 2. Redis Setup

```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
```

### 3. Application Build

```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Test build
npm run start
```

### 4. Process Management (PM2 Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'astralfield',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Reverse Proxy Setup (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets
    location /_next/static/ {
        alias /var/www/astralfield/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Security Hardening

### 1. Environment Security
- Use strong, unique secrets for all environment variables
- Rotate secrets regularly
- Store secrets in secure vault (e.g., HashiCorp Vault, AWS Secrets Manager)
- Never commit secrets to version control

### 2. Database Security
```bash
# PostgreSQL security
sudo -u postgres psql
ALTER USER astralfield_user WITH PASSWORD 'strong-unique-password';
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO astralfield_user;
```

### 3. Redis Security
```bash
# Add to /etc/redis/redis.conf
requirepass your-strong-redis-password
bind 127.0.0.1
protected-mode yes
```

### 4. Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw deny 3000  # Block direct access to Node.js
sudo ufw deny 5432  # Block direct access to PostgreSQL
sudo ufw deny 6379  # Block direct access to Redis
```

## Monitoring & Logging

### 1. Application Logs
```bash
# Create log directory
mkdir -p logs

# Set up log rotation
sudo tee /etc/logrotate.d/astralfield << EOF
/var/www/astralfield/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload astralfield
    endscript
}
EOF
```

### 2. Health Checks
Set up monitoring for these endpoints:
- `GET /api/health` - Basic health check
- `GET /api/health/comprehensive` - Detailed system health
- `GET /api/health/db` - Database connectivity

### 3. Error Tracking
Configure Sentry or similar service:
```bash
export SENTRY_DSN="https://your-sentry-dsn@sentry.io/project"
```

## Backup Strategy

### 1. Database Backup
```bash
#!/bin/bash
# backup-database.sh
BACKUP_DIR="/var/backups/astralfield"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump astralfield_prod | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

# Add to crontab: 0 2 * * * /path/to/backup-database.sh
```

### 2. File System Backup
```bash
# Backup uploaded files and logs
tar -czf /var/backups/astralfield/files_$(date +%Y%m%d).tar.gz \
    /var/www/astralfield/public/uploads \
    /var/www/astralfield/logs
```

## Performance Optimization

### 1. Database Optimization
```sql
-- Add indexes for commonly queried fields
CREATE INDEX CONCURRENTLY idx_players_position ON players(position);
CREATE INDEX CONCURRENTLY idx_teams_league_id ON teams(league_id);
CREATE INDEX CONCURRENTLY idx_matchups_week_league ON matchups(week, league_id);

-- Enable connection pooling
-- Adjust max_connections, shared_buffers in postgresql.conf
```

### 2. Redis Configuration
```bash
# Optimize Redis memory usage
maxmemory 1gb
maxmemory-policy allkeys-lru
tcp-keepalive 300
```

### 3. Node.js Optimization
```bash
# Set Node.js production optimizations
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"
```

## SSL/TLS Setup

### Using Let's Encrypt (Certbot)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already set up by certbot)
sudo crontab -l | grep certbot
```

## Load Testing

Before going live, run load tests:
```bash
# Install artillery
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Browse site"
    requests:
      - get:
          url: "/"
      - get:
          url: "/dashboard"
      - get:
          url: "/api/health"
EOF

# Run test
artillery run load-test.yml
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connections
   sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis status
   sudo systemctl status redis-server
   
   # Test connection
   redis-cli ping
   ```

3. **High Memory Usage**
   ```bash
   # Monitor Node.js processes
   pm2 monit
   
   # Check system resources
   htop
   free -h
   ```

4. **Application Errors**
   ```bash
   # Check PM2 logs
   pm2 logs astralfield
   
   # Check Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

## Success Verification

After deployment, verify these work:
- [ ] Application loads at your domain
- [ ] User registration and login
- [ ] Database queries execute successfully
- [ ] Redis caching works
- [ ] Rate limiting functions
- [ ] Health check endpoints respond
- [ ] Error tracking captures issues
- [ ] Backups complete successfully
- [ ] SSL certificate is valid
- [ ] All API endpoints respond correctly

## Maintenance

### Daily
- Check application logs for errors
- Monitor system resources
- Verify health check endpoints

### Weekly  
- Review error tracking reports
- Check backup integrity
- Monitor database performance
- Update dependencies (security patches)

### Monthly
- Rotate secrets
- Review and update security configurations
- Performance analysis and optimization
- Update system packages

## Support

For deployment issues:
1. Check application logs: `pm2 logs`
2. Review system health: `/api/health/comprehensive`
3. Monitor database: Check connection pool status
4. Check Redis: Verify cache hit rates

Contact: support@your-domain.com