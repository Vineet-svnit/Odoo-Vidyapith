# Error Handling and User Feedback

This document describes the standardized error handling and user feedback system implemented in FleetFlow.

## Overview

The error handling system provides:
- Consistent error messages across the application
- User-friendly error displays
- Error boundaries for React components
- Loading states and optimistic updates
- Standardized API error responses

## Components

### Error Boundaries

#### ErrorBoundary
Catches JavaScript errors in React component trees.

```javascript
import { ErrorBoundary } from '@/components'

<ErrorBoundary showDetails={false}>
  <YourComponent />
</ErrorBoundary>
```

#### PageErrorBoundary
Page-level error boundary with full-screen fallback UI.

```javascript
import { PageErrorBoundary } from '@/components'

<PageErrorBoundary>
  <YourPage />
</PageErrorBoundary>
```

### Error Display Components

#### ErrorMessage
Basic error message component with customizable styling.

```javascript
import { ErrorMessage } from '@/components'

<ErrorMessage
  title="Error"
  message="Something went wrong"
  type="error"
  onRetry={() => retry()}
  onDismiss={() => dismiss()}
/>
```

#### FormattedError
Displays errors with standardized formatting based on error type.

```javascript
import { FormattedError } from '@/components'

<FormattedError
  error={error}
  onRetry={() => retry()}
  onDismiss={() => dismiss()}
  showDetails={false}
/>
```

### Loading Components

#### LoadingSpinner
Simple loading spinner with optional message.

```javascript
import { LoadingSpinner } from '@/components'

<LoadingSpinner size="medium" message="Loading..." />
```

#### LoadingOverlay
Full-screen or container-level loading overlay.

```javascript
import { LoadingOverlay } from '@/components'

<LoadingOverlay show={loading} message="Saving..." fullScreen={true} />
```

#### Skeleton
Placeholder content while data is loading.

```javascript
import { Skeleton, TableSkeleton, CardSkeleton } from '@/components'

<Skeleton variant="text" count={3} />
<TableSkeleton rows={5} columns={4} />
<CardSkeleton count={3} />
```

#### AsyncButton
Button with built-in loading state for async operations.

```javascript
import { AsyncButton } from '@/components'

<AsyncButton
  onClick={async () => await saveData()}
  variant="primary"
  size="medium"
>
  Save
</AsyncButton>
```

## Hooks

### useAsync
Handle async operations with loading states.

```javascript
import { useAsync } from '@/hooks/useAsync'

const { execute, loading, error, data, reset } = useAsync(fetchData)

// Execute the async function
await execute(params)
```

### useOptimisticMutation
Handle mutations with optimistic updates and rollback.

```javascript
import { useOptimisticMutation } from '@/hooks/useAsync'

const { mutate, loading, error } = useOptimisticMutation(
  updateData,
  {
    onOptimisticUpdate: (data) => {
      // Apply optimistic update
      // Return rollback data
    },
    onRollback: (rollbackData) => {
      // Rollback on error
    },
    onSuccess: (result) => {
      // Handle success
    }
  }
)
```

## API Error Handling

### Error Types

```javascript
import { ERROR_TYPES } from '@/lib/error-messages'

ERROR_TYPES.AUTHENTICATION_ERROR
ERROR_TYPES.AUTHORIZATION_ERROR
ERROR_TYPES.VALIDATION_ERROR
ERROR_TYPES.BUSINESS_RULE_VIOLATION
ERROR_TYPES.CONFLICT_ERROR
ERROR_TYPES.NOT_FOUND_ERROR
ERROR_TYPES.SERVER_ERROR
ERROR_TYPES.NETWORK_ERROR
ERROR_TYPES.TIMEOUT_ERROR
```

### API Client

Use the API client for standardized error handling:

```javascript
import { get, post, put, patch, del } from '@/lib/api-client'

try {
  const data = await get('/api/vehicles')
  const created = await post('/api/vehicles', vehicleData)
  const updated = await put('/api/vehicles/123', vehicleData)
  const patched = await patch('/api/vehicles/123/status', { status: 'AVAILABLE' })
  await del('/api/vehicles/123')
} catch (error) {
  // Error is automatically formatted
  console.error(error.type, error.message)
}
```

### API Middleware

Use middleware for consistent API route error handling:

```javascript
import { withAuth, withPermission, withErrorHandling } from '@/lib/api-middleware'

// With authentication
export const GET = withAuth(async (req) => {
  // req.session is available
  return successResponse(data)
})

// With permission check
export const POST = withPermission('vehicles', 'create')(async (req) => {
  // User has permission
  return successResponse(data)
})

// With error handling only
export const GET = withErrorHandling(async (req) => {
  // Errors are automatically caught and formatted
  return successResponse(data)
})
```

### Custom Error Classes

```javascript
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ServerError
} from '@/lib/api-error'

// Throw custom errors
throw new ValidationError('Invalid input', [
  { field: 'email', message: 'Invalid email format' }
])

throw new BusinessRuleError('Vehicle not available')
```

## Error Messages

### Standardized Messages

All error types have standardized user-friendly messages defined in `lib/error-messages.js`.

### Specific Error Messages

Common scenarios have specific error messages:

```javascript
import { SPECIFIC_ERRORS } from '@/lib/error-messages'

SPECIFIC_ERRORS.VEHICLE_NOT_AVAILABLE
SPECIFIC_ERRORS.DRIVER_LICENSE_EXPIRED
SPECIFIC_ERRORS.TRIP_INVALID_STATUS_TRANSITION
// ... and more
```

### Getting Error Messages

```javascript
import { getErrorMessage } from '@/lib/error-messages'

const { title, message, action, details } = getErrorMessage(error)
```

## Best Practices

1. **Always use error boundaries** at page level to catch unexpected errors
2. **Show loading states** for all async operations
3. **Use optimistic updates** for better UX when appropriate
4. **Provide retry actions** for recoverable errors
5. **Log errors** to console in development, to monitoring service in production
6. **Use specific error messages** when possible for better user guidance
7. **Validate input** on both client and server
8. **Handle network errors** gracefully with retry options
9. **Show validation errors** inline with form fields when possible
10. **Test error scenarios** to ensure proper error handling

## Example: Complete Error Handling Flow

```javascript
'use client'

import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { post } from '@/lib/api-client'
import { FormattedError, AsyncButton, LoadingOverlay } from '@/components'

export default function CreateVehicleForm() {
  const [formData, setFormData] = useState({})
  const { execute, loading, error, reset } = useAsync(
    (data) => post('/api/vehicles', data)
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    reset() // Clear previous errors
    
    try {
      const result = await execute(formData)
      // Handle success
      console.log('Vehicle created:', result)
    } catch (err) {
      // Error is automatically set in state
      console.error('Failed to create vehicle:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <FormattedError
          error={error}
          onRetry={() => handleSubmit({ preventDefault: () => {} })}
          onDismiss={reset}
        />
      )}
      
      {/* Form fields */}
      
      <AsyncButton
        type="submit"
        loading={loading}
        variant="primary"
      >
        Create Vehicle
      </AsyncButton>
      
      <LoadingOverlay show={loading} message="Creating vehicle..." />
    </form>
  )
}
```

## Requirements Validation

This implementation satisfies:
- **Requirement 15.3**: Loading indicators and optimistic updates
- **Requirement 15.4**: Error boundaries and user-friendly error messages
