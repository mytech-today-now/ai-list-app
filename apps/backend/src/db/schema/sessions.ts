import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { pgTable, varchar, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'
import { agentsTableSqlite, agentsTablePg } from './agents'

// SQLite Schema
export const sessionsTableSqlite = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  agentId: text('agent_id', { length: 255 }).references(() => agentsTableSqlite.id),
  userId: text('user_id', { length: 255 }),
  status: text('status', { enum: ['active', 'expired', 'terminated'] }).default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastActivity: integer('last_activity', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  metadata: text('metadata', { mode: 'json' })
}, (table) => ({
  expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
  agentIdIdx: index('idx_sessions_agent_id').on(table.agentId)
}))

// PostgreSQL Schema
export const sessionStatusEnum = pgEnum('session_status', ['active', 'expired', 'terminated'])

export const sessionsTablePg = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  agentId: varchar('agent_id', { length: 255 }).references(() => agentsTablePg.id),
  userId: varchar('user_id', { length: 255 }),
  status: sessionStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivity: timestamp('last_activity').defaultNow(),
  metadata: jsonb('metadata')
}, (table) => ({
  expiresAtIdx: index('idx_sessions_expires_at_pg').on(table.expiresAt),
  agentIdIdx: index('idx_sessions_agent_id_pg').on(table.agentId)
}))

// Export the appropriate table based on environment
export const sessionsTable = process.env.NODE_ENV === 'production' ? sessionsTablePg : sessionsTableSqlite

// Types
export type Session = typeof sessionsTable.$inferSelect
export type NewSession = typeof sessionsTable.$inferInsert
