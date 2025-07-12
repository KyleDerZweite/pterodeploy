<div align="center">
  <h1>PteroDeploy</h1>
  <p><strong>AI-powered conversational deployment assistant for Minecraft servers</strong></p>
  
  [![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
  [![React](https://img.shields.io/badge/react-18.0+-61dafb.svg)](https://reactjs.org/)
  [![Docker](https://img.shields.io/badge/docker-ready-2496ed.svg)](https://www.docker.com/)
</div>

## Overview

PteroDeploy transforms Minecraft server deployment into an intelligent conversation. Simply provide a modpack URL, and watch as AI orchestrates the entire deployment process with real-time progress visualization.

## Features

- **Conversational UI** - Natural language interaction for deployments
- **Real-time Progress** - Live status updates and detailed logging
- **Intelligent Error Handling** - AI-powered error resolution and suggestions
- **Multiple Sources** - Support for CurseForge, Modrinth, and direct downloads
- **Deployment History** - Track and review all past deployments
- **Template System** - Save and reuse successful configurations

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/pterodeploy.git
cd pterodeploy

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:3000
Prerequisites

Docker & Docker Compose
Pterodactyl Panel (v1.11+)
OpenAI/Anthropic API key

Architecture
mermaidgraph LR
    A[React Frontend] -->|WebSocket| B[FastAPI Backend]
    B --> C[Redis Queue]
    C --> D[Worker Pool]
    D --> E[Pterodactyl API]
    B --> F[SQLite/PostgreSQL]
    D --> G[AI Provider]

Documentation

Installation Guide
Configuration
API Reference
Development Setup

Contributing
We welcome contributions! Please see our Contributing Guide for details.

License
This project is licensed under the Apache 2.0 - see the LICENSE file for details.

Acknowledgments

Pterodactyl Panel for the amazing server management platform
The Minecraft modding community for inspiration


## Project Structure
pterodeploy/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── release.yml
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── backend/
│   ├── app/
│   │   ├── init.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── init.py
│   │   │   ├── auth.py
│   │   │   ├── deployments.py
│   │   │   └── websocket.py
│   │   ├── core/
│   │   │   ├── init.py
│   │   │   ├── security.py
│   │   │   ├── database.py
│   │   │   └── redis.py
│   │   ├── models/
│   │   │   ├── init.py
│   │   │   ├── user.py
│   │   │   └── deployment.py
│   │   ├── services/
│   │   │   ├── init.py
│   │   │   ├── ai_service.py
│   │   │   ├── pterodactyl_service.py
│   │   │   └── deployment_orchestrator.py
│   │   └── utils/
│   │       ├── init.py
│   │       └── validators.py
│   ├── tests/
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── chat/
│   │   │   ├── deployment/
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── websocket.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useAuth.ts
│   │   └── store/
│   │       ├── index.ts
│   │       └── slices/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── Dockerfile
├── docs/
│   ├── installation.md
│   ├── configuration.md
│   ├── api.md
│   └── development.md
├── scripts/
│   ├── setup.sh
│   └── test.sh
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
└── CONTRIBUTING.md

## Key Configuration Files

### .env.example
```env
# Application
APP_NAME=PteroDeploy
APP_ENV=production
APP_URL=http://localhost:3000

# Backend
BACKEND_PORT=8000
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./pterodeploy.db

# Redis
REDIS_URL=redis://localhost:6379

# Pterodactyl
PTERODACTYL_URL=https://panel.example.com
PTERODACTYL_API_KEY=your-api-key

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=your-api-key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
