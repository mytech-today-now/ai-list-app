# Database Schema Design

## Overview
The AI ToDo MCP system uses a relational database schema optimized for hierarchical task management and AI agent operations.

## Core Tables

### Lists Table
```sql
CREATE TABLE lists (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    parent_list_id VARCHAR(255),
    position INTEGER DEFAULT 0,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('active', 'completed', 'archived', 'deleted') DEFAULT 'active',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    metadata JSON,
    
    FOREIGN KEY (parent_list_id) REFERENCES lists(id) ON DELETE CASCADE,
    INDEX idx_parent_list (parent_list_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

### Items Table
```sql
CREATE TABLE items (
    id VARCHAR(255) PRIMARY KEY,
    list_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled', 'blocked') DEFAULT 'pending',
    due_date TIMESTAMP NULL,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    tags JSON, -- array of tags
    dependencies JSON, -- array of item IDs this depends on
    created_by VARCHAR(255),
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    metadata JSON,
    
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
    INDEX idx_list_id (list_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_assigned_to (assigned_to)
);
```

### Agents Table
```sql
CREATE TABLE agents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role ENUM('reader', 'executor', 'planner', 'admin') NOT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    permissions JSON, -- array of allowed actions
    configuration JSON, -- agent-specific settings
    api_key_hash VARCHAR(255), -- hashed API key for authentication
    last_active TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    metadata JSON,
    
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_last_active (last_active)
);
```

### Action Logs Table
```sql
CREATE TABLE action_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    command VARCHAR(1000) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(255),
    agent_id VARCHAR(255),
    parameters JSON,
    result JSON,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time INTEGER, -- in milliseconds
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rollback_id BIGINT NULL, -- reference to rollback action
    session_id VARCHAR(255),
    
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (rollback_id) REFERENCES action_logs(id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_agent_id (agent_id),
    INDEX idx_target (target_type, target_id),
    INDEX idx_session (session_id)
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    agent_id VARCHAR(255),
    user_id VARCHAR(255),
    status ENUM('active', 'expired', 'terminated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_agent_id (agent_id)
);
```

## Supporting Tables

### Tags Table
```sql
CREATE TABLE tags (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7), -- hex color code
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_name (name)
);
```

### Item Dependencies Table
```sql
CREATE TABLE item_dependencies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_id VARCHAR(255) NOT NULL,
    depends_on_item_id VARCHAR(255) NOT NULL,
    dependency_type ENUM('blocks', 'requires', 'follows') DEFAULT 'requires',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dependency (item_id, depends_on_item_id),
    INDEX idx_item_id (item_id),
    INDEX idx_depends_on (depends_on_item_id)
);
```

## Views for Common Queries

### Active Tasks View
```sql
CREATE VIEW active_tasks AS
SELECT 
    i.*,
    l.title as list_title,
    l.priority as list_priority
FROM items i
JOIN lists l ON i.list_id = l.id
WHERE i.status IN ('pending', 'in_progress')
AND l.status = 'active';
```

### Agent Activity Summary
```sql
CREATE VIEW agent_activity AS
SELECT 
    a.id,
    a.name,
    a.role,
    COUNT(al.id) as total_actions,
    COUNT(CASE WHEN al.success = true THEN 1 END) as successful_actions,
    MAX(al.timestamp) as last_action
FROM agents a
LEFT JOIN action_logs al ON a.id = al.agent_id
WHERE a.status = 'active'
GROUP BY a.id, a.name, a.role;
```

## Indexes for Performance
```sql
-- Composite indexes for common queries
CREATE INDEX idx_items_list_status ON items(list_id, status);
CREATE INDEX idx_items_assigned_status ON items(assigned_to, status);
CREATE INDEX idx_logs_agent_timestamp ON action_logs(agent_id, timestamp);
CREATE INDEX idx_lists_parent_position ON lists(parent_list_id, position);
```

## Data Relationships
- Lists can have sub-lists (hierarchical structure)
- Items belong to lists and can have dependencies on other items
- Agents perform actions that are logged
- Sessions track agent activity
- All operations are auditable through action logs
