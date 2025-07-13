# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PteroDeploy is an AI-powered conversational deployment assistant for Minecraft servers. It's a full-stack TypeScript application with a React frontend and Express.js backend using Prisma ORM with SQLite, featuring a comprehensive role-based admin system for user management.

## Development Commands

The project uses a monorepo structure with separate backend and frontend directories:

```bash
# Install all dependencies
npm run install:all

# Development (runs both services concurrently)
npm run dev

# Individual services
npm run dev:backend   # Backend on port 3001
npm run dev:frontend  # Frontend on port 5173

# Build
npm run build         # Build both services
npm run build:backend # Backend TypeScript compilation
npm run build:frontend # Frontend Vite build

# Database operations (from root)
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run database migrations  
npm run db:studio     # Open Prisma Studio

# Individual service commands
cd backend && npm run dev    # Backend development
cd frontend && npm run dev   # Frontend development
cd frontend && npm run lint  # Frontend linting

# Admin CLI tool (emergency access)
cd backend && node admin-cli.js [command]
```

## Directory Structure

```
pterodeploy/
├── backend/                 # Express.js API server
│   ├── src/                # Server source code
│   │   ├── routes/         # API endpoints
│   │   │   ├── auth.ts     # Authentication routes (login, register, me)
│   │   │   ├── admin.ts    # Admin management routes (NEW)
│   │   │   ├── deployments.ts # Deployment management
│   │   │   └── templates.ts # Template management
│   │   ├── middleware/     # Express middleware
│   │   │   └── auth.ts     # JWT authentication middleware
│   │   ├── socket/         # Socket.IO handlers
│   │   └── utils/          # Utilities and database seeding
│   ├── prisma/             # Database schema and migrations
│   │   ├── schema.prisma   # Database schema with user roles
│   │   └── migrations/     # Auto-generated migrations
│   ├── admin-cli.js        # Emergency admin CLI tool (NEW)
│   └── package.json        # Backend dependencies
├── frontend/               # React application
│   ├── src/                # Frontend source code
│   │   ├── components/     # UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── layout/     # Layout components (sidebar, header)
│   │   │   └── auth/       # Auth components (protected routes)
│   │   ├── pages/          # Page components
│   │   │   ├── admin-page.tsx # Admin dashboard (NEW)
│   │   │   ├── login-page.tsx # Login page
│   │   │   ├── register-page.tsx # Registration page
│   │   │   └── ... # Other pages
│   │   ├── contexts/       # React contexts
│   │   │   ├── auth-context.tsx # Auth state management
│   │   │   └── socket-context.tsx # Socket.IO context
│   │   ├── stores/         # Zustand stores
│   │   │   └── auth-store.ts # Auth store with role support (UPDATED)
│   │   └── lib/           # Utilities and API client
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── docs/                   # Project documentation
├── scripts/                # Utility scripts
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
- **Real-time**: Socket.IO for deployment updates
- **Security**: Helmet, CORS, rate limiting, Morgan logging
- **API Structure**: RESTful routes (`/api/auth`, `/api/admin`, `/api/deployments`, `/api/templates`)
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

#### Other Models
- **Deployments**: Minecraft server deployment tracking
- **DeploymentSteps**: Granular step tracking for each deployment
- **Templates**: Pre-configured modpack templates

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

#### Core Application
- **SocketContext**: Real-time communication for deployment progress
- **DeploymentStore**: Zustand store managing deployment state and step updates
- **Dashboard Layout**: Main application shell with dynamic sidebar
- **Deployment Chat**: Real-time deployment progress with chat-like interface

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
4. **Real-time Updates**: Socket.IO handles deployment progress
5. **Authentication**: JWT tokens with role info stored in Zustand + localStorage
6. **Admin Access**: All admin routes require authentication + admin role
7. **Emergency Access**: CLI tool for direct database management

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

### Application Routes
- `GET|POST /api/deployments` - Deployment management
- `GET /api/templates` - Template management

## Component Architecture

### Admin Dashboard Components
- **AdminPage**: Main admin interface with tabs and stats
- **UserManagementTable**: User list with action buttons
- **AdminStats**: Statistics cards for dashboard
- **RoleBadge/StatusBadge**: UI components for user status

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
- `NODE_ENV`: production/development
- `PORT`: Server port (default: 3001)

### Security Checklist
- [ ] Change default JWT secret in production
- [ ] Configure proper CORS origins
- [ ] Set up proper rate limiting
- [ ] Secure admin CLI access (server-only)
- [ ] Regular database backups
- [ ] Monitor admin actions

## Official Technology Stack

**Backend**: TypeScript + Express.js + Prisma + SQLite + Socket.IO + JWT + bcrypt
**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + shadcn/ui
**Architecture**: Monorepo with separate backend/frontend services + admin system

## MCP (Model Context Protocol) Configuration

The project includes MCP server configuration for enhanced Claude Code capabilities:

**Puppeteer MCP Server**: Browser automation and web scraping capabilities
- Configuration: `.claude/.mcp.json` and `.claude/settings.json`
- Package: `puppeteer-mcp-server` (community implementation)
- Capabilities: Web navigation, screenshots, data extraction, JavaScript execution
- Security: Headless mode with sandbox restrictions

See `.claude/README.md` for detailed MCP setup and usage information.

## Important Implementation Notes

### Admin System Integration
- All existing authentication flows updated to support roles
- Backward compatibility maintained through database migrations
- Emergency CLI tool prevents admin lockout scenarios
- Multi-level admin access ensures system reliability

### Code Patterns
- Always use role-based checks for admin functionality
- Include proper error handling in admin operations
- Follow existing TypeScript patterns and interfaces
- Use existing UI components and styling conventions

### Future Development
- Deployment functionality is still placeholder - needs implementation
- Template system could be enhanced with dynamic modpack integration
- Real-time notifications for admin actions could be added
- Audit logging for admin operations should be considered