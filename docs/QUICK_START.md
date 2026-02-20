# FleetFlow Quick Start Guide

This guide will help you get FleetFlow up and running in minutes.

## ✅ Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn installed (`npm --version`)
- [ ] Git installed (optional, for cloning)
- [ ] A Supabase account (sign up at [supabase.com](https://supabase.com))

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
npm install
```

### Step 2: Verify Setup (30 seconds)

```bash
npm run verify
```

You should see all checks passing ✅

### Step 3: Configure Database (2 min)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose a name and password
   - Wait for provisioning (~2 minutes)

2. **Get Connection String**
   - In Supabase dashboard: Settings → Database
   - Copy the "URI" connection string
   - It looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

3. **Update Environment**
   ```bash
   # Edit .env file
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   ```

4. **Generate NextAuth Secret**
   ```bash
   # Windows (PowerShell)
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   
   # Or use online generator: https://generate-secret.vercel.app/32
   ```
   
   Add to `.env`:
   ```env
   NEXTAUTH_SECRET="your-generated-secret-here"
   ```

### Step 4: Initialize Database (1 min)

```bash
npm run db:setup
```

This will:
- Generate Prisma Client
- Create database tables
- Verify connection

### Step 5: Start Development (30 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 🎯 What's Next?

Now that your environment is set up, you can:

1. **Explore the Database**
   ```bash
   npm run db:studio
   ```
   Opens Prisma Studio to view your database

2. **Review the Specs**
   - Check `.kiro/specs/fleetflow/requirements.md` for system requirements
   - Review `.kiro/specs/fleetflow/design.md` for architecture
   - Follow `.kiro/specs/fleetflow/tasks.md` for implementation tasks

3. **Start Building**
   - Task 1 ✅ Complete (Project initialization)
   - Task 2: Implement database schema and migrations
   - Task 3: Create data validation schemas
   - And so on...

## 🔧 Troubleshooting

### "Can't reach database server"

**Problem**: Database connection fails

**Solution**:
1. Verify `DATABASE_URL` in `.env` is correct
2. Ensure password is properly URL-encoded
3. Check that `?sslmode=require` is appended
4. Verify your Supabase project is active

### "Module not found"

**Problem**: Missing dependencies

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### "Port 3000 already in use"

**Problem**: Another process is using port 3000

**Solution**:
```bash
# Use a different port
PORT=3001 npm run dev
```

Or kill the process using port 3000:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

## 📚 Additional Resources

- [Database Setup Guide](./DATABASE_SETUP.md) - Detailed database configuration
- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [Prisma Documentation](https://www.prisma.io/docs) - Database ORM guide
- [Supabase Documentation](https://supabase.com/docs) - Supabase features

## 🆘 Need Help?

1. Check the [DATABASE_SETUP.md](./DATABASE_SETUP.md) guide
2. Review error messages carefully
3. Ensure all prerequisites are met
4. Verify environment variables are correct

## ✨ Success Indicators

You'll know everything is working when:

- ✅ `npm run verify` shows all checks passing
- ✅ `npm run db:setup` completes without errors
- ✅ `npm run dev` starts the server
- ✅ You can access http://localhost:3000
- ✅ `npm run db:studio` opens Prisma Studio

Happy coding! 🚀
