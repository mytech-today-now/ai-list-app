// Export all schema tables and types
export * from './lists'
export * from './items'
export * from './agents'
export * from './action-logs'
export * from './sessions'
export * from './tags'
export * from './item-dependencies'

// Re-export commonly used tables for convenience
import { listsTable, type List, type NewList } from './lists'
import { itemsTable, type Item, type NewItem } from './items'
import { agentsTable, type Agent, type NewAgent } from './agents'
import { actionLogsTable, type ActionLog, type NewActionLog } from './action-logs'
import { sessionsTable, type Session, type NewSession } from './sessions'
import { tagsTable, type Tag, type NewTag } from './tags'
import { itemDependenciesTable, type ItemDependency, type NewItemDependency } from './item-dependencies'

// Schema object for Drizzle
export const schema = {
  lists: listsTable,
  items: itemsTable,
  agents: agentsTable,
  actionLogs: actionLogsTable,
  sessions: sessionsTable,
  tags: tagsTable,
  itemDependencies: itemDependenciesTable
}

// Export types for convenience
export type {
  List,
  NewList,
  Item,
  NewItem,
  Agent,
  NewAgent,
  ActionLog,
  NewActionLog,
  Session,
  NewSession,
  Tag,
  NewTag,
  ItemDependency,
  NewItemDependency
}
