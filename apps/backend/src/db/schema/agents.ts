import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { pgTable, varchar, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'

// SQLite Schema
export const agentsTableSqlite = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  role: text('role', { enum: ['reader', 'executor', 'planner', 'admin'] }).notNull(),
  status: text('status', { enum: ['active', 'inactive', 'suspended'] }).default('active'),
  permissions: text('permissions', { mode: 'json' }), // array of allowed actions
  configuration: text('configuration', { mode: 'json' }), // agent-specific settings
  apiKeyHash: text('api_key_hash', { length: 255 }), // hashed API key for authentication
  lastActive: integer('last_active', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  metadata: text('metadata', { mode: 'json' })
}, (table) => ({
  roleIdx: index('idx_agents_role').on(table.role),
  statusIdx: index('idx_agents_status').on(table.status),
  lastActiveIdx: index('idx_agents_last_active').on(table.lastActive)
}))

// PostgreSQL Schema
export const agentRoleEnum = pgEnum('agent_role', ['reader', 'executor', 'planner', 'admin'])
export const agentStatusEnum = pgEnum('agent_status', ['active', 'inactive', 'suspended'])

export const agentsTablePg = pgTable('agents', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  role: agentRoleEnum('role').notNull(),
  status: agentStatusEnum('status').default('active'),
  permissions: jsonb('permissions'), // array of allowed actions
  configuration: jsonb('configuration'), // agent-specific settings
  apiKeyHash: varchar('api_key_hash', { length: 255 }), // hashed API key for authentication
  lastActive: timestamp('last_active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: jsonb('metadata')
}, (table) => ({
  roleIdx: index('idx_agents_role_pg').on(table.role),
  statusIdx: index('idx_agents_status_pg').on(table.status),
  lastActiveIdx: index('idx_agents_last_active_pg').on(table.lastActive)
}))

// Export the appropriate table based on environment
export const agentsTable = process.env.NODE_ENV === 'production' ? agentsTablePg : agentsTableSqlite

// Types
export type Agent = typeof agentsTable.$inferSelect
export type NewAgent = typeof agentsTable.$inferInsert
