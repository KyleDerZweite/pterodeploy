# PteroDeploy

**Universal Minecraft Modpack Automation for Pterodactyl Panels**

PteroDeploy automatically converts modpacks from any platform (Forge, Fabric, Quilt, NeoForge) into optimized Pterodactyl eggs with intelligent configuration and one-click deployment.

## Features

- **Universal Modloader Support**: Forge (Legacy/Modern), Fabric, Quilt, NeoForge
- **Intelligent Auto-Detection**: Automatically detects modpack configuration from manifest files
- **Optimized Egg Generation**: Creates production-ready Pterodactyl eggs with proper Java versions and JVM settings
- **Zero Configuration**: Minimal setup required - paste URL, get deployable server
- **Admin Dashboard**: User management with role-based access control

## Quick Start

```bash
git clone https://github.com/your-username/pterodeploy.git
cd pterodeploy
cp .env.example .env
npm run install:all
npm run dev
```

**Access**: http://localhost:5173

## Architecture

**PteroDeploy**: Intelligent modpack analysis and egg generation  
**Pterodactyl**: Server deployment and management  
**Result**: Seamless modded server deployment

## Technology Stack

- **Backend**: Node.js, TypeScript, Express, Prisma, SQLite
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Processing**: BullMQ, Redis, Socket.IO

## Platform Support

| Platform | Status | Supported Versions |
|----------|--------|-------------------|
| Forge | ✅ | 1.7.10 - Latest |
| NeoForge | ✅ | 1.20.5+ |
| Fabric | ✅ | 1.14+ |
| Quilt | ✅ | 1.18+ |

## Documentation

- **[Technical Guide](CLAUDE.md)**: Detailed system architecture and universal template system
- **[Development Roadmap](docs/ROADMAP_PLAN.md)**: Complete implementation plan

## License

Apache 2.0 License - see [LICENSE](LICENSE) file for details.