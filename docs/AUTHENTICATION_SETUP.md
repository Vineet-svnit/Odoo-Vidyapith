# Authentication System Implementation

## Overview

The authentication system for FleetFlow has been successfully implemented using NextAuth.js with email/password credentials, JWT sessions, password reset functionality, and an invitation system for user onboarding.

## Components Implemented

### 1. NextAuth.js Configuration (`lib/auth.js`)

- **Provider**: Credentials provider with email/password authentication
- **Session Strategy**: JWT-based sessions with 30-day expiration
- **Password Hashing**: bcrypt with 10 salt rounds
- **Session Callbacks**: Custom JWT and session callbacks to include user ID and role

### 2. Authentication API Routes

#### `/api/auth/[...nextauth]` - NextAuth Handler
- Handles all NextAuth.js authentication flows
- Supports sign in, sign out, and session management

#### `/api/auth/signin` - Sign In (POST)
- Validates email and password credentials
- Returns JWT token on successful authentication
- Implemented via NextAuth credentials provider

#### `/api/auth/forgot-password` - Password Reset Request (POST)
- Accepts email address
- Generates secure reset token (32-byte hex)
- Stores token in database with 1-hour expiration
- Sends reset email with link
- Returns success message (prevents email enumeration)

#### `/api/auth/reset-password` - Password Reset (POST)
- Validates reset token
- Checks token expiration and usage status
- Updates user password with new hash
- Marks token as used
- Validates password strength (minimum 8 characters)

#### `/api/auth/session` - Get Session (GET)
- Returns current user session
- Returns 401 if not authenticated

#### `/api/auth/invite` - Send Invitation (POST)
- **Authorization**: Fleet Manager only
- Accepts email and role (FLEET_MANAGER, DISPATCHER, DRIVER)
- Validates user doesn't already exist
- Generates secure invitation token (32-byte hex)
- Stores token with 7-day expiration
- Sends invitation email with acceptance link

#### `/api/auth/invitation/[token]` - Get Invitation Details (GET)
- Validates invitation token
- Returns invitation details (email, role, expiration)
- Returns error if token is invalid, expired, or used

#### `/api/auth/accept-invitation` - Accept Invitation (POST)
- Validates invitation token
- Creates user account with provided password
- For DRIVER role: creates driver profile with license information
- Marks invitation as used
- Validates password strength and license expiry

### 3. Database Models

#### PasswordResetToken
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

#### InvitationToken
```prisma
model InvitationToken {
  id        String   @id @default(cuid())
  token     String   @unique
  email     String
  role      Role
  invitedBy String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

### 4. UI Pages

#### `/auth/signin` - Sign In Page
- Email and password form
- Error handling and validation
- Link to forgot password page
- Success message display

#### `/auth/forgot-password` - Forgot Password Page
- Email input form
- Success message (prevents email enumeration)
- Link back to sign in

#### `/auth/reset-password` - Reset Password Page
- Token validation from URL query parameter
- New password and confirm password fields
- Password strength validation
- Redirects to sign in on success

#### `/auth/invitation/[token]` - Invitation Acceptance Page
- Fetches invitation details from API
- Dynamic form based on role (DRIVER requires additional fields)
- Driver-specific fields:
  - First Name
  - Last Name
  - License Number
  - License Category (A, B, C, D)
  - License Expiry Date
- Password and confirm password fields
- Creates account and redirects to sign in

#### `/dashboard` - Dashboard Page (Placeholder)
- Protected route requiring authentication
- Displays user email and role
- Sign out button
- Placeholder for future dashboard implementation

### 5. Session Management

#### SessionProvider (`app/providers.js`)
- Wraps entire application in NextAuth SessionProvider
- Enables `useSession` hook throughout the app
- Integrated into root layout

## Security Features

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **Secure Token Generation**: crypto.randomBytes(32) for reset and invitation tokens
3. **Token Expiration**: 
   - Password reset: 1 hour
   - Invitations: 7 days
4. **Single-Use Tokens**: Tokens marked as used after consumption
5. **Email Enumeration Prevention**: Same response for existing/non-existing emails
6. **Password Strength**: Minimum 8 characters required
7. **Role-Based Authorization**: Fleet Manager only for invitations
8. **JWT Sessions**: Stateless authentication with secure secret

## Email Configuration

Email functionality requires the following environment variables:

```env
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@example.com"
EMAIL_SERVER_PASSWORD="your-email-password"
EMAIL_FROM="noreply@fleetflow.com"
```

## Testing

Basic authentication tests implemented in `lib/auth.test.js`:
- User creation with password hashing
- Password verification
- Password reset token creation
- Invitation token creation

All tests passing ✓

## Requirements Validated

✅ **Requirement 1.1**: User authentication with email/password credentials
✅ **Requirement 1.2**: Password reset with secure token and email
✅ **Requirement 1.3**: Three distinct roles (FLEET_MANAGER, DISPATCHER, DRIVER)
✅ **Requirement 1.5**: Invitation system with secure tokens
✅ **Requirement 1.6**: Authorization checks (Fleet Manager only for invitations)

## Next Steps

The following tasks remain for complete authentication implementation:
- Task 4.4: Write property test for authentication round trip
- Task 4.5: Write property test for password reset tokens
- Task 4.6: Write property test for invitation tokens

These property-based tests will validate the authentication system across all possible inputs and edge cases.
