import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { pgTable, varchar, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'
import { listsTableSqlite, listsTablePg, priorityEnum } from './lists'

// SQLite Schema
export const itemsTableSqlite = sqliteTable('items', {
  id: text('id').primaryKey(),
  listId: text('list_id').notNull().references(() => listsTableSqlite.id, { onDelete: 'cascade' }),
  title: text('title', { length: 500 }).notNull(),
  description: text('description'),
  position: integer('position').default(0),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).default('medium'),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'cancelled', 'blocked'] }).default('pending'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  estimatedDuration: integer('estimated_duration'), // in minutes
  actualDuration: integer('actual_duration'), // in minutes
  tags: text('tags', { mode: 'json' }), // array of tags
  dependencies: text('dependencies', { mode: 'json' }), // array of item IDs this depends on
  createdBy: text('created_by'),
  assignedTo: text('assigned_to'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' })
}, (table) => ({
  listIdIdx: index('idx_items_list_id').on(table.listId),
  statusIdx: index('idx_items_status').on(table.status),
  dueDateIdx: index('idx_items_due_date').on(table.dueDate),
  assignedToIdx: index('idx_items_assigned_to').on(table.assignedTo),
  listStatusIdx: index('idx_items_list_status').on(table.listId, table.status),
  assignedStatusIdx: index('idx_items_assigned_status').on(table.assignedTo, table.status)
}))

// PostgreSQL Schema
export const itemStatusEnum = pgEnum('item_status', ['pending', 'in_progress', 'completed', 'cancelled', 'blocked'])

export const itemsTablePg = pgTable('items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  listId: varchar('list_id', { length: 255 }).notNull().references(() => listsTablePg.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  position: integer('position').default(0),
  priority: priorityEnum('priority').default('medium'),
  status: itemStatusEnum('status').default('pending'),
  dueDate: timestamp('due_date'),
  estimatedDuration: integer('estimated_duration'), // in minutes
  actualDuration: integer('actual_duration'), // in minutes
  tags: jsonb('tags'), // array of tags
  dependencies: jsonb('dependencies'), // array of item IDs this depends on
  createdBy: varchar('created_by', { length: 255 }),
  assignedTo: varchar('assigned_to', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata')
}, (table) => ({
  listIdIdx: index('idx_items_list_id_pg').on(table.listId),
  statusIdx: index('idx_items_status_pg').on(table.status),
  dueDateIdx: index('idx_items_due_date_pg').on(table.dueDate),
  assignedToIdx: index('idx_items_assigned_to_pg').on(table.assignedTo),
  listStatusIdx: index('idx_items_list_status_pg').on(table.listId, table.status),
  assignedStatusIdx: index('idx_items_assigned_status_pg').on(table.assignedTo, table.status)
}))

// Import priority enum from lists
import { priorityEnum } from './lists'

// Export the appropriate table based on environment
export const itemsTable = process.env.NODE_ENV === 'production' ? itemsTablePg : itemsTableSqlite

// Types
export type Item = typeof itemsTable.$inferSelect
export type NewItem = typeof itemsTable.$inferInsert
