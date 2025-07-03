# Data Access Layer (DAL) - AI-First Repository Pattern

## 🏗️ Architecture Overview

This Data Access Layer implements a comprehensive repository pattern with AI-first design principles, featuring:

- **Enhanced Base Repository** with advanced query building
- **Transaction Manager** with atomic operations and retry logic
- **MCP Integration** for AI agent accessibility
- **Performance Optimization** with intelligent caching
- **Dependency Injection** with repository registry
- **Comprehensive Testing** framework

## 🚀 Quick Start

```typescript
import { initializeDAL, getRepository, getService } from './db'

// Initialize the DAL
await initializeDAL()

// Get repository instances
const listsRepo = await getRepository<ListsRepository>('lists')
const itemsRepo = await getRepository<ItemsRepository>('items')

// Use repositories
const lists = await listsRepo.findAll({
  filters: [{ field: 'status', operator: 'eq', value: 'active' }],
  sorts: [{ field: 'createdAt', direction: 'desc' }],
  limit: 10
})
```

## 📊 Core Components

### 1. Enhanced Base Repository

```typescript
// Advanced filtering and sorting
const results = await repository.findAll({
  filters: [
    { field: 'status', operator: 'eq', value: 'active' },
    { field: 'priority', operator: 'in', values: ['high', 'urgent'] },
    { field: 'dueDate', operator: 'between', values: [startDate, endDate] }
  ],
  sorts: [
    { field: 'priority', direction: 'desc' },
    { field: 'dueDate', direction: 'asc' }
  ],
  limit: 50,
  offset: 0
})

// Query builder pattern
const query = QueryBuilderFactory
  .for<Item>(itemsTable)
  .where(builder => 
    builder
      .equals(itemsTable.status, 'pending')
      .and(new FilterBuilder().greaterThan(itemsTable.priority, 3))
  )
  .orderBy(itemsTable.dueDate, 'ASC')
  .limit(10)

const items = await query.execute()
```

### 2. Transaction Management

```typescript
import { getTransactionManager } from './transaction-manager'

const transactionManager = getTransactionManager()

// Simple transaction
const result = await transactionManager.executeTransaction(async (db, context) => {
  const list = await listsRepo.create(listData)
  const items = await itemsRepo.createMany(itemsData)
  return { list, items }
})

// Transaction with options
const result = await transactionManager.executeTransaction(
  async (db, context) => {
    // Your operations here
  },
  {
    isolationLevel: 'REPEATABLE_READ',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  }
)

// Atomic operations
const results = await transactionManager.executeAtomic([
  (db, context) => listsRepo.create(list1),
  (db, context) => listsRepo.create(list2),
  (db, context) => itemsRepo.create(item1)
], { savepoints: true })
```

### 3. MCP Integration for AI Agents

```typescript
// AI agents can interact with repositories through MCP
const mcpResult = await listsRepo.executeMCPTool('lists.getHierarchy', {
  maxDepth: 3,
  includeStats: true
})

// Get available MCP tools
const tools = listsRepo.getMCPTools()
const resources = listsRepo.getMCPResources()

// Register custom MCP tools
listsRepo.registerCustomMCPTool({
  name: 'lists.customOperation',
  description: 'Custom operation for AI agents',
  inputSchema: { /* JSON schema */ },
  handler: async (params) => {
    // Custom logic here
  }
})
```

### 4. Performance & Caching

```typescript
// Automatic caching with performance monitoring
const stats = await listsRepo.getEntityStatistics() // Cached for 2 minutes

// Manual cache control
listsRepo.setCacheEnabled(true)
listsRepo.clearCache()

// Performance metrics
const metrics = globalMonitor.getMetrics()
const cacheStats = globalCache.getStats()

// Cache warming
await DALUtils.warmupCaches()
```

### 5. Dependency Injection

```typescript
// Register repositories
@Repository({
  name: 'custom',
  entityType: 'CustomEntity',
  dependencies: ['lists', 'items']
})
class CustomRepository extends MCPAwareRepository<...> {
  // Implementation
}

// Use dependency injection
const customRepo = await getRepository<CustomRepository>('custom')
```

## 🧪 Testing Framework

```typescript
import { BaseRepositoryTestSuite, TestDataFactory } from './db/__tests__/repository-test-suite'

class MyRepositoryTestSuite extends BaseRepositoryTestSuite<MyRepository> {
  createRepository(): MyRepository {
    return new MyRepository()
  }

  createTestEntity(overrides = {}): any {
    return TestDataFactory.createTestEntity(overrides)
  }

  // Custom tests
  testCustomFunctionality() {
    describe('Custom Tests', () => {
      it('should do something specific', async () => {
        // Test implementation
      })
    })
  }

  runAllTests() {
    this.runStandardTests() // CRUD, queries, performance
    this.testCustomFunctionality()
  }
}
```

## 🔧 Configuration

```typescript
import { configureDAL, defaultDALConfig } from './db'

// Configure DAL
configureDAL({
  cache: {
    enabled: true,
    maxSize: 10000,
    ttl: 15 * 60 * 1000 // 15 minutes
  },
  performance: {
    monitoring: true,
    slowQueryThreshold: 500 // 500ms
  },
  mcp: {
    enabled: true,
    toolPrefix: 'repo'
  },
  transactions: {
    defaultTimeout: 60000, // 1 minute
    retryAttempts: 5
  }
})
```

## 📈 Monitoring & Analytics

```typescript
// Performance reporting
const report = DALUtils.generatePerformanceReport()
console.log('Cache efficiency:', report.cache.efficiency)
console.log('Query performance:', report.performance.efficiency)
console.log('Recommendations:', report.recommendations)

// Health status
const health = getDALHealthStatus()
console.log('Repository health:', health.repositories)
console.log('Cache stats:', health.cache)
console.log('Performance metrics:', health.performance)

// Event monitoring
import { DALEventSystem } from './db'

DALEventSystem.on('query:slow', (data) => {
  console.warn(`Slow query: ${data.query} (${data.duration}ms)`)
})

DALEventSystem.on('cache:miss', (data) => {
  console.debug(`Cache miss: ${data.key}`)
})
```

## 🤖 AI-First Features

### MCP Protocol Integration
- All repositories expose standardized MCP tools and resources
- AI agents can perform CRUD operations through MCP
- Custom domain-specific operations available via MCP
- Real-time data access for AI decision making

### Semantic Type Annotations
```typescript
/**
 * SemanticType: CustomRepository
 * Description: Repository for managing custom entities with AI integration
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add intelligent data validation
 *   - Implement predictive caching
 *   - Add automated performance optimization
 */
```

### Query Intelligence
- Automatic query optimization based on usage patterns
- Intelligent cache warming strategies
- Performance recommendations based on query analysis
- Predictive data loading for AI workflows

## 🔒 Security & Best Practices

- **Input Validation**: All queries are parameterized and validated
- **Transaction Safety**: Automatic rollback on failures
- **Cache Security**: Sensitive data excluded from caching
- **Audit Trail**: Complete operation logging in transactions
- **Error Handling**: Comprehensive error recovery and reporting

## 📚 API Reference

### Repository Methods
- `findById(id)` - Find single entity by ID
- `findAll(options)` - Find entities with filtering/sorting
- `create(data)` - Create new entity
- `updateById(id, data)` - Update entity by ID
- `deleteById(id)` - Delete entity by ID
- `count(where?)` - Count entities with optional filtering

### Query Options
```typescript
interface QueryOptions {
  filters?: FilterCondition[]
  sorts?: SortCondition[]
  limit?: number
  offset?: number
  groupBy?: string[]
  having?: FilterCondition[]
}
```

### Filter Operators
- `eq`, `ne` - Equality/inequality
- `gt`, `gte`, `lt`, `lte` - Comparisons
- `like`, `ilike` - Pattern matching
- `in`, `notIn` - Array membership
- `isNull`, `isNotNull` - Null checks
- `between` - Range queries

## 🚀 Performance Tips

1. **Use Caching**: Enable caching for read-heavy operations
2. **Batch Operations**: Use `createMany` for bulk inserts
3. **Query Optimization**: Use specific filters and limits
4. **Transaction Scope**: Keep transactions small and focused
5. **Index Usage**: Ensure proper database indexes for filters
6. **Cache Warming**: Pre-load common queries during startup

## 🔄 Migration Guide

### From Legacy Services
```typescript
// Old way
import { listsService } from './services/lists'
const lists = await listsService.findAll()

// New way
import { getRepository } from './db'
const listsRepo = await getRepository('lists')
const lists = await listsRepo.findAll()
```

### Adding New Repositories
1. Extend `MCPAwareRepository`
2. Add `@Repository` decorator
3. Implement required abstract methods
4. Register with `repositoryRegistry`
5. Add to exports in `index.ts`

This DAL provides a robust, scalable, and AI-first foundation for data access in your application, with comprehensive testing, monitoring, and optimization capabilities built-in.
