# AI ToDo MCP - CLI Examples

This document provides comprehensive examples of using the MCP (Modular Command Protocol) through the web-based CLI interface.

## Basic Command Structure

All MCP commands follow this format:
```
[action]:[target_type]:[target_identifier]{[parameters]}
```

## List Management Commands

### Creating Lists

```bash
# Create a simple list
create:list:weekend_tasks{"title":"Weekend Tasks"}

# Create a list with full details
create:list:work_projects{"title":"Work Projects","description":"Important work items","priority":"high"}

# Create a sub-list
create:list:grocery_shopping{"title":"Grocery Shopping","parentListId":"weekend_tasks","priority":"medium"}
```

### Reading Lists

```bash
# Get basic list information
read:list:weekend_tasks{}

# Get list status with items
status:list:weekend_tasks{"recursive":true,"includeItems":true}

# Get list with metadata
status:list:work_projects{"includeMetadata":true}
```

### Updating Lists

```bash
# Update list title
update:list:weekend_tasks{"title":"Weekend Priorities"}

# Change list priority and status
update:list:work_projects{"priority":"urgent","status":"active"}

# Archive a completed list
update:list:weekend_tasks{"status":"archived"}
```

### Deleting Lists

```bash
# Delete a list
delete:list:old_list{}
```

## Item Management Commands

### Creating Items

```bash
# Create a simple task
create:item:buy_milk{"listId":"grocery_shopping","title":"Buy milk"}

# Create a detailed task
create:item:project_review{"listId":"work_projects","title":"Review Q4 project","description":"Complete review of all Q4 deliverables","priority":"high","dueDate":"2025-07-10T17:00:00Z","estimatedDuration":120}

# Create task with dependencies
create:item:deploy_app{"listId":"work_projects","title":"Deploy application","dependencies":["test_app","review_code"],"assignedTo":"dev_team"}

# Create task with tags
create:item:write_docs{"listId":"work_projects","title":"Write documentation","tags":["documentation","urgent","client-facing"]}
```

### Reading Items

```bash
# Get item details
read:item:buy_milk{}

# Get item status with dependencies
status:item:project_review{"includeDependencies":true}
```

### Updating Items

```bash
# Update item status
update:item:buy_milk{"status":"completed"}

# Update multiple fields
update:item:project_review{"status":"in_progress","actualDuration":90,"assignedTo":"john_doe"}

# Add tags to existing item
update:item:write_docs{"tags":["documentation","urgent","client-facing","high-priority"]}

# Update due date
update:item:deploy_app{"dueDate":"2025-07-15T09:00:00Z"}
```

### Reordering Items

```bash
# Move item to top of list
reorder:item:urgent_task{"position":0}

# Move item to specific position
reorder:item:buy_milk{"position":3}
```

### Marking Items Complete

```bash
# Mark item as done
mark_done:item:buy_milk{}

# Mark item as done with actual duration
mark_done:item:project_review{"actualDuration":135}
```

## Execution Commands

### Executing Lists

```bash
# Execute all items in a list sequentially
execute:list:weekend_tasks{}

# Execute items in parallel
execute:list:work_projects{"parallel":true,"maxConcurrency":3}

# Dry run to see what would be executed
execute:list:grocery_shopping{"dryRun":true}
```

### Marking Lists Complete

```bash
# Mark entire list as done
mark_done:list:weekend_tasks{}
```

## Agent Management Commands

### Creating Agents

```bash
# Create a reader agent
create:agent:status_bot{"name":"Status Bot","role":"reader","permissions":["read","status"]}

# Create an executor agent
create:agent:task_runner{"name":"Task Runner","role":"executor","permissions":["read","execute","mark_done","reorder"]}

# Create a planner agent with full permissions
create:agent:project_planner{"name":"Project Planner","role":"planner","permissions":["create","read","update","plan","reorder"]}
```

### Reading Agents

```bash
# Get agent information
read:agent:status_bot{}
```

### Updating Agents

```bash
# Update agent permissions
update:agent:task_runner{"permissions":["read","execute","mark_done","reorder","update"]}

# Deactivate an agent
update:agent:old_bot{"status":"inactive"}
```

## System Commands

### System Status

```bash
# Get overall system health
status:system:health{}

# Get system statistics
status:system:stats{}
```

### Logging

```bash
# Log a custom event
log:system:custom_event{"event":"user_login","userId":"john_doe","timestamp":"2025-07-03T10:00:00Z"}

# Log an error
log:system:error{"error":"Database connection failed","severity":"high"}
```

### Rollback Operations

```bash
# Rollback the last action
rollback:system:last_action{}

# Rollback a specific action by ID
rollback:system:action{"actionId":12345,"reason":"Incorrect data"}
```

## Advanced Examples

### Batch Operations

```bash
# Create multiple items at once
execute:batch:create_tasks{
  "operations": [
    {"action":"create","targetType":"item","targetId":"task1","parameters":{"listId":"work","title":"Task 1"}},
    {"action":"create","targetType":"item","targetId":"task2","parameters":{"listId":"work","title":"Task 2"}},
    {"action":"create","targetType":"item","targetId":"task3","parameters":{"listId":"work","title":"Task 3"}}
  ],
  "parallel": true
}
```

### Complex Queries

```bash
# Get status of multiple lists
status:system:summary{"includeStats":true,"includeLists":["work_projects","weekend_tasks"]}
```

### Planning Operations

```bash
# Create a project plan
plan:workflow:sprint_planning{
  "name": "Sprint Planning",
  "lists": ["backlog", "in_progress", "review", "done"],
  "duration": "2_weeks",
  "team": ["dev1", "dev2", "tester1"]
}
```

## Error Handling Examples

### Invalid Commands

```bash
# This will fail - invalid action
invalid_action:list:test{}
# Response: {"success":false,"error":{"code":"VALIDATION_ERROR","message":"Invalid action: invalid_action"}}

# This will fail - missing required parameter
create:item:test{}
# Response: {"success":false,"error":{"code":"VALIDATION_ERROR","message":"Parameter validation failed: listId: Required"}}
```

### Permission Errors

```bash
# This will fail if agent doesn't have create permission
create:list:unauthorized{"title":"Test"}
# Response: {"success":false,"error":{"code":"PERMISSION_ERROR","message":"Agent does not have permission to perform create"}}
```

## CLI Session Examples

### Starting a Session

```javascript
// In browser console
const mcp = new MCPEngine();
const agent = await mcp.createAgent('demo_agent', 'planner');
const session = await mcp.createSession(agent.id);
```

### Interactive Session

```javascript
// Execute commands in session
await mcp.executeCommand('create:list:demo{"title":"Demo List"}', agent, session.id);
await mcp.executeCommand('create:item:demo_task{"listId":"demo","title":"Demo Task"}', agent, session.id);
await mcp.executeCommand('status:list:demo{"recursive":true}', agent, session.id);
```

### Monitoring and Debugging

```javascript
// Get execution logs
const logs = await mcp.getActionLogs({sessionId: session.id});

// Get system statistics
const stats = await mcp.executeCommand('status:system:health{}', agent, session.id);

// Monitor real-time activity
mcp.onAction((action) => {
  console.log('Action executed:', action);
});
```

## Best Practices

1. **Use descriptive IDs**: Make target identifiers meaningful
   ```bash
   # Good
   create:list:q4_marketing_campaigns{"title":"Q4 Marketing Campaigns"}
   
   # Avoid
   create:list:list1{"title":"Some List"}
   ```

2. **Include metadata for tracking**:
   ```bash
   create:item:user_story_123{"listId":"sprint_1","title":"User login feature","metadata":{"storyPoints":5,"epic":"authentication"}}
   ```

3. **Use dependencies for workflow management**:
   ```bash
   create:item:deploy{"listId":"release","title":"Deploy to production","dependencies":["test_complete","code_review_approved"]}
   ```

4. **Leverage tags for organization**:
   ```bash
   create:item:bug_fix{"listId":"backlog","title":"Fix login bug","tags":["bug","critical","security"]}
   ```

5. **Monitor execution with status checks**:
   ```bash
   execute:list:deployment_tasks{}
   # Then check progress
   status:list:deployment_tasks{"recursive":true}
   ```
