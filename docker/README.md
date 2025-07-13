# Docker Configuration

This directory contains Docker configuration files for PteroDeploy.

## Files

- `Dockerfile.backend` - Backend service container
- `Dockerfile.frontend` - Frontend service container  
- `docker-compose.yml` - Development environment
- `docker-compose.prod.yml` - Production environment

## Usage

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```