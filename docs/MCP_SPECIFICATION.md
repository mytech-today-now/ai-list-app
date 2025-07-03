# Modular Command Protocol (MCP) Specification

## Overview
The Modular Command Protocol (MCP) is the universal language for AI agents to interact with the AI ToDo system. It provides a standardized way to perform operations on lists, items, agents, and system components.

## Command Format
```
[action]:[target_type]:[target_identifier]{[parameters]}
```

### Components
- **action**: The operation to perform
- **target_type**: The type of object to operate on
- **target_identifier**: Unique identifier for the target
- **parameters**: JSON object with additional data (optional)

## Actions

### Core Actions
- `create` - Create new objects
- `read` - Retrieve object data
- `update` - Modify existing objects
- `delete` - Remove objects
- `execute` - Run batch operations
- `reorder` - Change object order
- `rename` - Change object names
- `status` - Get object status
- `mark_done` - Mark as completed

### Advanced Actions
- `rollback` - Undo previous actions
- `plan` - Create execution plans
- `train` - Train AI models
- `deploy` - Deploy configurations
- `test` - Run tests
- `monitor` - Monitor performance
- `optimize` - Optimize operations
- `debug` - Debug issues
- `log` - Log events

## Target Types
- `list` - Task lists
- `item` - Individual tasks
- `agent` - AI agents
- `system` - System components
- `batch` - Batch operations
- `workflow` - Workflow definitions

## Examples

### List Operations
```
create:list:weekend_tasks{"title":"Weekend Tasks","priority":"high"}
read:list:weekend_tasks{}
update:list:weekend_tasks{"title":"Weekend Priorities"}
delete:list:weekend_tasks{}
execute:list:weekend_tasks{}
status:list:weekend_tasks{"recursive":true}
mark_done:list:weekend_tasks{}
```

### Item Operations
```
create:item:buy_groceries{"list":"weekend_tasks","priority":"medium","due":"2025-07-05"}
read:item:buy_groceries{}
update:item:buy_groceries{"status":"in_progress"}
delete:item:buy_groceries{}
reorder:item:buy_groceries{"position":1}
mark_done:item:buy_groceries{}
```

### Agent Operations
```
create:agent:task_executor{"role":"executor","permissions":["read","execute"]}
read:agent:task_executor{}
update:agent:task_executor{"status":"active"}
delete:agent:task_executor{}
```

### System Operations
```
status:system:health{}
log:system:action{"action":"create:list:weekend_tasks","timestamp":"2025-07-03T10:00:00Z"}
rollback:system:last_action{}
```

## Response Format
```json
{
  "success": true,
  "command": "create:list:weekend_tasks",
  "result": {
    "id": "weekend_tasks",
    "title": "Weekend Tasks",
    "created_at": "2025-07-03T10:00:00Z"
  },
  "metadata": {
    "execution_time": "15ms",
    "agent": "task_executor"
  }
}
```

## Error Handling
```json
{
  "success": false,
  "command": "create:list:invalid_list",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid list identifier",
    "details": "List identifier must be alphanumeric"
  }
}
```

## Agent Roles

### Reader Agent
- **Permissions**: read, status
- **Purpose**: Query and report on system state
- **Commands**: read:*, status:*

### Executor Agent
- **Permissions**: read, execute, mark_done, reorder
- **Purpose**: Execute tasks and manage completion
- **Commands**: execute:*, mark_done:*, reorder:*

### Planner Agent
- **Permissions**: create, read, update, plan
- **Purpose**: Create and modify task structures
- **Commands**: create:*, update:*, plan:*

## Security & Validation
- All commands must be validated before execution
- Agent permissions are enforced at the protocol level
- Sensitive operations require additional authentication
- All actions are logged for audit and rollback purposes

## Extensibility
The MCP protocol supports custom actions and target types through plugin architecture:
```
custom_action:custom_target:identifier{"plugin":"my_plugin","data":{}}
```
