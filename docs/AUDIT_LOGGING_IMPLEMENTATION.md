# Audit Logging Implementation

## Overview

This document describes the audit logging system implemented for FleetFlow to track all critical operations and maintain a complete audit trail.

## Requirements Addressed

- **Requirement 9.6**: Audit Log Completeness - All user actions are logged with complete information including user ID, action type, resource, resource ID, timestamp, and metadata
- **Requirement 13.5**: Emergency Reassignment Audit Trail - Emergency reassignments are logged with original assignment, new assignment, reason, and timestamp

## Components Implemented

### 1. Audit Service (`lib/audit-service.js`)

Core service for audit logging functionality:

- `logAction(data)` - Creates audit log entries with validation
- `getAuditLogs(filters)` - Retrieves audit logs with filtering support
- `getAuditLogsCount(filters)` - Gets count of audit logs matching filters

**Filters supported:**
- userId
- action
- resource
- resourceId
- startDate / endDate (date range)
- limit / offset (pagination)

### 2. Audit Helpers (`lib/audit-helpers.js`)

Convenience functions and constants for consistent audit logging:

- `AUDIT_ACTIONS` - Constants for all audit action types
- `auditLog()` - Wrapper function with error handling
- `createVehicleAuditMetadata()` - Creates metadata for vehicle operations
- `createDriverAuditMetadata()` - Creates metadata for driver operations
- `createTripAuditMetadata()` - Creates metadata for trip operations

### 3. Audit Log API Route (`app/api/audit-logs/route.js`)

REST API endpoint for accessing audit logs:

- **GET /api/audit-logs** - List audit logs with filters
- **Access**: FLEET_MANAGER only
- **Query Parameters**: userId, action, resource, resourceId, startDate, endDate, limit, offset

### 4. Integration with Critical Operations

Audit logging has been integrated into the following API routes:

**Vehicle Operations:**
- POST /api/vehicles - CREATE_VEHICLE
- PUT /api/vehicles/:id - UPDATE_VEHICLE
- DELETE /api/vehicles/:id - DELETE_VEHICLE
- PATCH /api/vehicles/:id/status - UPDATE_VEHICLE_STATUS

**Driver Operations:**
- POST /api/drivers - CREATE_DRIVER
- PATCH /api/drivers/:id/status - UPDATE_DRIVER_STATUS / SUSPEND_DRIVER

**Trip Operations:**
- POST /api/trips - CREATE_TRIP
- PATCH /api/trips/:id/reassign - TRIP_REASSIGNMENT (already implemented)

**Maintenance Operations:**
- POST /api/maintenance - CREATE_MAINTENANCE
- PATCH /api/maintenance/:id/complete - COMPLETE_MAINTENANCE

## Audit Action Types

The following action types are tracked:

### Vehicle Actions
- CREATE_VEHICLE
- UPDATE_VEHICLE
- DELETE_VEHICLE
- UPDATE_VEHICLE_STATUS

### Driver Actions
- CREATE_DRIVER
- UPDATE_DRIVER
- UPDATE_DRIVER_STATUS
- SUSPEND_DRIVER

### Trip Actions
- CREATE_TRIP
- UPDATE_TRIP
- UPDATE_TRIP_STATUS
- CANCEL_TRIP
- COMPLETE_TRIP
- REPORT_TRIP_ISSUE
- TRIP_REASSIGNMENT

### Maintenance Actions
- CREATE_MAINTENANCE
- UPDATE_MAINTENANCE
- COMPLETE_MAINTENANCE

### Expense Actions
- CREATE_FUEL_LOG
- CREATE_EXPENSE

### Auth Actions
- USER_LOGIN
- USER_LOGOUT
- PASSWORD_RESET
- INVITE_USER
- ACCEPT_INVITATION

### Report Actions
- EXPORT_REPORT

## Usage Examples

### Creating an Audit Log Entry

```javascript
import { auditLog, AUDIT_ACTIONS, createVehicleAuditMetadata } from '@/lib/audit-helpers'

// After creating a vehicle
const vehicle = await createVehicle(vehicleData)

await auditLog(
  session.user.id,
  AUDIT_ACTIONS.CREATE_VEHICLE,
  'vehicle',
  vehicle.id,
  createVehicleAuditMetadata(vehicle)
)
```

### Querying Audit Logs

```javascript
// Get all audit logs for a specific user
GET /api/audit-logs?userId=user123

// Get all vehicle creation actions
GET /api/audit-logs?action=CREATE_VEHICLE&resource=vehicle

// Get audit logs for a date range
GET /api/audit-logs?startDate=2024-01-01&endDate=2024-12-31

// Get paginated results
GET /api/audit-logs?limit=50&offset=0
```

## Testing

Comprehensive tests have been implemented:

- **lib/audit-service.test.js** - Unit tests for audit service functions
- **app/api/audit-logs/route.test.js** - Integration tests for API route

All tests pass successfully.

## Security Considerations

1. **Access Control**: Only FLEET_MANAGER role can view audit logs
2. **Silent Failures**: Audit logging failures don't break main operations
3. **Validation**: All audit log data is validated before storage
4. **Immutability**: Audit logs cannot be modified or deleted through the API

## Database Schema

Audit logs are stored in the `AuditLog` table with the following structure:

```prisma
model AuditLog {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  action      String
  resource    String
  resourceId  String?
  metadata    Json?
  createdAt   DateTime  @default(now())
}
```

## Future Enhancements

Potential improvements for the audit logging system:

1. Add audit log retention policies
2. Implement audit log export functionality
3. Add real-time audit log streaming for monitoring
4. Create audit log analytics dashboard
5. Add audit log search with full-text search capabilities
