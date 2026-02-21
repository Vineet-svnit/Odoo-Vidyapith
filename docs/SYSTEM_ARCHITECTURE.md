# FleetFlow System Architecture

This document provides a comprehensive overview of how all components in the FleetFlow system are wired together.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Fleet Manager│  │  Dispatcher  │  │    Driver    │      │
│  │      UI      │  │      UI      │  │      UI      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                       │
│              NextAuth.js + Session Management                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Authorization Layer                        │
│                  RBAC Middleware (lib/rbac.js)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Routes Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Vehicles │  │ Drivers  │  │  Trips   │  │   More   │   │
│  │   API    │  │   API    │  │   API    │  │   APIs   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Vehicle  │  │  Driver  │  │   Trip   │  │Financial │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Validation Layer                          │
│                  Zod Schemas (lib/validation.js)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│                  Prisma ORM (lib/prisma.js)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       Database Layer                         │
│                PostgreSQL (via Supabase)                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow

### Example: Creating a Trip (Dispatcher)

1. **UI Layer** (`app/dispatcher/dispatch/page.js`)
   - User fills trip creation form
   - Client-side validation via Zod schema
   - Form submits to API

2. **API Layer** (`app/api/trips/route.js`)
   - Request received by Next.js API route
   - RBAC middleware checks user session
   - Verifies user has DISPATCHER role
   - Verifies user has 'create' permission for 'trips'

3. **Service Layer** (`lib/trip-service.js`)
   - `validateTripCreation()` called
   - Checks cargo weight vs vehicle capacity
   - Checks driver license validity
   - Checks driver license category
   - Checks vehicle availability
   - Checks driver availability

4. **Validation Layer** (`lib/validation.js`)
   - Zod schema validates input data
   - Type checking and constraints enforced

5. **Data Access Layer** (`lib/prisma.js`)
   - Prisma creates trip record
   - Updates vehicle status to ON_TRIP
   - Updates driver status
   - Creates audit log entry

6. **Database Layer** (PostgreSQL)
   - Transaction committed
   - Foreign key constraints enforced
   - Data persisted

7. **Response Flow**
   - Success response sent to API layer
   - API layer returns to UI
   - UI updates optimistically
   - User redirected to trip detail page

## 📁 Directory Structure

```
fleetflow/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── vehicles/             # Vehicle CRUD
│   │   ├── drivers/              # Driver CRUD
│   │   ├── trips/                # Trip management
│   │   ├── maintenance/          # Maintenance logs
│   │   ├── expenses/             # Financial tracking
│   │   ├── analytics/            # Analytics & reports
│   │   ├── notifications/        # Notification system
│   │   └── audit-logs/           # Audit trail
│   ├── auth/                     # Auth UI pages
│   ├── fleet-manager/            # Fleet Manager UI
│   ├── dispatcher/               # Dispatcher UI
│   ├── driver/                   # Driver UI
│   ├── dashboard/                # Role-based dashboard
│   ├── layout.js                 # Root layout
│   ├── page.js                   # Root page (redirects)
│   └── providers.js              # Session provider
├── components/                   # Shared UI components
│   ├── Navigation.js             # Navigation bar
│   ├── StatusPill.js             # Status indicators
│   ├── DataTable.js              # Reusable table
│   ├── FilterBar.js              # Filter component
│   ├── KPICard.js                # KPI display
│   ├── VehicleFormModal.js       # Vehicle form
│   ├── DriverFormModal.js        # Driver form
│   ├── MaintenanceFormModal.js   # Maintenance form
│   └── ...                       # More components
├── lib/                          # Business logic & utilities
│   ├── auth.js                   # NextAuth config
│   ├── rbac.js                   # RBAC middleware
│   ├── validation.js             # Zod schemas
│   ├── prisma.js                 # Prisma client
│   ├── vehicle-service.js        # Vehicle logic
│   ├── driver-service.js         # Driver logic
│   ├── trip-service.js           # Trip logic
│   ├── maintenance-service.js    # Maintenance logic
│   ├── financial-service.js      # Financial logic
│   ├── analytics-service.js      # Analytics logic
│   ├── notification-service.js   # Notification logic
│   └── audit-service.js          # Audit logging
├── prisma/                       # Database schema
│   └── schema.prisma             # Prisma schema
├── scripts/                      # Utility scripts
│   ├── integration-test.js       # Integration tests
│   └── verify-setup.js           # Setup verification
└── docs/                         # Documentation
    ├── INTEGRATION_VERIFICATION.md
    ├── SYSTEM_ARCHITECTURE.md
    └── ...
```

## 🔐 Authentication & Authorization

### Authentication Flow

1. **Login** (`app/auth/signin/page.js`)
   - User enters email/password
   - Submits to NextAuth via `signIn()`
   - NextAuth validates credentials (`lib/auth.js`)
   - JWT token issued with user ID and role
   - Session created

2. **Session Management**
   - Session stored in JWT
   - Session includes: `{ user: { id, email, role } }`
   - Session validated on every request
   - Session expires after 30 days

3. **Protected Routes**
   - UI pages use `useSession()` hook
   - Check `status === 'authenticated'`
   - Redirect to `/auth/signin` if unauthenticated
   - Check user role and redirect if unauthorized

### Authorization Flow

1. **RBAC Middleware** (`lib/rbac.js`)
   - Wraps API routes with `withAuth()`
   - Extracts session from request
   - Checks user role against permission matrix
   - Allows or denies request

2. **Permission Matrix**
   ```javascript
   PERMISSIONS = {
     FLEET_MANAGER: {
       vehicles: ['create', 'read', 'update', 'delete'],
       drivers: ['create', 'read', 'update', 'suspend'],
       trips: ['read', 'cancel', 'reassign'],
       // ...
     },
     DISPATCHER: {
       vehicles: ['read'],
       drivers: ['read'],
       trips: ['create', 'read', 'update', 'cancel'],
       // ...
     },
     DRIVER: {
       trips: ['read_assigned', 'update_assigned'],
       // ...
     }
   }
   ```

3. **Data Filtering**
   - Drivers see only their assigned trips
   - Dispatchers see all trips
   - Fleet Managers see everything
   - Filtering applied at service layer

## 🔄 State Management

### Server State
- Fetched from API routes
- Cached by React Query (if implemented)
- Revalidated on mutations
- Optimistic updates for better UX

### Client State
- Session managed by NextAuth
- Form state managed by React hooks
- Modal state managed locally
- No global state management needed

### Real-Time Updates
- Status changes trigger immediate revalidation
- Optimistic UI updates
- Rollback on error
- Notifications for critical events

## 🗄️ Database Schema

### Core Models

1. **User** - Authentication and role assignment
2. **Vehicle** - Fleet assets with capacity and status
3. **Driver** - Driver profiles with license info
4. **Trip** - Cargo movements with validation
5. **MaintenanceLog** - Service records
6. **FuelLog** - Fuel consumption tracking
7. **Expense** - General expenses
8. **AuditLog** - Action audit trail
9. **Notification** - User notifications

### Relationships

```
User 1:1 Driver
Vehicle 1:N Trip
Driver 1:N Trip
Vehicle 1:N MaintenanceLog
Vehicle 1:N FuelLog
Vehicle 1:N Expense
Trip 1:N Expense
User 1:N AuditLog
```

## 🧩 Component Integration

### Shared Components

All shared components are exported from `components/index.js`:

```javascript
import { 
  Navigation,
  StatusPill, 
  DataTable, 
  KPICard,
  VehicleFormModal,
  // ...
} from '@/components'
```

### Component Usage

1. **Navigation** - Added to all authenticated pages
2. **StatusPill** - Shows vehicle/driver/trip status
3. **DataTable** - Displays lists with sorting/filtering
4. **KPICard** - Shows dashboard metrics
5. **FormModals** - Create/edit entities

## 🔧 Service Layer

### Service Functions

Each service module exports functions for business logic:

```javascript
// lib/trip-service.js
export async function validateTripCreation(tripData)
export async function createTrip(tripData, userId)
export async function updateTripStatus(tripId, status, metadata)
export async function completeTrip(tripId, finalOdometer)
export async function reportTripIssue(tripId, issueData)
```

### Service Responsibilities

1. **Validation** - Business rule enforcement
2. **Data Transformation** - Format data for database
3. **Cascade Operations** - Update related entities
4. **Audit Logging** - Log critical actions
5. **Notifications** - Send alerts

## 📊 Analytics & Reporting

### Analytics Service

Calculates metrics from raw data:

```javascript
// lib/analytics-service.js
export async function getFleetUtilization()
export async function calculateVehicleROI(vehicleId, dateRange)
export async function getFuelEfficiency(vehicleId, dateRange)
export async function getCostPerKm(vehicleId, dateRange)
export async function getCostTrends(vehicleId, groupBy)
```

### Financial Service

Tracks costs and expenses:

```javascript
// lib/financial-service.js
export async function getTotalOperationalCost(vehicleId, dateRange)
export async function createFuelLog(data)
export async function getMaintenanceCost(vehicleId, dateRange)
```

## 🔔 Notification System

### Notification Flow

1. **Event Occurs** (e.g., trip issue reported)
2. **Service Layer** calls `sendNotification()`
3. **Notification Service** creates notification records
4. **UI** polls or receives real-time updates
5. **User** sees notification in NotificationBell
6. **User** clicks notification → Marked as read

### Notification Types

- Trip issues
- License expiry warnings
- Maintenance alerts
- Emergency reassignments
- System alerts

## 📝 Audit Logging

### Audit Flow

1. **Critical Operation** performed
2. **Service Layer** calls `logAction()`
3. **Audit Service** creates audit log entry
4. **Log Includes**: user, action, resource, timestamp, metadata
5. **Fleet Manager** can view audit logs

### Audited Operations

- Vehicle CRUD
- Driver CRUD
- Trip creation/updates
- Maintenance logs
- Emergency reassignments
- Status changes

## 🧪 Testing Strategy

### Integration Tests

Run: `node scripts/integration-test.js`

Verifies:
- All API routes exist
- All UI pages exist
- RBAC middleware applied
- Authentication checks present
- Components exist
- Services exist
- Validation schemas exist
- Database schema correct
- Critical workflows complete

### Manual Testing

See `docs/INTEGRATION_VERIFICATION.md` for checklist

### Unit Tests

Individual service and component tests:
- `lib/*.test.js` - Service layer tests
- Component tests (if implemented)

## 🚀 Deployment Checklist

1. ✅ All integration tests pass
2. ✅ Environment variables configured
3. ✅ Database migrations applied
4. ✅ RBAC middleware on all protected routes
5. ✅ Authentication checks on all protected pages
6. ✅ Validation schemas on all forms
7. ✅ Audit logging on critical operations
8. ✅ Error boundaries on all pages
9. ✅ Loading states on all async operations
10. ✅ Responsive design on all pages

## 📚 Additional Resources

- [Integration Verification](./INTEGRATION_VERIFICATION.md)
- [Quick Start Guide](./QUICK_START.md)
- [RBAC Documentation](../lib/RBAC_README.md)
- [Notification System](../lib/NOTIFICATION_README.md)
- [Audit Logging](./AUDIT_LOGGING_IMPLEMENTATION.md)

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Status:** Production Ready
