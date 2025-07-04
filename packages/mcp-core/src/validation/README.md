# Model Validation & Relationships System

A comprehensive validation system that connects Zod schemas to database models with automatic validation, constraint checking, business rule enforcement, and data integrity monitoring.

## Features

### 🔍 **Enhanced Model Validation**
- **Zod Schema Integration**: Seamless connection between Zod schemas and database models
- **Multi-layer Validation**: Schema validation, constraint checking, and business rule enforcement
- **Context-aware Validation**: Different validation rules for create, update, and delete operations
- **Comprehensive Error Reporting**: Detailed error messages with context and suggested fixes

### 🔗 **Foreign Key Constraint Management**
- **Automatic Constraint Detection**: Discovers and manages foreign key relationships
- **Cascading Operations**: Handles CASCADE, SET_NULL, RESTRICT, and NO_ACTION behaviors
- **Referential Integrity Checks**: Validates data consistency across related tables
- **Orphan Detection**: Identifies and reports orphaned records

### 📋 **Business Rule Engine**
- **Flexible Rule Definition**: Define complex business logic with conditions and actions
- **Priority-based Execution**: Rules execute in priority order
- **Cross-model Validation**: Validate data across multiple related models
- **Dynamic Rule Management**: Add, remove, and modify rules at runtime

### 🏭 **Model Factories for Testing**
- **Realistic Data Generation**: Generate test data that respects constraints and relationships
- **Relationship Handling**: Automatically create related records
- **Constraint Validation**: Ensure generated data passes all validation rules
- **Hierarchical Data**: Generate complex nested structures (lists, dependencies)

### 📊 **Data Integrity Monitoring**
- **Scheduled Integrity Checks**: Automated monitoring of data consistency
- **Health Score Calculation**: Quantitative assessment of data quality
- **Violation Detection**: Identify constraint violations, circular references, and inconsistencies
- **Actionable Recommendations**: Specific suggestions for fixing integrity issues

## Quick Start

### 1. Initialize the Validation System

```typescript
import { initializeValidationSystem } from '@/validation'

const validationSystem = await initializeValidationSystem({
  enableForeignKeyChecks: true,
  enableBusinessRules: true,
  enableIntegrityMonitoring: true,
  enableFactories: true,
  dbConnection: yourDbConnection,
  scheduledChecks: true
})
```

### 2. Validate Model Data

```typescript
// Validate list creation
const result = await validationSystem.validateModel('list', {
  title: 'My New List',
  description: 'A sample list',
  priority: 'high'
}, {
  operation: 'create',
  userId: 'user-123'
})

if (!result.success) {
  console.error('Validation failed:', result.errors)
} else {
  console.log('Validation passed:', result.modelValidation.data)
}
```

### 3. Generate Test Data

```typescript
import { ListFactory_Instance, ItemFactory_Instance } from '@/validation'

// Generate a single list
const list = await ListFactory_Instance.build({
  validateConstraints: true,
  overrides: { title: 'Custom List Title' }
})

// Generate hierarchical structure
const hierarchy = await ListFactory_Instance.generateHierarchy(3, 2)

// Generate items with dependencies
const items = await ItemFactory_Instance.generateWithDependencies('list-id', 5)
```

### 4. Monitor Data Integrity

```typescript
// Perform comprehensive integrity check
const integrityResult = await validationSystem.performIntegrityCheck()

console.log(`Health Score: ${integrityResult.summary.healthScore}/100`)
console.log(`Violations Found: ${integrityResult.violationsFound}`)
console.log('Recommendations:', integrityResult.summary.recommendations)
```

## Architecture

### Core Components

1. **BaseModelValidator**: Abstract base class for model-specific validators
2. **ValidationRegistry**: Central registry for managing model validators
3. **ForeignKeyManager**: Handles foreign key constraints and referential integrity
4. **BusinessRuleEngine**: Executes business rules and enforces complex logic
5. **IntegrityMonitor**: Monitors data integrity and generates health reports
6. **ModelFactories**: Generate realistic test data with proper relationships

### Validation Flow

```
Input Data
    ↓
Schema Validation (Zod)
    ↓
Constraint Validation (Foreign Keys)
    ↓
Business Rule Validation
    ↓
Result with Errors/Warnings
```

## Model Validators

### List Validator
- **Hierarchical Constraints**: Prevents circular references in list hierarchy
- **Nesting Depth Limits**: Enforces maximum nesting depth (5 levels)
- **Title Uniqueness**: Ensures unique titles within the same parent
- **Status Transitions**: Validates valid status changes

### Item Validator
- **Dependency Management**: Validates item dependencies and prevents circular dependencies
- **Due Date Validation**: Warns about unreasonable due dates
- **Duration Validation**: Checks estimated vs actual duration consistency
- **Assignment Validation**: Ensures assigned users exist

## Business Rules

### Built-in Rules

1. **Maximum List Hierarchy Depth**: Prevents excessive nesting
2. **Item Dependency Completion**: Ensures dependencies are completed before items
3. **Reasonable Due Dates**: Warns about dates too far in past/future
4. **User Workload Balance**: Monitors task assignment distribution
5. **Data Retention Compliance**: Enforces data retention policies

### Custom Rules

```typescript
businessRuleEngine.addRule({
  id: 'custom_rule',
  name: 'Custom Business Rule',
  category: 'business_logic',
  severity: 'error',
  appliesTo: ['item'],
  conditions: [
    {
      field: 'priority',
      operator: 'equals',
      value: 'urgent'
    }
  ],
  actions: [
    {
      type: 'validate',
      message: 'Urgent items must have due dates',
      code: 'URGENT_NEEDS_DUE_DATE'
    }
  ]
})
```

## Foreign Key Constraints

### System Constraints

- `lists.parent_list_id → lists.id` (CASCADE)
- `items.list_id → lists.id` (CASCADE)
- `item_dependencies.item_id → items.id` (CASCADE)
- `sessions.agent_id → agents.id` (SET_NULL)

### Cascade Operations

```typescript
// Analyze cascade effects before deletion
const cascadeResult = await foreignKeyManager.handleCascadeDelete('lists', 'list-id')

console.log('Affected records:', cascadeResult.affectedRecords)
// [
//   { table: 'items', id: 'item-1', operation: 'DELETE' },
//   { table: 'items', id: 'item-2', operation: 'DELETE' }
// ]
```

## Testing Integration

### Jest Configuration

```typescript
// In your test files
import { 
  initializeValidationSystem, 
  cleanupValidationSystem,
  ListFactory_Instance 
} from '@/validation'

beforeEach(async () => {
  await initializeValidationSystem({
    enableForeignKeyChecks: true,
    enableBusinessRules: true,
    enableIntegrityMonitoring: false, // Disable for faster tests
    enableFactories: true
  })
})

afterEach(async () => {
  await cleanupValidationSystem()
})
```

### Test Data Generation

```typescript
describe('List Operations', () => {
  it('should create valid list hierarchy', async () => {
    // Generate test data
    const hierarchy = await ListFactory_Instance.generateHierarchy(2, 3)
    
    // Validate each list
    for (const list of hierarchy) {
      const result = await validationSystem.validateModel('list', list, {
        operation: 'create'
      })
      expect(result.success).toBe(true)
    }
  })
})
```

## Performance Considerations

- **Batch Processing**: Large datasets are processed in configurable batches
- **Lazy Loading**: Validators and rules are loaded on-demand
- **Caching**: Validation results can be cached for repeated operations
- **Parallel Execution**: Independent validations can run in parallel

## Error Handling

### Error Codes

```typescript
export const ValidationErrorCodes = {
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION'
  // ... more codes
}
```

### Error Context

```typescript
{
  field: 'parentListId',
  code: 'CIRCULAR_DEPENDENCY',
  message: 'Setting this parent would create a circular reference',
  severity: 'error',
  context: {
    parentListId: 'parent-id',
    currentPath: ['root', 'parent', 'child']
  }
}
```

## Monitoring & Health

### Health Score Calculation

- **100**: Perfect data integrity
- **80-99**: Minor warnings, good health
- **60-79**: Some violations, needs attention
- **40-59**: Multiple issues, poor health
- **0-39**: Critical issues, immediate action required

### Scheduled Monitoring

```typescript
integrityMonitor.addScheduledCheck({
  id: 'daily_check',
  name: 'Daily Integrity Check',
  schedule: '0 2 * * *', // 2 AM daily
  config: {
    checkForeignKeys: true,
    checkBusinessRules: true,
    checkOrphans: true,
    checkCircularReferences: true
  },
  enabled: true
})
```

## Best Practices

1. **Always validate at the service layer** before database operations
2. **Use factories for consistent test data** generation
3. **Monitor integrity regularly** with scheduled checks
4. **Handle validation errors gracefully** with user-friendly messages
5. **Keep business rules simple** and focused on single concerns
6. **Document custom rules** and constraints clearly
7. **Test cascade operations** thoroughly before production deployment

## Contributing

When adding new models or validation rules:

1. Create a model-specific validator extending `BaseModelValidator`
2. Register the validator with `validationRegistry`
3. Add corresponding factory for test data generation
4. Include comprehensive tests for all validation scenarios
5. Update documentation with new constraints and rules
