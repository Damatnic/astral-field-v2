# Quantum's Terraform Outputs

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = module.vpc.database_subnet_ids
}

# EKS Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_version" {
  description = "EKS cluster Kubernetes version"
  value       = module.eks.cluster_version
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "node_groups" {
  description = "EKS node groups"
  value       = module.eks.node_groups
}

output "oidc_provider_arn" {
  description = "ARN of the EKS OIDC Provider"
  value       = module.eks.oidc_provider_arn
}

# Database Outputs
output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.db_endpoint
}

output "db_instance_id" {
  description = "RDS instance ID"
  value       = module.database.db_instance_id
}

output "db_instance_arn" {
  description = "RDS instance ARN"
  value       = module.database.db_instance_arn
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = module.database.db_port
}

output "db_subnet_group_name" {
  description = "Database subnet group name"
  value       = module.database.db_subnet_group_name
}

# Redis Outputs
output "redis_cluster_id" {
  description = "ElastiCache Redis cluster ID"
  value       = aws_elasticache_replication_group.redis.id
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "ElastiCache Redis reader endpoint"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

# Security Outputs
output "database_security_group_id" {
  description = "Database security group ID"
  value       = module.security.database_security_group_id
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = module.security.redis_security_group_id
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = module.security.alb_security_group_id
}

# Secrets Manager Outputs
output "secrets_manager_secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
  sensitive   = true
}

output "secrets_manager_secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.name
}

# Monitoring Outputs
output "prometheus_endpoint" {
  description = "Prometheus endpoint"
  value       = var.enable_monitoring ? module.monitoring[0].prometheus_endpoint : null
}

output "grafana_endpoint" {
  description = "Grafana endpoint"
  value       = var.enable_monitoring ? module.monitoring[0].grafana_endpoint : null
}

output "grafana_admin_password" {
  description = "Grafana admin password"
  value       = random_password.grafana_admin_password.result
  sensitive   = true
}

# kubectl Configuration Command
output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

# Connection Information
output "database_connection_info" {
  description = "Database connection information"
  value = {
    endpoint = module.database.db_endpoint
    port     = module.database.db_port
    database = var.database_name
    username = var.db_username
  }
  sensitive = true
}

output "redis_connection_info" {
  description = "Redis connection information"
  value = {
    primary_endpoint = aws_elasticache_replication_group.redis.primary_endpoint_address
    reader_endpoint  = aws_elasticache_replication_group.redis.reader_endpoint_address
    port            = aws_elasticache_replication_group.redis.port
  }
  sensitive = true
}

# Load Balancer Information
output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = var.enable_monitoring ? module.monitoring[0].load_balancer_dns : null
}

# Cost Optimization Recommendations
output "cost_optimization_summary" {
  description = "Cost optimization recommendations"
  value = {
    environment = var.environment
    instance_types = {
      eks_nodes = [for ng in var.eks_node_groups : ng.instance_types]
      database  = var.db_instance_class
      redis     = var.redis_node_type
    }
    storage = {
      database_storage = "${var.db_allocated_storage}GB (auto-scaling to ${var.db_max_allocated_storage}GB)"
      prometheus_storage = var.prometheus_storage_size
    }
    recommendations = var.environment == "prod" ? [
      "Consider Reserved Instances for consistent workloads",
      "Monitor and optimize storage auto-scaling settings",
      "Use Spot instances for non-critical workloads"
    ] : [
      "Using Spot instances for cost optimization",
      "Consider smaller instance types for development",
      "Implement automated shutdown for non-business hours"
    ]
  }
}