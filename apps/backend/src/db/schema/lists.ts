import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { pgTable, varchar, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'

// SQLite Schema
export const listsTableSqlite = sqliteTable('lists', {
  id: text('id').primaryKey(),
  title: text('title', { length: 500 }).notNull(),
  description: text('description'),
  parentListId: text('parent_list_id').references(() => listsTableSqlite.id, { onDelete: 'cascade' }),
  position: integer('position').default(0),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).default('medium'),
  status: text('status', { enum: ['active', 'completed', 'archived', 'deleted'] }).default('active'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' })
}, (table) => ({
  parentListIdx: index('idx_lists_parent_list').on(table.parentListId),
  statusIdx: index('idx_lists_status').on(table.status),
  createdAtIdx: index('idx_lists_created_at').on(table.createdAt),
  parentPositionIdx: index('idx_lists_parent_position').on(table.parentListId, table.position)
}))

// PostgreSQL Schema
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent'])
export const listStatusEnum = pgEnum('list_status', ['active', 'completed', 'archived', 'deleted'])

export const listsTablePg = pgTable('lists', {
  id: varchar('id', { length: 255 }).primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  parentListId: varchar('parent_list_id', { length: 255 }).references(() => listsTablePg.id, { onDelete: 'cascade' }),
  position: integer('position').default(0),
  priority: priorityEnum('priority').default('medium'),
  status: listStatusEnum('status').default('active'),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata')
}, (table) => ({
  parentListIdx: index('idx_lists_parent_list_pg').on(table.parentListId),
  statusIdx: index('idx_lists_status_pg').on(table.status),
  createdAtIdx: index('idx_lists_created_at_pg').on(table.createdAt),
  parentPositionIdx: index('idx_lists_parent_position_pg').on(table.parentListId, table.position)
}))

// Export the appropriate table based on environment
export const listsTable = process.env.NODE_ENV === 'production' ? listsTablePg : listsTableSqlite

// Types
export type List = typeof listsTable.$inferSelect
export type NewList = typeof listsTable.$inferInsert
