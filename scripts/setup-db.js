#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script helps initialize the FleetFlow database:
 * 1. Generates Prisma Client
 * 2. Creates and applies initial migration
 * 3. Verifies database connection
 * 
 * Usage: node scripts/setup-db.js
 */

const { execSync } = require('child_process')

console.log('🚀 FleetFlow Database Setup\n')

try {
  // Step 1: Generate Prisma Client
  console.log('📦 Generating Prisma Client...')
  execSync('npx prisma generate', { stdio: 'inherit' })
  console.log('✅ Prisma Client generated\n')

  // Step 2: Create and apply migration
  console.log('🔄 Creating initial migration...')
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' })
  console.log('✅ Migration applied\n')

  // Step 3: Verify connection
  console.log('🔍 Verifying database connection...')
  execSync('npx prisma db pull --force', { stdio: 'inherit' })
  console.log('✅ Database connection verified\n')

  console.log('🎉 Database setup complete!')
  console.log('\nNext steps:')
  console.log('  1. Run "npm run dev" to start the development server')
  console.log('  2. Visit http://localhost:3000')
  
} catch (error) {
  console.error('\n❌ Setup failed!')
  console.error('\nPlease ensure:')
  console.error('  1. Your DATABASE_URL in .env is correctly configured')
  console.error('  2. Your Supabase database is accessible')
  console.error('  3. You have network connectivity\n')
  console.error('Error details:', error.message)
  process.exit(1)
}
