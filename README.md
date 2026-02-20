# FleetFlow - Fleet Management System

A comprehensive fleet management system built with Next.js 14+, Prisma, and PostgreSQL (Supabase). FleetFlow optimizes the complete lifecycle of a delivery fleet with real-time tracking, driver safety monitoring, and financial analytics.

## Features

- **Role-Based Access Control**: Fleet Manager, Dispatcher, and Driver roles with granular permissions
- **Vehicle Management**: Complete asset lifecycle tracking with status management
- **Trip Dispatcher**: Automated validation for cargo weight, driver licenses, and vehicle availability
- **Maintenance Tracking**: Service logs with automatic vehicle status updates
- **Financial Analytics**: Fuel consumption, operational costs, and ROI calculations
- **Driver Compliance**: License expiry tracking and safety score monitoring
- **Real-Time Dashboard**: Live KPIs and operational metrics
- **Audit Trail**: Complete logging of all critical operations

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, React Server Components
- **Backend**: Next.js API Routes with server actions
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Validation**: Zod
- **Testing**: Vitest with Property-Based Testing (fast-check)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)
- Git

## Quick Start

**New to FleetFlow?** Follow our [Quick Start Guide](docs/QUICK_START.md) for a 5-minute setup!

### 1. Clone and Install

```bash
git clone <repository-url>
cd fleetflow
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
copy .env.example .env

# Edit .env with your Supabase credentials
# See docs/DATABASE_SETUP.md for detailed instructions
```

### 3. Initialize Database

```bash
# Run automated setup
npm run db:setup

# Or manually:
npm run db:generate
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
fleetflow/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── layout.js          # Root layout
│   └── page.js            # Home page
├── lib/                   # Shared utilities
│   └── prisma.js          # Prisma client instance
├── prisma/                # Database schema and migrations
│   └── schema.prisma      # Database schema
├── tests/                 # Test files
├── docs/                  # Documentation
│   └── DATABASE_SETUP.md  # Database setup guide
├── scripts/               # Utility scripts
│   └── setup-db.js        # Database initialization script
└── .kiro/specs/fleetflow/ # Feature specifications
    ├── requirements.md    # System requirements
    ├── design.md          # Technical design
    └── tasks.md           # Implementation tasks
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:setup         # Initialize database (first time)
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma Client
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
```

## Database Setup

For detailed database setup instructions, see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

Quick summary:
1. Create a Supabase project
2. Copy the connection string
3. Update `DATABASE_URL` in `.env`
4. Run `npm run db:setup`

## Development Workflow

This project follows a spec-driven development approach:

1. **Requirements** → Define acceptance criteria
2. **Design** → Create technical architecture
3. **Tasks** → Break down into implementation steps
4. **Implementation** → Build features incrementally
5. **Testing** → Validate with unit and property-based tests

See `.kiro/specs/fleetflow/tasks.md` for the complete implementation plan.

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Database
DATABASE_URL              # Supabase PostgreSQL connection string

# Authentication
NEXTAUTH_URL              # Application URL (http://localhost:3000 for dev)
NEXTAUTH_SECRET           # Secret key for JWT signing

# Email (for password reset and invitations)
EMAIL_SERVER_HOST         # SMTP server host
EMAIL_SERVER_PORT         # SMTP server port
EMAIL_SERVER_USER         # SMTP username
EMAIL_SERVER_PASSWORD     # SMTP password
EMAIL_FROM                # From email address
```

## User Roles

### Fleet Manager
- Full system access
- Vehicle and driver management
- Financial analytics and reports
- User invitation and management

### Dispatcher
- Trip creation and management
- Vehicle and driver assignment
- Expense logging
- Operations dashboard

### Driver
- View assigned trips
- Update trip status
- Report issues
- View personal performance metrics

## Testing

FleetFlow uses a comprehensive testing strategy:

- **Unit Tests**: Validate specific functions and edge cases
- **Property-Based Tests**: Verify universal correctness properties
- **Integration Tests**: Test complete user workflows

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Contributing

1. Follow the implementation tasks in `.kiro/specs/fleetflow/tasks.md`
2. Write tests for all new features
3. Ensure all tests pass before committing
4. Follow the existing code style

## License

[Your License Here]

## Support

For issues and questions:
- Check [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for setup help
- Review the spec files in `.kiro/specs/fleetflow/`
- Open an issue on GitHub

## Roadmap

See `.kiro/specs/fleetflow/tasks.md` for the complete implementation roadmap.

Current status: Task 1 Complete - Project and database infrastructure initialized
