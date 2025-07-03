import type { Config } from 'drizzle-kit'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}

const isProduction = process.env.NODE_ENV === 'production'
const isSqlite = databaseUrl.startsWith('sqlite:')

const config: Config = {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  driver: isSqlite ? 'better-sqlite' : 'pg',
  dbCredentials: isSqlite 
    ? {
        url: databaseUrl.replace('sqlite:', '')
      }
    : {
        connectionString: databaseUrl,
        ssl: isProduction ? { rejectUnauthorized: false } : false
      },
  verbose: process.env.NODE_ENV === 'development',
  strict: true,
  // Generate migrations with timestamps
  migrations: {
    prefix: 'timestamp'
  }
}

export default config
