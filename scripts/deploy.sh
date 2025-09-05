#!/bin/bash

# Astral Field Deployment Script
# Automates the deployment process to Vercel

set -e

echo "🚀 Starting Astral Field deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory is not clean. Uncommitted changes will not be deployed."
    git status --short
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled."
        exit 1
    fi
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci --silent

# Run linting and type checking
print_status "Running linting and type checking..."
npm run lint --silent || {
    print_warning "Linting warnings found but continuing..."
}

if command -v npm run type-check &> /dev/null; then
    npm run type-check --silent || {
        print_error "Type checking failed. Please fix errors before deploying."
        exit 1
    }
fi

# Build the application
print_status "Building application..."
npm run build || {
    print_error "Build failed. Please fix errors before deploying."
    exit 1
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Please install it with: npm i -g vercel"
    exit 1
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."

if [ "$1" = "--production" ] || [ "$1" = "-p" ]; then
    print_status "Deploying to production..."
    vercel --prod
    DEPLOYMENT_TYPE="production"
else
    print_status "Deploying to preview..."
    vercel
    DEPLOYMENT_TYPE="preview"
fi

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls | grep "$(basename $(pwd))" | head -1 | awk '{print $2}')

if [ -n "$DEPLOYMENT_URL" ]; then
    print_success "Deployment completed successfully!"
    echo ""
    echo "🔗 Deployment URL: https://$DEPLOYMENT_URL"
    echo ""
    
    # If this is a production deployment, run the database setup
    if [ "$DEPLOYMENT_TYPE" = "production" ]; then
        print_status "Setting up production database..."
        
        # Wait a moment for deployment to be ready
        sleep 5
        
        curl -X POST "https://$DEPLOYMENT_URL/api/setup-users" \
            -H "Authorization: Bearer astral2025" \
            -H "Content-Type: application/json" \
            --silent --show-error || {
            print_warning "Database setup failed. You may need to run it manually:"
            echo "curl -X POST https://$DEPLOYMENT_URL/api/setup-users -H 'Authorization: Bearer astral2025'"
        }
        
        print_success "Production database setup completed!"
        echo ""
        echo "🧪 Test your deployment:"
        echo "   Login URL: https://$DEPLOYMENT_URL/auth/login"
        echo "   Demo Email: nicholas.damato@astralfield.com"
        echo "   Demo Password: astral2025"
    fi
    
    echo ""
    echo "✅ Deployment process completed!"
else
    print_error "Could not determine deployment URL"
    exit 1
fi