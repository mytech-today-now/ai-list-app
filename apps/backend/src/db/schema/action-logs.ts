import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { pgTable, varchar, timestamp, jsonb, boolean, bigint, bigserial } from 'drizzle-orm/pg-core'
import { agentsTableSqlite, agentsTablePg } from './agents'

// SQLite Schema
export const actionLogsTableSqlite = sqliteTable('action_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  command: text('command', { length: 1000 }).notNull(),
  action: text('action', { length: 100 }).notNull(),
  targetType: text('target_type', { length: 100 }).notNull(),
  targetId: text('target_id', { length: 255 }),
  agentId: text('agent_id', { length: 255 }).references(() => agentsTableSqlite.id),
  parameters: text('parameters', { mode: 'json' }),
  result: text('result', { mode: 'json' }),
  success: integer('success', { mode: 'boolean' }).notNull(),
  errorMessage: text('error_message'),
  executionTime: integer('execution_time'), // in milliseconds
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  rollbackId: integer('rollback_id').references((): any => actionLogsTableSqlite.id),
  sessionId: text('session_id', { length: 255 })
}, (table) => ({
  timestampIdx: index('idx_action_logs_timestamp').on(table.timestamp),
  agentIdIdx: index('idx_action_logs_agent_id').on(table.agentId),
  targetIdx: index('idx_action_logs_target').on(table.targetType, table.targetId),
  sessionIdx: index('idx_action_logs_session').on(table.sessionId),
  agentTimestampIdx: index('idx_action_logs_agent_timestamp').on(table.agentId, table.timestamp)
}))

// PostgreSQL Schema
export const actionLogsTablePg = pgTable('action_logs', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  command: varchar('command', { length: 1000 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 100 }).notNull(),
  targetId: varchar('target_id', { length: 255 }),
  agentId: varchar('agent_id', { length: 255 }).references(() => agentsTablePg.id),
  parameters: jsonb('parameters'),
  result: jsonb('result'),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  executionTime: integer('execution_time'), // in milliseconds
  timestamp: timestamp('timestamp').defaultNow(),
  rollbackId: bigint('rollback_id', { mode: 'bigint' }).references((): any => actionLogsTablePg.id),
  sessionId: varchar('session_id', { length: 255 })
}, (table) => ({
  timestampIdx: index('idx_action_logs_timestamp_pg').on(table.timestamp),
  agentIdIdx: index('idx_action_logs_agent_id_pg').on(table.agentId),
  targetIdx: index('idx_action_logs_target_pg').on(table.targetType, table.targetId),
  sessionIdx: index('idx_action_logs_session_pg').on(table.sessionId),
  agentTimestampIdx: index('idx_action_logs_agent_timestamp_pg').on(table.agentId, table.timestamp)
}))

// Export the appropriate table based on environment
export const actionLogsTable = process.env.NODE_ENV === 'production' ? actionLogsTablePg : actionLogsTableSqlite

// Types
export type ActionLog = typeof actionLogsTable.$inferSelect
export type NewActionLog = typeof actionLogsTable.$inferInsert
