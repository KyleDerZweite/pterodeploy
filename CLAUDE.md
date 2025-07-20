# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PteroDeploy is an intelligent **Nest & Egg Factory** for Pterodactyl panels that automates Minecraft modpack deployment. It analyzes modpack URLs (Modrinth), generates optimized Pterodactyl eggs with proper configurations, and enables seamless one-click deployment through the familiar Pterodactyl interface.

**Core Architecture**: PteroDeploy handles complex modpack analysis and configuration generation, while Pterodactyl handles server management, monitoring, and user interaction. This separation provides the best of both worlds - intelligent automation + proven server management.

## Egg Template System

### Pterodactyl Egg Import Troubleshooting

#### Reserved Environment Variable Names
Pterodactyl has a strict list of **RESERVED environment variable names** that cannot be used in egg configurations. These are defined in `/app/Models/EggVariable.php`:

**RESERVED_ENV_NAMES**: `SERVER_MEMORY,SERVER_IP,SERVER_PORT,ENV,HOME,USER,STARTUP,SERVER_UUID,UUID`

**Common Error**: `"The selected env variable is invalid."`
- **Cause**: Using a reserved environment variable name
- **Solution**: Use alternative names like `MEMORY` instead of `SERVER_MEMORY`

#### Required JSON Structure for Import
1. **Meta section must include `update_url`**:
   ```json
   "meta": {
     "version": "PTDL_v2",
     "update_url": null
   }
   ```

2. **Features array should include standard features**:
   ```json
   "features": ["eula", "java_version", "pid_limit"]
   ```

3. **Environment variable validation**:
   - Must match regex: `/^[\w]{1,191}$/`
   - Cannot be in RESERVED_ENV_NAMES list
   - Must be unique within the egg

#### Safe Environment Variable Names
✅ **Allowed**: `MEMORY`, `STARTUP_MEMORY`, `PROJECT_ID`, `VERSION_ID`, `MODPACK_URL`, `SERVER_JAR`
❌ **Reserved**: `SERVER_MEMORY`, `SERVER_IP`, `SERVER_PORT`, `ENV`, `HOME`, `USER`, `STARTUP`, `SERVER_UUID`, `UUID`

### Universal Multi-Platform Egg Template v2.0 (`assets/egg_template.json`)

The project includes a revolutionary universal egg template that **automatically detects and supports all major modloaders** with intelligent configuration. This single template handles Forge (Legacy/Modern), Fabric, Quilt, and NeoForge through advanced auto-detection.

#### Key Features of v2.0

🔥 **Auto-Detection**: Automatically detects modloader type and version from `manifest.json`
🔥 **Multi-Platform**: Single template supports Forge, Fabric, Quilt, NeoForge
🔥 **Smart Java Selection**: Auto-selects Java version based on Minecraft version
🔥 **Zero Configuration**: Minimal template variables, maximum automation
🔥 **Future-Proof**: Easy to extend for new modloaders and MC versions

#### How to Use the Universal Template

1. **Copy the template**: Start with `assets/egg_template.json`
2. **Replace minimal placeholders**: Only 8 simple template variables
3. **Deploy**: Template auto-detects everything else from the modpack

#### Required Template Variables (Simplified)

```json
// Basic Configuration (Required)
{{{EXPORT_DATE}}}           → Current date (e.g., "2025-07-20T12:00:00Z")
{{{MODPACK_NAME}}}          → Egg name (e.g., "All The Mods 10")
{{{AUTHOR_EMAIL}}}          → Your email (e.g., "kyledererste@proton.me")
{{{MODPACK_DESCRIPTION}}}   → Description (e.g., "ATM10 NeoForge modpack")
{{{MODPACK_DISPLAY_NAME}}}  → Display name for logs (e.g., "All The Mods 10")
{{{MODPACK_URL}}}           → Direct download URL to modpack/server pack zip
{{{DEFAULT_MAX_MEMORY}}}    → Default max memory (e.g., "8192")
{{{DEFAULT_MIN_MEMORY}}}    → Default min memory (e.g., "4096")

// Auto-Generated (Optional - for fallback only)
{{{DEFAULT_JVM_ARGS}}}      → Default JVM args (e.g., "-XX:+UseG1GC")
{{{DEFAULT_LAUNCHER_TARGET}}}→ Fallback startup command
{{{DEFAULT_MODLOADER_TYPE}}}→ Fallback modloader type
{{{DEFAULT_MODLOADER_VERSION}}}→ Fallback modloader version
```

#### Platform Support Matrix

| ModLoader | Minecraft Versions | Auto-Detection | Startup Method |
|-----------|-------------------|----------------|----------------|
| **Forge Legacy** | 1.7.10 - 1.16.5 | ✅ `forge-X.X.X` | `-jar universal.jar` |
| **Forge Modern** | 1.17+ | ✅ `forge-X.X.X` | `@unix_args.txt` |
| **NeoForge** | 1.20.5+ | ✅ `neoforge-X.X.X` | `@unix_args.txt` |
| **Fabric** | 1.14+ | ✅ `fabric-X.X.X` | `-jar fabric-server-launch.jar` |
| **Quilt** | 1.18+ | ✅ `quilt-X.X.X` | `-jar quilt-server-launch.jar` |

#### Auto-Detection Intelligence

The template automatically:

1. **Downloads and extracts** the modpack from the provided URL
2. **Parses `manifest.json`** to detect:
   - Minecraft version → Auto-selects Java version
   - ModLoader type and version → Auto-configures installer
   - Override directory → Auto-copies configuration files
3. **Installs the appropriate modloader**:
   - Downloads correct installer from official sources
   - Handles legacy vs modern Forge differences
   - Configures startup arguments appropriately
4. **Creates optimal startup command** stored in `.launcher_target`

#### Automatic Java Version Selection

| Minecraft Version | Auto-Selected Java | Docker Image |
|-------------------|-------------------|--------------|
| 1.7.10 - 1.16.5   | Java 8 | `ghcr.io/pterodactyl/yolks:java_8` |
| 1.17 - 1.17.1     | Java 16 | `ghcr.io/pterodactyl/yolks:java_16` |
| 1.18 - 1.20.4     | Java 17 | `ghcr.io/pterodactyl/yolks:java_17` |
| 1.20.5+           | Java 21 | `ghcr.io/pterodactyl/yolks:java_21` |

#### Example Configurations

**ATM10 NeoForge Example**:
```json
{{{MODPACK_NAME}}}          → "All The Mods 10 (1.21.1)"
{{{MODPACK_DESCRIPTION}}}   → "ATM10 kitchen sink modpack with 500+ mods"
{{{MODPACK_URL}}}           → "https://servers.atm10.com/serverfiles-4.4.zip"
{{{DEFAULT_MAX_MEMORY}}}    → "8192"
{{{DEFAULT_MIN_MEMORY}}}    → "4096"
// Auto-detects: NeoForge 21.1.191, Minecraft 1.21.1, Java 21
```

**Fabric Modpack Example**:
```json
{{{MODPACK_NAME}}}          → "Prominence II Fabric (1.20.1)"
{{{MODPACK_DESCRIPTION}}}   → "RPG adventure modpack for Fabric"
{{{MODPACK_URL}}}           → "https://example.com/prominence-fabric.zip"
{{{DEFAULT_MAX_MEMORY}}}    → "6144"
{{{DEFAULT_MIN_MEMORY}}}    → "3072"
// Auto-detects: Fabric 0.15.11, Minecraft 1.20.1, Java 17
```

#### User Variables (Runtime Configurable)

Users can configure these 5 essential variables in Pterodactyl:

1. **Memory (Maximum)** - Max RAM allocation (user editable)
2. **Memory (Startup)** - Initial RAM allocation (user editable)
3. **Modpack Download URL** - Direct zip download URL (user editable)
4. **Modpack Display Name** - Display name for logs (read-only)
5. **JVM Arguments** - Advanced JVM tuning (user editable)

#### Benefits of v2.0 Universal System

✅ **90% Less Configuration**: 8 variables instead of 20+ 
✅ **Universal Compatibility**: Works with all major modloaders
✅ **Auto-Update Ready**: Automatically handles new MC/modloader versions
✅ **Error-Resistant**: Comprehensive error handling and fallbacks
✅ **Server Pack Support**: Handles both client modpacks and server packs
✅ **Future-Proof**: Easily extensible for new platforms (ModLoader, Risugami, etc.)
✅ **Performance Optimized**: Platform-specific JVM arguments and optimizations

#### Troubleshooting Auto-Detection

If auto-detection fails, check:
1. **Manifest Format**: Ensure valid `manifest.json` with correct structure
2. **URL Accessibility**: Verify modpack download URL is accessible
3. **Platform Support**: Confirm modloader is in supported list
4. **Fallback Variables**: Use template variables for manual override

The template logs detailed detection information during installation for debugging.

## Directory Structure

```
pterodeploy/
├── assets/                  # Asset files and templates
│   ├── egg_galery/         # Pre-configured egg examples
│   │   ├── project-overpowered-4.9.json # Example modpack egg
│   │   ├── mc-eternal-2-1.1.0.2-final_verified.json # Working example
│   │   └── egg-modrinth-generic.json # Generic Modrinth egg
│   ├── egg_template.json   # Universal egg template (NEW)
│   ├── packs/              # Modpack files and cache
│   │   └── temp/           # Temporary extraction directory
│   └── server_template.json # Server configuration template
├── src/                    # Python Code directory
├── docker-compose.yml      # Redis and supporting services (NEW)
└── package.json            # Root package.json for orchestration
```

## Architecture

### Frontend (`frontend/src/`)
- **Framework**: React 18 + TypeScript + Vite
- **Routing**: React Router v6 with protected routes and admin-only routes
- **State Management**: Zustand stores for auth (with role support) and deployments
- **UI**: Radix UI components with Tailwind CSS and shadcn/ui
- **Real-time**: Socket.IO client for deployment progress
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with dark/light theme support
- **Admin Interface**: Complete admin dashboard with user management

### Backend (`backend/src/`)
- **Framework**: Express.js with TypeScript
- **Database**: Prisma ORM with SQLite (`backend/prisma/schema.prisma`)
- **Authentication**: JWT with bcrypt password hashing and role-based access
- **Processing Pipeline**: BullMQ + Redis for asynchronous job processing (NEW)
- **External APIs**: Modrinth API client for modpack analysis (NEW)
- **Pterodactyl Integration**: API client for nest/egg creation and management (NEW)
- **Real-time**: Socket.IO for processing progress updates
- **Security**: Helmet, CORS, rate limiting, Morgan logging, encrypted API key storage
- **API Structure**: RESTful routes (`/api/auth`, `/api/admin`, `/api/processing`, `/api/templates`)
- **Admin System**: Complete user management with approval workflow

### Database Schema (`backend/prisma/schema.prisma`)

#### User Model (UPDATED)
```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  email     String?
  role      String   @default("user") // "admin" or "user"
  status    String   @default("pending") // "pending", "approved", "rejected"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  deployments Deployment[]
}
```

#### Other Models (NEW/UPDATED)
- **AdminSettings**: Encrypted Pterodactyl API credentials storage
- **ProcessingJob**: Job tracking for modpack analysis and egg generation
- **ModpackTemplate**: Analyzed modpack configurations and generated eggs
- **PterodactylEgg**: Generated egg metadata and deployment tracking
- **Templates**: Pre-configured modpack templates (legacy)

### Key Components

#### Authentication System (UPDATED)
- **AuthContext** (`frontend/src/contexts/auth-context.tsx`): Global authentication with role handling
- **AuthStore** (`frontend/src/stores/auth-store.ts`): Zustand store with admin role detection
- **Protected Routes**: Role-based route protection
- **JWT Middleware** (`backend/src/middleware/auth.ts`): Token verification with role extraction

#### Admin System (NEW)
- **Admin Dashboard** (`frontend/src/pages/admin-page.tsx`): Complete user management interface
- **Admin API** (`backend/src/routes/admin.ts`): User management endpoints
- **CLI Tool** (`backend/admin-cli.js`): Emergency admin access
- **Role-based Sidebar**: Dynamic menu based on user role

#### Modpack Processing System (NEW)
- **ModpackAnalysisWorker**: BullMQ worker for Modrinth API integration and analysis
- **EggGenerationWorker**: BullMQ worker for Pterodactyl nest/egg creation
- **ModrinthClient**: API client for fetching modpack metadata and dependencies
- **PterodactylClient**: API client for nest/egg management and deployment
- **EggFactory**: Intelligent egg generation with Docker image selection and configuration
- **FileProcessor**: Server pack optimization and client mod removal

#### Core Application (UPDATED)
- **SocketContext**: Real-time communication for processing progress
- **ProcessingStore**: Zustand store managing job state and progress updates
- **Dashboard Layout**: Main application shell with dynamic sidebar
- **ProcessingProgress**: Real-time modpack analysis and egg generation interface

## Admin System Implementation

### User Registration Flow
1. **First User**: Automatically becomes admin with "approved" status
2. **Subsequent Users**: Created with "pending" status, require admin approval
3. **Admin Approval**: Can approve, reject, promote, or delete users

### Admin API Endpoints (`/api/admin/*`)
- `GET /users` - List all users with stats
- `POST /users/:id/approve` - Approve pending user
- `POST /users/:id/reject` - Reject pending user  
- `POST /users/:id/promote` - Promote user to admin
- `DELETE /users/:id` - Delete user account
- `GET /stats` - Get admin dashboard statistics
- `POST /settings/pterodactyl` - Configure Pterodactyl API credentials (NEW)
- `GET /settings/pterodactyl` - Get Pterodactyl configuration (NEW)
- `POST /settings/pterodactyl/test` - Test Pterodactyl connection (NEW)

### Admin Access Levels
1. **Web Dashboard**: `/admin` route (admin role required)
2. **Database GUI**: Prisma Studio (`npx prisma studio`)
3. **Emergency CLI**: Direct database access (`admin-cli.js`)

### CLI Admin Tool (`backend/admin-cli.js`)
```bash
node admin-cli.js list-users              # List all users
node admin-cli.js approve username        # Approve user
node admin-cli.js make-admin username     # Promote to admin
node admin-cli.js create-admin user pass  # Emergency admin
node admin-cli.js reset-password user pass # Reset password
```

## Authentication & Security

### JWT Token Structure (UPDATED)
```javascript
{
  userId: string,
  username: string,
  role: string,        // NEW: "admin" or "user"
  exp: number
}
```

### Security Features
- **Role-based Access Control**: Admin vs User permissions
- **Password Hashing**: bcrypt with 12 salt rounds
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Development/production environment configuration
- **Protected Routes**: Frontend and backend route protection
- **Admin Middleware**: Server-side admin role verification

### User Status Flow
- **pending** → **approved** (can login) or **rejected** (cannot login)
- **user** → **admin** (role promotion)
- First user: automatically **admin** + **approved**

## File Structure Notes

- Backend and frontend are separated into distinct directories
- Frontend uses `@/` alias pointing to `frontend/src/`
- Server files use `.js` extensions in imports (ES modules)
- Database file: `backend/prisma/pterodeploy.db`
- UI components follow shadcn/ui conventions in `frontend/src/components/ui/`
- Admin components integrated into existing structure

## Development Workflow

1. **Database Changes**: Run `npm run db:generate` after schema updates
2. **Migrations**: Use `npx prisma migrate dev --name description` for schema changes
3. **Auto-seeding**: Server automatically seeds database on startup
4. **Processing Pipeline**: BullMQ workers handle async modpack analysis and egg generation
5. **Real-time Updates**: Socket.IO handles processing progress updates
6. **Authentication**: JWT tokens with role info stored in Zustand + localStorage
7. **Admin Access**: All admin routes require authentication + admin role
8. **Emergency Access**: CLI tool for direct database management
9. **Pterodactyl Integration**: Encrypted API credentials for nest/egg deployment

## API Structure

### Authentication Routes (`/api/auth`)
- `POST /register` - User registration (with approval workflow)
- `POST /login` - User login (checks approval status)
- `GET /me` - Get current user info

### Admin Routes (`/api/admin`) - Admin Only
- `GET /users` - List all users
- `POST /users/:id/approve` - Approve user
- `POST /users/:id/reject` - Reject user
- `POST /users/:id/promote` - Promote to admin
- `DELETE /users/:id` - Delete user
- `GET /stats` - Dashboard statistics

### Processing Routes (`/api/processing`) - NEW
- `POST /start` - Start modpack analysis job, return job ID
- `GET /:id` - Get job status and progress
- `GET /:id/logs` - Get detailed processing logs
- WebSocket endpoint for real-time progress updates

### Application Routes
- `GET /api/templates` - Template management (legacy)
- `GET /api/eggs` - List generated Pterodactyl eggs (NEW)

## Component Architecture

### Admin Dashboard Components
- **AdminPage**: Main admin interface with tabs and stats
- **UserManagementTable**: User list with action buttons
- **AdminStats**: Statistics cards for dashboard
- **PterodactylSettings**: Pterodactyl API configuration interface (NEW)
- **ProcessingStats**: Modpack processing metrics and queue status (NEW)
- **RoleBadge/StatusBadge**: UI components for user status

### Processing Components (NEW)
- **ProcessingPage**: Main modpack processing interface
- **ModpackAnalyzer**: URL input and validation form
- **ProcessingProgress**: Real-time progress tracking with steps
- **EggPreview**: Generated egg configuration preview
- **EggDeployment**: Deploy to Pterodactyl confirmation

### Layout Components (UPDATED)
- **Sidebar**: Dynamic menu with admin section
- **Header**: User info with role display
- **ProtectedRoute**: Role-based route protection

### UI Components
- Uses shadcn/ui component library
- **Badge**: Status and role indicators
- **Table**: Data display with actions
- **Tabs**: Interface organization
- **Cards**: Information layout

## Testing & Development

### Admin System Testing
1. Register first user (becomes admin automatically)
2. Register second user (requires approval)
3. Test admin dashboard functionality
4. Test CLI tool commands
5. Test role-based route protection

### Database Testing
```bash
# View database in GUI
cd backend && npx prisma studio

# Reset database (WARNING: destroys data)
rm backend/prisma/pterodeploy.db
cd backend && npx prisma migrate dev

# Emergency admin creation
cd backend && node admin-cli.js create-admin emergency password123
```

## Deployment Considerations

### Environment Variables
- `JWT_SECRET`: Secure JWT signing key
- `SECRET_ENCRYPTION_KEY`: AES-256-GCM key for API credential encryption (NEW)
- `REDIS_URL`: Redis connection string for BullMQ (NEW)
- `NODE_ENV`: production/development
- `PORT`: Server port (default: 3001)

### Security Checklist
- [ ] Change default JWT secret in production
- [ ] Generate secure SECRET_ENCRYPTION_KEY (32 bytes) (NEW)
- [ ] Configure proper CORS origins
- [ ] Set up proper rate limiting
- [ ] Secure Redis instance with authentication (NEW)
- [ ] Validate all Modrinth URLs and ZIP files (NEW)
- [ ] Secure admin CLI access (server-only)
- [ ] Regular database backups
- [ ] Monitor admin actions and processing jobs

## Official Technology Stack

**Backend**: TypeScript + Express.js + Prisma + SQLite + Socket.IO + JWT + bcrypt + BullMQ + Redis
**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + shadcn/ui
**External APIs**: Modrinth API (labrinth.rest) + Pterodactyl Panel API
**Architecture**: Nest & Egg Factory with asynchronous processing pipeline and Pterodactyl integration

## User Flow Summary

**PteroDeploy (Processing)**: User submits Modrinth URL → Intelligent analysis → Egg generation → Deploy to Pterodactyl
**Pterodactyl (Deployment)**: User creates server → Selects "PD-Minecraft-Modded" nest → Selects generated egg → 1-click deployment
**Result**: Fully configured modded Minecraft server ready for players

## MCP (Model Context Protocol) Configuration

The project includes MCP server configuration for enhanced Claude Code capabilities:

**Puppeteer MCP Server**: Browser automation and web scraping capabilities
- Configuration: `.claude/.mcp.json` and `.claude/settings.json`
- Package: `puppeteer-mcp-server` (community implementation)
- Capabilities: Web navigation, screenshots, data extraction, JavaScript execution
- Security: Headless mode with sandbox restrictions

See `.claude/README.md` for detailed MCP setup and usage information.

## Important Implementation Notes

### Nest & Egg Factory Architecture
- PteroDeploy focuses on intelligent configuration generation, not server management
- Pterodactyl handles all server lifecycle, monitoring, and user interaction
- Clean separation of concerns provides better user experience and maintainability
- Generated eggs include install scripts for automatic server pack deployment

### Processing Pipeline Architecture
- All long-running operations use BullMQ for async processing
- Real-time progress updates via Socket.IO for user feedback
- Comprehensive error handling and retry logic for reliability
- Job persistence allows recovery from system restarts

### Pterodactyl Integration
- Encrypted API credential storage with AES-256-GCM
- Dynamic nest creation for organized egg management
- Intelligent Docker image selection based on Minecraft version
- Server pack pre-processing for optimal deployment

### Code Patterns
- Always use role-based checks for admin functionality
- Include proper error handling in async processing operations
- Follow existing TypeScript patterns and interfaces
- Use existing UI components and styling conventions
- Validate all external API inputs (Modrinth URLs, file uploads)

### Security Considerations
- All Pterodactyl API keys encrypted at rest
- Secure file processing with ZIP bomb protection
- Input validation for all user-submitted URLs and files
- Rate limiting for API requests to prevent abuse

### Development Roadmap
- See `docs/ROADMAP_PLAN.md` for complete implementation plan
- Phase 1: Core processing pipeline and Modrinth integration
- Phase 2: Advanced file management and optimization
- Phase 3: Multi-platform support (CurseForge, ATLauncher)
- Phase 4: Enterprise features and community marketplace