# Notification System

The notification system provides a centralized way to send and manage notifications for critical events in the FleetFlow application.

## Features

- Send notifications to specific users
- Automatic notifications for trip issues and breakdowns
- License expiry warnings for drivers
- Mark notifications as read/unread
- Get unread notification count
- Role-based access control

## Service Functions

### `sendNotification(userIds, type, message, metadata)`

Send notification to specific users.

**Parameters:**
- `userIds` (Array<string>): Array of user IDs to notify
- `type` (string): Notification type (e.g., 'TRIP_ISSUE', 'BREAKDOWN', 'LICENSE_EXPIRY')
- `message` (string): Notification message
- `metadata` (Object): Optional metadata object

**Returns:** Promise<Array> - Created notification records

**Example:**
```javascript
import { sendNotification } from '@/lib/notification-service'

const notifications = await sendNotification(
  ['user-id-1', 'user-id-2'],
  'TRIP_ISSUE',
  'Vehicle breakdown reported on trip ABC123',
  {
    tripId: 'trip-123',
    vehicleId: 'vehicle-456',
    issueType: 'breakdown'
  }
)
```

### `notifyTripIssue(tripId, issueData)`

Notify Fleet Managers and Dispatchers about a trip issue.

**Parameters:**
- `tripId` (string): Trip ID
- `issueData` (Object): Issue details
  - `issueDescription` (string): Description of the issue
  - `issueType` (string): Type of issue (e.g., 'breakdown', 'delay')

**Returns:** Promise<Array> - Created notification records

**Example:**
```javascript
import { notifyTripIssue } from '@/lib/notification-service'

const notifications = await notifyTripIssue('trip-123', {
  issueDescription: 'Vehicle breakdown on highway',
  issueType: 'breakdown'
})
```

### `notifyLicenseExpiry(driverId)`

Notify driver and Fleet Managers about license expiry.

**Parameters:**
- `driverId` (string): Driver ID

**Returns:** Promise<Array> - Created notification records

**Example:**
```javascript
import { notifyLicenseExpiry } from '@/lib/notification-service'

const notifications = await notifyLicenseExpiry('driver-123')
```

### `getUserNotifications(userId, options)`

Get notifications for a specific user.

**Parameters:**
- `userId` (string): User ID
- `options` (Object): Query options
  - `unreadOnly` (boolean): Only return unread notifications
  - `limit` (number): Limit number of results

**Returns:** Promise<Array> - List of notifications

**Example:**
```javascript
import { getUserNotifications } from '@/lib/notification-service'

// Get all notifications
const allNotifications = await getUserNotifications('user-123')

// Get only unread notifications
const unreadNotifications = await getUserNotifications('user-123', {
  unreadOnly: true
})

// Get last 10 notifications
const recentNotifications = await getUserNotifications('user-123', {
  limit: 10
})
```

### `markNotificationAsRead(notificationId, userId)`

Mark notification as read.

**Parameters:**
- `notificationId` (string): Notification ID
- `userId` (string): User ID (for authorization check)

**Returns:** Promise<Object> - Updated notification record

**Example:**
```javascript
import { markNotificationAsRead } from '@/lib/notification-service'

const notification = await markNotificationAsRead('notif-123', 'user-123')
```

### `getUnreadNotificationCount(userId)`

Get unread notification count for a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise<number> - Count of unread notifications

**Example:**
```javascript
import { getUnreadNotificationCount } from '@/lib/notification-service'

const count = await getUnreadNotificationCount('user-123')
console.log(`You have ${count} unread notifications`)
```

### `markAllNotificationsAsRead(userId)`

Mark all notifications as read for a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise<Object> - Update result with count

**Example:**
```javascript
import { markAllNotificationsAsRead } from '@/lib/notification-service'

const result = await markAllNotificationsAsRead('user-123')
console.log(`${result.count} notifications marked as read`)
```

## API Endpoints

### `GET /api/notifications`

List notifications for the authenticated user.

**Query Parameters:**
- `unreadOnly` (boolean): Only return unread notifications
- `limit` (number): Limit number of results

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-123",
      "userId": "user-123",
      "type": "TRIP_ISSUE",
      "message": "Issue reported on trip...",
      "metadata": {},
      "read": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1,
  "unreadCount": 5
}
```

### `PATCH /api/notifications`

Mark all notifications as read for the authenticated user.

**Response:**
```json
{
  "success": true,
  "message": "5 notifications marked as read",
  "count": 5
}
```

### `PATCH /api/notifications/:id/read`

Mark a specific notification as read.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "notif-123",
    "userId": "user-123",
    "type": "TRIP_ISSUE",
    "message": "Issue reported on trip...",
    "read": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Notification marked as read"
}
```

### `POST /api/notifications/send`

Send notification to specific users (internal use only).

**Access:** FLEET_MANAGER, DISPATCHER only

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2"],
  "type": "CUSTOM_NOTIFICATION",
  "message": "Custom notification message",
  "metadata": {
    "customField": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 2,
  "message": "2 notifications sent successfully"
}
```

## Notification Types

- `TRIP_ISSUE`: General trip issue reported
- `BREAKDOWN`: Vehicle breakdown reported
- `LICENSE_EXPIRY`: Driver license expiring or expired
- `MAINTENANCE_ALERT`: Maintenance required
- `CUSTOM_NOTIFICATION`: Custom notification from admin

## Permissions

- **All Users**: Can read their own notifications and mark them as read
- **FLEET_MANAGER**: Can send custom notifications
- **DISPATCHER**: Can send custom notifications
- **DRIVER**: Can only read and update their own notifications

## Integration with Other Services

The notification system is automatically integrated with:

1. **Trip Service**: Automatically creates notifications when trip issues are reported
2. **Driver Service**: Can trigger license expiry notifications
3. **Maintenance Service**: Can trigger maintenance alert notifications

## Best Practices

1. Always include meaningful metadata with notifications for context
2. Use appropriate notification types for filtering and categorization
3. Keep notification messages concise and actionable
4. Clean up old read notifications periodically to maintain performance
5. Use the `notifyTripIssue` and `notifyLicenseExpiry` helper functions instead of calling `sendNotification` directly when possible

## Error Handling

All notification service functions throw errors with the following structure:

```javascript
{
  message: 'Error description',
  type: 'ERROR_TYPE', // e.g., 'VALIDATION_ERROR', 'NOT_FOUND_ERROR'
  status: 400 // HTTP status code
}
```

Common error types:
- `VALIDATION_ERROR`: Invalid input parameters
- `NOT_FOUND_ERROR`: Resource not found
- `AUTHORIZATION_ERROR`: User not authorized to perform action
