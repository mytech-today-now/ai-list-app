import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'
import { pgTable, varchar, timestamp, pgEnum, bigserial, unique as pgUnique } from 'drizzle-orm/pg-core'
import { itemsTableSqlite, itemsTablePg } from './items'

// SQLite Schema
export const itemDependenciesTableSqlite = sqliteTable('item_dependencies', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  itemId: text('item_id', { length: 255 }).notNull().references(() => itemsTableSqlite.id, { onDelete: 'cascade' }),
  dependsOnItemId: text('depends_on_item_id', { length: 255 }).notNull().references(() => itemsTableSqlite.id, { onDelete: 'cascade' }),
  dependencyType: text('dependency_type', { enum: ['blocks', 'requires', 'follows'] }).default('requires'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
  itemIdIdx: index('idx_item_dependencies_item_id').on(table.itemId),
  dependsOnIdx: index('idx_item_dependencies_depends_on').on(table.dependsOnItemId),
  uniqueDependency: unique('unique_item_dependency').on(table.itemId, table.dependsOnItemId)
}))

// PostgreSQL Schema
export const dependencyTypeEnum = pgEnum('dependency_type', ['blocks', 'requires', 'follows'])

export const itemDependenciesTablePg = pgTable('item_dependencies', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  itemId: varchar('item_id', { length: 255 }).notNull().references(() => itemsTablePg.id, { onDelete: 'cascade' }),
  dependsOnItemId: varchar('depends_on_item_id', { length: 255 }).notNull().references(() => itemsTablePg.id, { onDelete: 'cascade' }),
  dependencyType: dependencyTypeEnum('dependency_type').default('requires'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  itemIdIdx: index('idx_item_dependencies_item_id_pg').on(table.itemId),
  dependsOnIdx: index('idx_item_dependencies_depends_on_pg').on(table.dependsOnItemId),
  uniqueDependency: pgUnique('unique_item_dependency_pg').on(table.itemId, table.dependsOnItemId)
}))

// Export the appropriate table based on environment
export const itemDependenciesTable = process.env.NODE_ENV === 'production' ? itemDependenciesTablePg : itemDependenciesTableSqlite

// Types
export type ItemDependency = typeof itemDependenciesTable.$inferSelect
export type NewItemDependency = typeof itemDependenciesTable.$inferInsert
