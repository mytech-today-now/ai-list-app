# Advanced Migration System

A comprehensive database migration system with rollback capabilities, performance optimization, and advanced management features for the AI-first PWA application.

## Features

- ✅ **Advanced Migration Management** - Full lifecycle migration control with metadata tracking
- 🔄 **Rollback Capabilities** - Safe rollback with risk assessment and data preservation
- ⚡ **Performance Optimization** - Intelligent indexing and query optimization
- 🛡️ **Safety Checks** - Transaction safety, validation, and integrity checks
- 📊 **Monitoring & Analytics** - Performance metrics and migration tracking
- 🔧 **CLI Tools** - Comprehensive command-line interface
- 🧪 **Testing Suite** - Complete test coverage for all scenarios

## Quick Start

### Installation

The migration system is already integrated into the backend. Install dependencies:

```bash
cd apps/backend
npm install
```

### Basic Usage

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:rollback

# Optimize database performance
npm run migrate:optimize

# Create backup
npm run migrate:backup --create
```

## CLI Commands

### Migration Status
```bash
npm run migrate:status
```
Shows current migration status including applied, pending, and failed migrations.

### Run Migrations
```bash
# Run all pending migrations
npm run migrate:up

# Run migrations up to specific target
npm run migrate:up --target 0001_enhanced_schema

# Dry run (show what would be done)
npm run migrate:up --dry-run
```

### Rollback Migrations
```bash
# Rollback last migration
npm run migrate:rollback

# Rollback specific number of steps
npm run migrate:rollback --steps 3

# Rollback to specific migration
npm run migrate:rollback --target 0001_enhanced_schema

# Force rollback (bypass safety checks)
npm run migrate:rollback --force

# Create backup before rollback
npm run migrate:rollback --backup

# Provide rollback reason
npm run migrate:rollback --reason "Bug in migration"
```

### Performance Optimization
```bash
# Analyze current performance
npm run migrate:optimize --analyze

# Generate and apply optimization plan
npm run migrate:optimize

# Dry run optimization
npm run migrate:optimize --dry-run
```

### Backup Management
```bash
# Create backup
npm run migrate:backup --create

# List available backups
npm run migrate:backup --list

# Restore from backup
npm run migrate:backup --restore ./backups/backup_2024-01-01.sql
```

## Migration File Format

Migration files follow a specific format with metadata and rollback support:

```sql
-- @name: Migration Name
-- @description: Detailed description of changes
-- @timestamp: 2024-01-01T00:00:00Z
-- @rollbackSafe: true
-- @performanceImpact: medium
-- @dependencies: []

-- UP MIGRATION (forward changes)
CREATE TABLE example (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_example_name ON example (name);

-- DOWN MIGRATION (rollback changes)
DROP INDEX IF EXISTS idx_example_name;
DROP TABLE IF EXISTS example;
```

### Metadata Fields

- `@name`: Human-readable migration name
- `@description`: Detailed description of changes
- `@timestamp`: ISO timestamp of migration creation
- `@rollbackSafe`: Whether migration can be safely rolled back
- `@performanceImpact`: Expected performance impact (low/medium/high)
- `@dependencies`: Array of migration IDs this depends on

## Architecture

### Core Components

1. **MigrationManager** - Core migration execution and tracking
2. **RollbackManager** - Safe rollback with risk assessment
3. **PerformanceOptimizer** - Database optimization and indexing
4. **CLI** - Command-line interface for all operations

### Database Tables

The system creates tracking tables:

- `__migrations__` - Applied migration records
- `__migration_rollbacks__` - Rollback history

### Safety Features

- **Transaction Safety** - All operations wrapped in transactions
- **Checksum Validation** - Ensures migration integrity
- **Risk Assessment** - Evaluates rollback safety
- **Data Backup** - Automatic backup before risky operations
- **Dry Run Mode** - Preview changes without execution

## Performance Optimizations

The system includes comprehensive performance optimizations:

### Intelligent Indexing
- Composite indexes for complex queries
- Partial indexes for filtered data
- Unique indexes for data integrity
- GIN indexes for JSON data (PostgreSQL)

### Query Optimization
- Optimized JOIN patterns
- Efficient pagination support
- Lazy loading strategies
- Prepared statement patterns

### Monitoring
- Execution time tracking
- Performance metrics collection
- Slow query identification
- Index usage analysis

## Environment Configuration

### Development (SQLite)
```bash
DATABASE_URL="sqlite:./data/ai-todo.db"
NODE_ENV=development
```

### Production (PostgreSQL)
```bash
DATABASE_URL="postgresql://user:pass@host:port/db"
NODE_ENV=production
```

## Testing

Run the comprehensive test suite:

```bash
# Run all migration tests
npm test -- --testPathPattern=migration

# Run specific test file
npm test src/db/migrations/__tests__/migration-system.test.ts

# Run tests with coverage
npm test -- --coverage --testPathPattern=migration
```

### Test Coverage

- Migration execution and rollback
- Performance optimization
- Error handling and recovery
- Data integrity validation
- CLI command functionality

## Best Practices

### Writing Migrations

1. **Always provide rollback SQL** in the DOWN section
2. **Use descriptive names** and metadata
3. **Test migrations** in development first
4. **Keep migrations atomic** - one logical change per file
5. **Add appropriate indexes** for new columns
6. **Validate constraints** before applying

### Rollback Safety

1. **Mark destructive migrations** as `rollbackSafe: false`
2. **Create backups** before risky operations
3. **Test rollbacks** in development
4. **Document rollback procedures** for production
5. **Monitor rollback impact** on performance

### Performance

1. **Add indexes strategically** - balance query speed vs. write performance
2. **Monitor index usage** - remove unused indexes
3. **Use composite indexes** for multi-column queries
4. **Consider partial indexes** for filtered data
5. **Analyze query patterns** regularly

## Troubleshooting

### Common Issues

1. **Migration Fails**
   ```bash
   # Check migration status
   npm run migrate:status
   
   # Review error logs
   npm run migrate:up --verbose
   ```

2. **Rollback Not Safe**
   ```bash
   # Create backup first
   npm run migrate:backup --create
   
   # Force rollback if necessary
   npm run migrate:rollback --force
   ```

3. **Performance Issues**
   ```bash
   # Analyze current performance
   npm run migrate:optimize --analyze
   
   # Apply optimizations
   npm run migrate:optimize
   ```

### Recovery Procedures

1. **Failed Migration Recovery**
   - Check transaction state
   - Review migration logs
   - Manual cleanup if needed
   - Restore from backup

2. **Data Corruption**
   - Stop application
   - Restore from latest backup
   - Re-apply migrations carefully
   - Validate data integrity

## Contributing

When adding new features to the migration system:

1. Follow the existing patterns and interfaces
2. Add comprehensive tests
3. Update documentation
4. Consider backward compatibility
5. Test with both SQLite and PostgreSQL

## Security Considerations

- Migration files should not contain sensitive data
- Use environment variables for credentials
- Validate all user inputs in CLI
- Audit migration changes in production
- Restrict migration execution permissions

## Monitoring and Alerting

Set up monitoring for:
- Migration execution failures
- Long-running migrations
- Rollback operations
- Performance degradation
- Backup creation/restoration
