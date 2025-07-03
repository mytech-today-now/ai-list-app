# Database Setup & Configuration

This document provides comprehensive instructions for setting up and configuring the database for the AI ToDo MCP system.

## Overview

The system uses:
- **SQLite** for development (file-based, zero-config)
- **PostgreSQL** for production (scalable, robust)
- **Drizzle ORM** for type-safe database operations
- **Knex.js-style** query building with Drizzle

## Quick Start

### 1. Environment Configuration

Create a `.env` file in `apps/backend/`:

```bash
# Development (SQLite)
DATABASE_URL="sqlite:./data/ai-todo.db"
NODE_ENV=development

# Production (PostgreSQL)
# DATABASE_URL="postgresql://username:password@localhost:5432/ai_todo"
# NODE_ENV=production

# Other required variables
OPENAI_API_KEY="your-openai-api-key"
JWT_SECRET="your-jwt-secret"
PORT=3001
```

### 2. Install Dependencies

```bash
cd apps/backend
npm install
```

### 3. Run Migrations

```bash
# Run database migrations
npm run db:migrate

# Seed with sample data
npm run db:seed

# Or do both at once
npm run db:reset
```

### 4. Start Development Server

```bash
npm run dev
```

## Database Scripts

The following npm scripts are available in `apps/backend`:

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate new migration files from schema changes |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Run migrations and seed data |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |

## Schema Overview

### Core Tables

1. **lists** - Hierarchical task lists
2. **items** - Individual tasks/items within lists
3. **agents** - AI agents with roles and permissions
4. **action_logs** - Audit trail of all agent actions
5. **sessions** - Agent session management
6. **tags** - Reusable tags for categorization
7. **item_dependencies** - Task dependency relationships

### Key Features

- **Hierarchical Lists**: Lists can have parent-child relationships
- **Task Dependencies**: Items can depend on other items
- **Agent Permissions**: Role-based access control
- **Audit Trail**: All actions are logged
- **Full-text Search**: Search across titles and descriptions
- **Soft Deletes**: Items can be archived instead of deleted

## Environment-Specific Configuration

### Development (SQLite)

```bash
DATABASE_URL="sqlite:./data/ai-todo.db"
NODE_ENV=development
```

**Advantages:**
- Zero configuration
- File-based storage
- Perfect for development
- Automatic WAL mode for better concurrency

**Location:** `apps/backend/data/ai-todo.db`

### Production (PostgreSQL)

```bash
DATABASE_URL="postgresql://username:password@host:port/database"
NODE_ENV=production
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
DB_SSL=true
```

**Advantages:**
- Highly scalable
- ACID compliance
- Advanced indexing
- Connection pooling
- SSL support

## Migration Management

### Enhanced Migration System

The application now includes an advanced migration system with rollback capabilities, performance optimization, and comprehensive management features.

#### Available Commands

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback migrations
npm run migrate:rollback

# Optimize database performance
npm run migrate:optimize

# Backup management
npm run migrate:backup --create
npm run migrate:backup --list
npm run migrate:backup --restore <path>
```

### Creating New Migrations

1. **Traditional Drizzle Approach:**
   ```bash
   # Modify schema files in src/db/schema/
   npm run db:generate
   npm run db:migrate
   ```

2. **Enhanced Migration Files:**
   Create migration files in `src/db/migrations/` with format:
   ```sql
   -- @name: Migration Name
   -- @description: Description of changes
   -- @rollbackSafe: true
   -- @performanceImpact: medium

   -- UP MIGRATION
   CREATE TABLE example (id TEXT PRIMARY KEY);

   -- DOWN MIGRATION
   DROP TABLE example;
   ```

### Migration Features

- **Rollback Support** - Safe rollback with risk assessment
- **Performance Optimization** - Intelligent indexing and query optimization
- **Safety Checks** - Transaction safety and validation
- **Backup System** - Automatic backup before risky operations
- **Monitoring** - Performance metrics and execution tracking

### Migration Files

Migrations are stored in `src/db/migrations/` with:
- SQL files for schema changes
- Metadata for tracking applied migrations
- Automatic rollback support

## Database Services

### Service Layer Architecture

```typescript
// Base service with common CRUD operations
BaseService<TTable, TSelect, TInsert>

// Specialized services
ListsService    // Hierarchical operations
ItemsService    // Dependency management
AgentsService   // Authentication & permissions
```

### Usage Examples

```typescript
import { listsService, itemsService, agentsService } from './db/services'

// Create a new list
const list = await listsService.create({
  id: randomUUID(),
  title: 'My Tasks',
  description: 'Daily tasks',
  status: 'active'
})

// Find items in a list
const items = await itemsService.findByListId(list.id)

// Check agent permissions
const canExecute = await agentsService.hasPermission('agent-id', 'execute')
```

## Connection Management

### Connection Pooling

The system automatically manages database connections:

- **SQLite**: Single connection with WAL mode
- **PostgreSQL**: Connection pool (configurable size)
- **Graceful Shutdown**: Connections closed on app termination

### Error Handling

```typescript
// Automatic retry logic
// Connection health checks
// Graceful degradation
```

## Performance Optimization

### Indexes

The schema includes optimized indexes for:
- List hierarchy queries
- Item status filtering
- Agent activity tracking
- Full-text search operations

### Query Optimization

- Efficient pagination
- Lazy loading of relationships
- Optimized joins for common queries
- Prepared statements

## Backup & Recovery

### SQLite Backup

```bash
# Create backup
cp apps/backend/data/ai-todo.db backup-$(date +%Y%m%d).db

# Restore backup
cp backup-20231201.db apps/backend/data/ai-todo.db
```

### PostgreSQL Backup

```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup-20231201.sql
```

## Troubleshooting

### Common Issues

1. **Migration Fails**
   ```bash
   # Check database connection
   npm run db:migrate
   
   # Reset if needed
   rm -rf src/db/migrations/*
   npm run db:generate
   npm run db:migrate
   ```

2. **Connection Errors**
   ```bash
   # Verify environment variables
   echo $DATABASE_URL
   
   # Check database server status
   # For PostgreSQL: pg_isready
   ```

3. **Permission Errors**
   ```bash
   # Ensure database directory exists
   mkdir -p apps/backend/data
   
   # Check file permissions
   ls -la apps/backend/data/
   ```

### Debug Mode

Enable debug logging:

```bash
DEBUG=drizzle:* npm run dev
```

## Security Considerations

- API keys are hashed using bcrypt
- SQL injection protection via parameterized queries
- Connection string encryption in production
- Regular security updates for dependencies

## Monitoring

### Health Checks

The `/health` endpoint provides database status:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2023-12-01T10:00:00Z"
}
```

### Metrics

- Connection pool status
- Query performance
- Error rates
- Agent activity

## Next Steps

1. Set up your environment variables
2. Run the initial migration and seed
3. Start the development server
4. Explore the API endpoints
5. Check out Drizzle Studio for database visualization

For more information, see:
- [Database Schema Documentation](./DATABASE_SCHEMA.md)
- [API Documentation](./api/)
- [MCP Specification](./MCP_SPECIFICATION.md)
