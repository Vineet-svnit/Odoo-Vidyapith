# FleetFlow Database Setup Guide

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Node.js**: Version 18+ installed
3. **PostgreSQL Database**: Created in Supabase

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (takes ~2 minutes)
3. Note your project's database password (shown once during creation)

### 2. Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Find the **Connection String** section
3. Copy the **URI** format connection string
4. It should look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Update the `DATABASE_URL` in `.env` with your Supabase connection string:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   ```

3. Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Or use an online generator: [generate-secret.vercel.app](https://generate-secret.vercel.app/32)

4. Update other environment variables as needed (email configuration, etc.)

### 4. Initialize Database

Run the automated setup script:

```bash
npm run db:setup
```

This will:
- Generate the Prisma Client
- Create the initial database migration
- Apply the schema to your database
- Verify the connection

### 5. Verify Setup

Check that the database is properly configured:

```bash
npm run db:studio
```

This opens Prisma Studio where you can view your database tables.

## Manual Setup (Alternative)

If the automated script fails, run these commands individually:

```bash
# Generate Prisma Client
npm run db:generate

# Create and apply migration
npm run db:migrate

# Verify connection
npx prisma db pull --force
```

## Common Issues

### "Can't reach database server"

**Solution**: 
- Verify your `DATABASE_URL` is correct
- Ensure your IP is allowed in Supabase (Settings → Database → Connection Pooling)
- Check that `?sslmode=require` is appended to the connection string

### "Authentication failed"

**Solution**:
- Double-check your database password
- Reset the database password in Supabase if needed (Settings → Database → Database Password)

### "Migration failed"

**Solution**:
- Ensure no other migrations exist: delete `prisma/migrations` folder
- Run `npm run db:migrate` again

## Database Schema

The FleetFlow database includes the following tables:

- **User**: Authentication and user management
- **Vehicle**: Fleet vehicle assets
- **Driver**: Driver profiles and compliance
- **Trip**: Trip lifecycle and cargo tracking
- **MaintenanceLog**: Vehicle maintenance records
- **FuelLog**: Fuel consumption tracking
- **Expense**: Financial expense records
- **AuditLog**: System audit trail
- **Notification**: User notifications

## Next Steps

After successful database setup:

1. Start the development server: `npm run dev`
2. Proceed with Task 2: Implement database schema and migrations
3. Begin building authentication and core features

## Useful Commands

```bash
# Start development server
npm run dev

# Run database migrations
npm run db:migrate

# Generate Prisma Client
npm run db:generate

# Open Prisma Studio
npm run db:studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```
