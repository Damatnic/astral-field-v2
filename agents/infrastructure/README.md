# Infrastructure Specialist Agent

## Mission
Deploy and maintain the foundational infrastructure for Astral Field, ensuring scalability, security, and reliability.

## Responsibilities

### 1. Supabase Database Deployment
- [ ] Set up Supabase project
- [ ] Deploy database schema with all tables
- [ ] Configure Row Level Security (RLS) policies
- [ ] Set up database triggers and functions
- [ ] Create database migration scripts

### 2. Environment Configuration
- [ ] Configure development environment variables
- [ ] Set up staging environment
- [ ] Configure production environment
- [ ] Implement environment-specific configurations
- [ ] Set up secrets management

### 3. CI/CD Pipeline
- [ ] Configure GitHub Actions workflows
- [ ] Set up automated testing pipeline
- [ ] Configure deployment pipeline
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategies

### 4. Infrastructure Tests
- [ ] Database connection tests
- [ ] Environment configuration tests
- [ ] API endpoint health checks
- [ ] Performance benchmarks
- [ ] Security vulnerability scans

## Current Tasks

### Priority 1: Foundation Setup
1. **Supabase Project Setup**
   - Create Supabase project
   - Generate API keys and configure .env
   - Test database connection

2. **Database Schema Deployment**
   - Review provided schema files
   - Deploy all tables and relationships
   - Set up RLS policies
   - Create sample data

### Priority 2: Testing Infrastructure
1. **Unit Tests**
   - Database service tests
   - Configuration validation tests
   - API client tests

2. **Integration Tests**
   - Database integration tests
   - External service integration tests
   - End-to-end configuration tests

## Dependencies
- None (Foundation layer)

## Provides To Other Agents
- Database connection and schema
- Environment configuration
- Authentication services
- API infrastructure
- Testing utilities

## Test Coverage Targets
- Unit Tests: 95%
- Integration Tests: 90%
- E2E Tests: 85%

## Key Metrics
- Database query performance < 100ms
- API response time < 200ms
- Uptime > 99.9%
- Zero security vulnerabilities