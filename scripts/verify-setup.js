#!/usr/bin/env node

/**
 * Setup Verification Script
 * 
 * Verifies that the FleetFlow project is properly initialized
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 FleetFlow Setup Verification\n')

const checks = [
  {
    name: 'Next.js Configuration',
    check: () => fs.existsSync('next.config.js'),
    message: 'next.config.js exists'
  },
  {
    name: 'Prisma Schema',
    check: () => fs.existsSync('prisma/schema.prisma'),
    message: 'prisma/schema.prisma exists'
  },
  {
    name: 'Prisma Client Utility',
    check: () => fs.existsSync('lib/prisma.js'),
    message: 'lib/prisma.js exists'
  },
  {
    name: 'Environment Template',
    check: () => fs.existsSync('.env.example'),
    message: '.env.example exists'
  },
  {
    name: 'Environment Configuration',
    check: () => fs.existsSync('.env'),
    message: '.env exists'
  },
  {
    name: 'Package Dependencies',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      return pkg.dependencies['next'] && 
             pkg.dependencies['@prisma/client'] &&
             pkg.dependencies['next-auth'] &&
             pkg.dependencies['zod']
    },
    message: 'All required dependencies installed'
  },
  {
    name: 'App Router Setup',
    check: () => fs.existsSync('app/layout.js') && fs.existsSync('app/page.js'),
    message: 'Next.js App Router configured'
  },
  {
    name: 'Database Scripts',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      return pkg.scripts['db:setup'] && 
             pkg.scripts['db:migrate'] &&
             pkg.scripts['db:generate']
    },
    message: 'Database management scripts available'
  },
  {
    name: 'Documentation',
    check: () => fs.existsSync('docs/DATABASE_SETUP.md'),
    message: 'Database setup documentation exists'
  }
]

let passed = 0
let failed = 0

checks.forEach(({ name, check, message }) => {
  try {
    if (check()) {
      console.log(`✅ ${name}: ${message}`)
      passed++
    } else {
      console.log(`❌ ${name}: Check failed`)
      failed++
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`)
    failed++
  }
})

console.log(`\n📊 Results: ${passed}/${checks.length} checks passed`)

if (failed === 0) {
  console.log('\n🎉 Setup verification complete! All checks passed.')
  console.log('\nNext steps:')
  console.log('  1. Configure your .env file with Supabase credentials')
  console.log('  2. Run "npm run db:setup" to initialize the database')
  console.log('  3. Run "npm run dev" to start development')
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.')
  process.exit(1)
}
