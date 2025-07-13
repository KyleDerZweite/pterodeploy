# PteroDeploy 🚀

**AI-powered conversational deployment assistant for Minecraft servers with comprehensive admin management.**

PteroDeploy provides an intuitive web interface for deploying and managing Minecraft servers, featuring real-time deployment tracking, pre-configured modpack templates, and a robust user management system.

## ✨ Features

- 🤖 **AI-Powered Interface**: Conversational deployment assistant
- 👑 **Admin Dashboard**: Complete user management and approval system
- 🚀 **Real-time Tracking**: Live deployment progress with Socket.IO
- 📋 **Modpack Templates**: Pre-configured server templates (All The Mods, RLCraft, SkyFactory, etc.)
- 🔐 **Secure Authentication**: JWT-based auth with role-based access control
- 📱 **Modern UI**: Responsive React interface with dark/light themes
- 🛡️ **Multi-level Admin Access**: Web dashboard, database GUI, and emergency CLI

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pterodeploy

# Install all dependencies
npm run install:all

# Start both services
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 👥 User Management

### First-Time Setup

1. **First User Registration**: The first person to register automatically becomes an admin
2. **Subsequent Users**: All other registrations require admin approval

### Admin Access

Once logged in as an admin, you'll see an "Admin Dashboard" option in the sidebar where you can:
- ✅ Approve/reject user registrations
- 👑 Promote users to admin
- 📊 View system statistics
- 🗑️ Delete user accounts
- 📋 Monitor user activity

## 🛠️ Admin Tools

### 1. Web Admin Dashboard
Navigate to `/admin` after logging in as an admin for the full management interface.

### 2. Database GUI (Prisma Studio)
```bash
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

### 3. Emergency CLI Tool
For direct server access when locked out:

```bash
cd backend

# List all users
node admin-cli.js list-users

# Approve a pending user
node admin-cli.js approve username

# Promote user to admin
node admin-cli.js make-admin username

# Create emergency admin
node admin-cli.js create-admin newadmin secretpassword

# Reset user password
node admin-cli.js reset-password username newpassword

# Show all commands
node admin-cli.js --help
```

## 🚦 User Registration Flow

1. **New User Registers** → Status: `pending`
2. **Admin Reviews** → Approve/Reject via dashboard or CLI
3. **User Can Login** → Only after approval

### User Status Types
- **Pending** ⏳: Awaiting admin approval
- **Approved** ✅: Can access the system  
- **Rejected** ❌: Access denied

## 🎮 Using PteroDeploy

### For Regular Users
1. Register an account and wait for admin approval
2. Login and browse available modpack templates
3. Start a new deployment with your chosen modpack
4. Monitor progress in real-time via the dashboard
5. View deployment history and active servers

### For Admins
1. Access the admin dashboard from the sidebar
2. Review and approve new user registrations
3. Monitor system statistics and user activity
4. Manage user roles and permissions
5. Use CLI tools for emergency access

## 🔧 Development Commands

```bash
# Development
npm run dev              # Run both services
npm run dev:backend      # Backend only (port 3001)
npm run dev:frontend     # Frontend only (port 5173)

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:studio        # Open database GUI

# Build
npm run build            # Build both services
npm run build:backend    # Backend TypeScript compilation
npm run build:frontend   # Frontend Vite build

# Linting
cd frontend && npm run lint
```

## 🏗️ Technology Stack

**Backend**
- Node.js + TypeScript + Express.js
- SQLite + Prisma ORM
- Socket.IO for real-time updates
- JWT authentication with bcrypt
- Helmet + CORS for security

**Frontend**  
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- React Router v6 with protected routes
- React Hook Form + Zod validation

## 📁 Project Structure

```
pterodeploy/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API endpoints (auth, admin, deployments)
│   │   ├── middleware/     # Authentication middleware
│   │   ├── socket/         # Socket.IO handlers
│   │   └── utils/          # Utilities and database seeding
│   ├── prisma/             # Database schema and migrations
│   └── admin-cli.js        # Emergency admin CLI tool
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # UI components (shadcn/ui)
│   │   ├── pages/          # Page components including admin
│   │   ├── contexts/       # React contexts (auth, socket)
│   │   ├── stores/         # Zustand stores
│   │   └── lib/           # Utilities and API client
├── docs/                   # Project documentation
└── scripts/               # Utility scripts
```

## 🔒 Security Features

- **Role-based Access Control**: Admin vs User permissions
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Protected Routes**: Frontend route protection
- **Rate Limiting**: API request limiting
- **CORS Configuration**: Secure cross-origin requests
- **Emergency CLI Access**: Direct database management for lockout scenarios

## 🚨 Troubleshooting

### Can't Login After Updates
If you can't login after system updates:
1. Clear browser localStorage
2. Use the CLI tool: `node admin-cli.js make-admin yourusername`
3. Or use Prisma Studio to manually update your user status

### Locked Out of Admin
Use the emergency CLI tool:
```bash
cd backend
node admin-cli.js create-admin emergency-admin your-secure-password
```

### Database Issues
```bash
# Reset database (WARNING: destroys data)
cd backend
rm prisma/pterodeploy.db
npx prisma migrate dev

# Or restore from backup if available
```

## 📚 Documentation

- **Technical Documentation**: See [CLAUDE.md](CLAUDE.md) for detailed implementation
- **Project Architecture**: Complete system overview and development guidelines
- **API Documentation**: RESTful endpoints for auth, admin, deployments, templates

## 🤝 Contributing

1. Review the technical documentation in `CLAUDE.md`
2. Follow the existing code patterns and TypeScript standards
3. Test admin functionality with the CLI tools
4. Ensure new features work with the role-based access system

## 📄 License

[Add your license information here]

---

**Need Help?** Check the admin dashboard, use the CLI tools, or review the technical documentation in `CLAUDE.md`.