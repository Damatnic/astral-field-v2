# Quantum's Cloud Infrastructure as Code
terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    # Configure via terraform init with backend config
    # bucket = "astralfield-terraform-state"
    # key    = "infrastructure/terraform.tfstate"
    # region = "us-east-1"
    # encrypt = true
    # dynamodb_table = "terraform-locks"
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "AstralField"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "Quantum-DevOps"
      CostCenter  = "Engineering"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# Local values for resource naming and tagging
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Terraform   = "true"
    Owner       = "quantum-devops"
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC and Networking
module "vpc" {
  source = "./modules/networking"
  
  name_prefix         = local.name_prefix
  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
  
  # Public and private subnet configuration
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  
  # NAT Gateway configuration
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway
  
  # DNS configuration
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "./modules/compute"
  
  name_prefix    = local.name_prefix
  environment    = var.environment
  
  # Cluster configuration
  cluster_version = var.eks_cluster_version
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  
  # Node group configuration
  node_groups = var.eks_node_groups
  
  # Security and access
  cluster_endpoint_public_access  = var.cluster_endpoint_public_access
  cluster_endpoint_private_access = true
  
  tags = local.common_tags
  
  depends_on = [module.vpc]
}

# RDS Database
module "database" {
  source = "./modules/database"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # Database configuration
  engine              = var.db_engine
  engine_version      = var.db_engine_version
  instance_class      = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  
  # Database settings
  database_name = var.database_name
  username      = var.db_username
  
  # Network configuration
  vpc_id                = module.vpc.vpc_id
  subnet_ids           = module.vpc.database_subnet_ids
  vpc_security_group_ids = [module.security.database_security_group_id]
  
  # Backup and maintenance
  backup_retention_period = var.db_backup_retention_period
  backup_window          = var.db_backup_window
  maintenance_window     = var.db_maintenance_window
  
  # High availability
  multi_az = var.db_multi_az
  
  # Performance monitoring
  performance_insights_enabled = var.db_performance_insights_enabled
  monitoring_interval         = var.db_monitoring_interval
  
  tags = local.common_tags
  
  depends_on = [module.vpc]
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name_prefix}-redis-subnet-group"
  subnet_ids = module.vpc.private_subnet_ids
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-subnet-group"
  })
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id         = "${local.name_prefix}-redis"
  description                  = "Redis cluster for ${var.project_name} ${var.environment}"
  
  port                         = 6379
  parameter_group_name         = "default.redis7"
  node_type                   = var.redis_node_type
  num_cache_clusters          = var.redis_num_cache_clusters
  
  engine_version              = "7.0"
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                  = random_password.redis_auth_token.result
  
  subnet_group_name           = aws_elasticache_subnet_group.redis.name
  security_group_ids          = [module.security.redis_security_group_id]
  
  # Automatic failover
  automatic_failover_enabled  = var.redis_automatic_failover_enabled
  multi_az_enabled           = var.redis_multi_az_enabled
  
  # Backup
  snapshot_retention_limit    = var.redis_snapshot_retention_limit
  snapshot_window            = var.redis_snapshot_window
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })
}

# Security Groups
module "security" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  vpc_cidr    = var.vpc_cidr
  
  tags = local.common_tags
  
  depends_on = [module.vpc]
}

# Monitoring and Observability
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix  = local.name_prefix
  environment  = var.environment
  cluster_name = module.eks.cluster_name
  
  # Prometheus configuration
  prometheus_storage_size = var.prometheus_storage_size
  
  # Grafana configuration
  grafana_admin_password = random_password.grafana_admin_password.result
  
  tags = local.common_tags
  
  depends_on = [module.eks]
}

# Generate random passwords
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

resource "random_password" "grafana_admin_password" {
  length  = 16
  special = true
}

# Store secrets in AWS Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "${local.name_prefix}-app-secrets"
  description = "Application secrets for ${var.project_name} ${var.environment}"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    database_url = "postgresql://${var.db_username}:${random_password.db_password.result}@${module.database.db_endpoint}:5432/${var.database_name}"
    redis_url = "redis://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
    jwt_secret = random_password.jwt_secret.result
    nextauth_secret = random_password.nextauth_secret.result
  })
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "nextauth_secret" {
  length  = 32
  special = true
}