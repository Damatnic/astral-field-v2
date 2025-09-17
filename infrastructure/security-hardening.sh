#!/bin/bash

# Astral Field Production Server Security Hardening Script
# This script implements comprehensive security measures for the production server

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y
    apt-get autoremove -y
    apt-get autoclean
}

# Install essential security packages
install_security_packages() {
    log "Installing security packages..."
    apt-get install -y \
        ufw \
        fail2ban \
        aide \
        rkhunter \
        chkrootkit \
        lynis \
        unattended-upgrades \
        apt-listchanges \
        logwatch \
        htop \
        iotop \
        curl \
        wget \
        git \
        vim \
        tmux
}

# Configure UFW firewall
configure_firewall() {
    log "Configuring UFW firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (adjust port if using non-standard)
    ufw allow 22/tcp comment 'SSH'
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # Allow application ports
    ufw allow 3000/tcp comment 'Astral Field App'
    ufw allow 9090/tcp comment 'Prometheus'
    ufw allow 3001/tcp comment 'Grafana'
    
    # Allow database access only from local network
    ufw allow from 172.20.0.0/16 to any port 5432 comment 'PostgreSQL local'
    ufw allow from 172.20.0.0/16 to any port 6379 comment 'Redis local'
    
    # Rate limiting for SSH
    ufw limit ssh/tcp
    
    # Enable UFW
    ufw --force enable
    
    log "Firewall configured successfully"
}

# Configure Fail2Ban
configure_fail2ban() {
    log "Configuring Fail2Ban..."
    
    # Create local jail configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = auto

[ssh]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 2
bantime = 7200
EOF

    # Start and enable Fail2Ban
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    log "Fail2Ban configured successfully"
}

# Harden SSH configuration
harden_ssh() {
    log "Hardening SSH configuration..."
    
    # Backup original config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # Create hardened SSH config
    cat > /etc/ssh/sshd_config << 'EOF'
# Astral Field Production SSH Configuration
Port 22
Protocol 2

# Authentication
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Security settings
X11Forwarding no
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
UsePrivilegeSeparation yes
StrictModes yes
MaxAuthTries 3
MaxSessions 2
ClientAliveInterval 300
ClientAliveCountMax 2

# Allow only specific users (adjust as needed)
# AllowUsers astral-admin

# Logging
SyslogFacility AUTH
LogLevel INFO

# Ciphers and algorithms
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256,diffie-hellman-group-exchange-sha256

# Banner
Banner /etc/issue.net
EOF

    # Create banner
    cat > /etc/issue.net << 'EOF'
********************************************************************************
*                                                                              *
*                          ASTRAL FIELD PRODUCTION SERVER                     *
*                                                                              *
*  This system is for authorized users only. Individual use of this system    *
*  is monitored and logged. By using this system, you agree to comply with    *
*  all applicable laws and company policies.                                  *
*                                                                              *
*  Unauthorized access is strictly prohibited and will be prosecuted to the   *
*  full extent of the law.                                                    *
*                                                                              *
********************************************************************************
EOF

    # Test SSH config and restart if valid
    sshd -t && systemctl restart sshd
    
    log "SSH hardened successfully"
}

# Configure automatic security updates
configure_auto_updates() {
    log "Configuring automatic security updates..."
    
    # Configure unattended-upgrades
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::Package-Blacklist {
    // Add packages you want to exclude from auto-updates
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
EOF

    # Enable automatic updates
    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    log "Automatic security updates configured"
}

# Set up system monitoring
setup_monitoring() {
    log "Setting up system monitoring..."
    
    # Create monitoring script
    cat > /usr/local/bin/astral-monitor.sh << 'EOF'
#!/bin/bash

# System monitoring script for Astral Field
LOGFILE="/var/log/astral-monitor.log"
THRESHOLD_CPU=80
THRESHOLD_MEM=90
THRESHOLD_DISK=85

# Function to log with timestamp
log_monitor() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOGFILE
}

# Check CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
if (( $(echo "$CPU_USAGE > $THRESHOLD_CPU" | bc -l) )); then
    log_monitor "WARNING: High CPU usage: ${CPU_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -gt $THRESHOLD_MEM ]; then
    log_monitor "WARNING: High memory usage: ${MEM_USAGE}%"
fi

# Check disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt $THRESHOLD_DISK ]; then
    log_monitor "WARNING: High disk usage: ${DISK_USAGE}%"
fi

# Check Docker containers
if command -v docker &> /dev/null; then
    UNHEALTHY=$(docker ps --filter health=unhealthy --format "table {{.Names}}" | tail -n +2)
    if [ ! -z "$UNHEALTHY" ]; then
        log_monitor "WARNING: Unhealthy containers: $UNHEALTHY"
    fi
fi
EOF

    chmod +x /usr/local/bin/astral-monitor.sh
    
    # Add to crontab for root
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/astral-monitor.sh") | crontab -
    
    log "System monitoring configured"
}

# Secure kernel parameters
secure_kernel() {
    log "Securing kernel parameters..."
    
    cat > /etc/sysctl.d/99-astral-security.conf << 'EOF'
# Astral Field Security Kernel Parameters

# Network security
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Enable IP spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_all = 1

# Ignore broadcast ping requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable TCP SACK
net.ipv4.tcp_sack = 0
net.ipv4.tcp_dsack = 0
net.ipv4.tcp_fack = 0

# Kernel hardening
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 1
kernel.kexec_load_disabled = 1
kernel.unprivileged_bpf_disabled = 1
net.core.bpf_jit_harden = 2

# Memory protection
vm.mmap_rnd_bits = 32
vm.mmap_rnd_compat_bits = 16
EOF

    sysctl -p /etc/sysctl.d/99-astral-security.conf
    
    log "Kernel security parameters applied"
}

# Create deployment script
create_deployment_script() {
    log "Creating deployment script..."
    
    cat > /usr/local/bin/deploy-astral.sh << 'EOF'
#!/bin/bash

# Astral Field Production Deployment Script
set -euo pipefail

REPO_URL="https://github.com/your-org/astral-field-v2.1.git"
DEPLOY_DIR="/opt/astral-field"
BACKUP_DIR="/opt/backups/astral-field"
LOG_FILE="/var/log/astral-deploy.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> $LOG_FILE
    exit 1
}

# Pre-deployment backup
backup_current() {
    log "Creating backup of current deployment..."
    if [ -d "$DEPLOY_DIR" ]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        cp -r "$DEPLOY_DIR" "$BACKUP_DIR/backup_$TIMESTAMP"
        log "Backup created: backup_$TIMESTAMP"
    fi
}

# Deploy new version
deploy() {
    log "Starting deployment..."
    
    # Stop services
    log "Stopping services..."
    docker-compose -f $DEPLOY_DIR/infrastructure/production-server.yml down
    
    # Pull latest code
    log "Pulling latest code..."
    cd $DEPLOY_DIR
    git fetch --all
    git reset --hard origin/main
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production
    
    # Build application
    log "Building application..."
    npm run build
    
    # Run database migrations
    log "Running database migrations..."
    npm run db:migrate
    
    # Start services
    log "Starting services..."
    docker-compose -f infrastructure/production-server.yml up -d
    
    # Health check
    log "Performing health check..."
    sleep 30
    if curl -f http://localhost:3000/api/health; then
        log "Deployment successful!"
    else
        error "Health check failed!"
    fi
}

# Main execution
main() {
    log "Starting Astral Field deployment..."
    backup_current
    deploy
    log "Deployment completed successfully!"
}

main "$@"
EOF

    chmod +x /usr/local/bin/deploy-astral.sh
    
    log "Deployment script created"
}

# Main execution
main() {
    log "Starting Astral Field security hardening..."
    
    check_root
    update_system
    install_security_packages
    configure_firewall
    configure_fail2ban
    harden_ssh
    configure_auto_updates
    setup_monitoring
    secure_kernel
    create_deployment_script
    
    log "Security hardening completed successfully!"
    log "Please reboot the system to ensure all changes take effect."
    
    # Display security summary
    echo -e "\n${BLUE}Security Hardening Summary:${NC}"
    echo "✓ System packages updated"
    echo "✓ UFW firewall configured"
    echo "✓ Fail2Ban intrusion prevention enabled"
    echo "✓ SSH hardened"
    echo "✓ Automatic security updates enabled"
    echo "✓ System monitoring configured"
    echo "✓ Kernel security parameters applied"
    echo "✓ Deployment script created"
    echo ""
    echo "Next steps:"
    echo "1. Reboot the system"
    echo "2. Set up SSL certificates"
    echo "3. Configure backup storage"
    echo "4. Test deployment script"
    echo "5. Set up monitoring alerts"
}

main "$@"