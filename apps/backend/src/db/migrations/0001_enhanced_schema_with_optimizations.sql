-- @name: Enhanced Schema with Performance Optimizations
-- @description: Comprehensive database schema with advanced indexing, constraints, and performance optimizations
-- @timestamp: 2024-01-01T00:00:00Z
-- @rollbackSafe: true
-- @performanceImpact: medium
-- @dependencies: []

-- Enhanced Lists Table with Optimizations
CREATE TABLE IF NOT EXISTS `lists` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text(500) NOT NULL,
  `description` text,
  `parent_list_id` text,
  `position` integer DEFAULT 0,
  `priority` text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  `status` text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  `created_by` text,
  `created_at` integer DEFAULT (unixepoch()),
  `updated_at` integer DEFAULT (unixepoch()),
  `completed_at` integer,
  `metadata` text,
  FOREIGN KEY (`parent_list_id`) REFERENCES `lists`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_lists_completed_at_valid` CHECK (
    (status = 'active' AND completed_at IS NULL) OR 
    (status != 'active' AND completed_at IS NOT NULL)
  )
);

-- Enhanced Items Table with Optimizations
CREATE TABLE IF NOT EXISTS `items` (
  `id` text PRIMARY KEY NOT NULL,
  `list_id` text NOT NULL,
  `title` text(500) NOT NULL,
  `description` text,
  `position` integer DEFAULT 0,
  `priority` text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  `status` text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),
  `due_date` integer,
  `estimated_duration` integer CHECK (estimated_duration > 0),
  `actual_duration` integer CHECK (actual_duration > 0),
  `tags` text, -- JSON array
  `dependencies` text, -- JSON array
  `created_by` text,
  `assigned_to` text,
  `created_at` integer DEFAULT (unixepoch()),
  `updated_at` integer DEFAULT (unixepoch()),
  `completed_at` integer,
  `metadata` text,
  FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_items_due_date_future` CHECK (due_date IS NULL OR due_date > created_at),
  CONSTRAINT `chk_items_duration_valid` CHECK (
    actual_duration IS NULL OR estimated_duration IS NULL OR actual_duration >= 0
  )
);

-- Enhanced Agents Table with Optimizations
CREATE TABLE IF NOT EXISTS `agents` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text(255) NOT NULL,
  `role` text NOT NULL CHECK (role IN ('reader', 'executor', 'planner', 'admin')),
  `status` text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  `permissions` text, -- JSON array
  `configuration` text, -- JSON object
  `api_key_hash` text(255),
  `last_active` integer,
  `created_at` integer DEFAULT (unixepoch()),
  `updated_at` integer DEFAULT (unixepoch()),
  `metadata` text,
  CONSTRAINT `chk_agents_name_not_empty` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_agents_last_active_valid` CHECK (last_active IS NULL OR last_active >= created_at)
);

-- Enhanced Action Logs Table with Optimizations
CREATE TABLE IF NOT EXISTS `action_logs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `command` text(1000) NOT NULL,
  `action` text(100) NOT NULL,
  `target_type` text(100) NOT NULL,
  `target_id` text(255),
  `agent_id` text(255),
  `parameters` text, -- JSON object
  `result` text, -- JSON object
  `success` integer NOT NULL CHECK (success IN (0, 1)),
  `error_message` text,
  `execution_time` integer CHECK (execution_time >= 0),
  `timestamp` integer DEFAULT (unixepoch()),
  `rollback_id` integer,
  `session_id` text(255),
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`rollback_id`) REFERENCES `action_logs`(`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_action_logs_command_not_empty` CHECK (length(trim(command)) > 0),
  CONSTRAINT `chk_action_logs_action_not_empty` CHECK (length(trim(action)) > 0)
);

-- Enhanced Sessions Table with Optimizations
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_id` text(255),
  `user_id` text(255),
  `status` text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  `created_at` integer DEFAULT (unixepoch()),
  `expires_at` integer NOT NULL,
  `last_activity` integer DEFAULT (unixepoch()),
  `metadata` text, -- JSON object
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_sessions_expires_future` CHECK (expires_at > created_at),
  CONSTRAINT `chk_sessions_last_activity_valid` CHECK (last_activity >= created_at)
);

-- Enhanced Tags Table with Optimizations
CREATE TABLE IF NOT EXISTS `tags` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text(255) NOT NULL,
  `color` text(7) CHECK (color IS NULL OR (length(color) = 7 AND color LIKE '#%')),
  `description` text,
  `created_at` integer DEFAULT (unixepoch()),
  CONSTRAINT `chk_tags_name_not_empty` CHECK (length(trim(name)) > 0)
);

-- Enhanced Item Dependencies Table with Optimizations
CREATE TABLE IF NOT EXISTS `item_dependencies` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `item_id` text(255) NOT NULL,
  `depends_on_item_id` text(255) NOT NULL,
  `dependency_type` text DEFAULT 'requires' CHECK (dependency_type IN ('requires', 'blocks', 'relates_to')),
  `created_at` integer DEFAULT (unixepoch()),
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`depends_on_item_id`) REFERENCES `items`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_item_deps_no_self_reference` CHECK (item_id != depends_on_item_id)
);

-- Performance Indexes for Lists
CREATE INDEX IF NOT EXISTS `idx_lists_parent_status_position` ON `lists` (`parent_list_id`, `status`, `position`);
CREATE INDEX IF NOT EXISTS `idx_lists_created_by_status` ON `lists` (`created_by`, `status`);
CREATE INDEX IF NOT EXISTS `idx_lists_updated_at_desc` ON `lists` (`updated_at` DESC);
CREATE INDEX IF NOT EXISTS `idx_lists_status_created_at` ON `lists` (`status`, `created_at`);

-- Performance Indexes for Items
CREATE INDEX IF NOT EXISTS `idx_items_list_status_priority` ON `items` (`list_id`, `status`, `priority`);
CREATE INDEX IF NOT EXISTS `idx_items_assigned_status_due` ON `items` (`assigned_to`, `status`, `due_date`);
CREATE INDEX IF NOT EXISTS `idx_items_due_date_not_null` ON `items` (`due_date`) WHERE `due_date` IS NOT NULL;
CREATE INDEX IF NOT EXISTS `idx_items_status_priority` ON `items` (`status`, `priority`);
CREATE INDEX IF NOT EXISTS `idx_items_created_by_status` ON `items` (`created_by`, `status`);
CREATE INDEX IF NOT EXISTS `idx_items_position_list` ON `items` (`list_id`, `position`);

-- Performance Indexes for Agents
CREATE INDEX IF NOT EXISTS `idx_agents_role_status` ON `agents` (`role`, `status`);
CREATE INDEX IF NOT EXISTS `idx_agents_status_last_active` ON `agents` (`status`, `last_active`);
CREATE INDEX IF NOT EXISTS `idx_agents_last_active_desc` ON `agents` (`last_active` DESC);

-- Performance Indexes for Action Logs
CREATE INDEX IF NOT EXISTS `idx_action_logs_agent_timestamp_desc` ON `action_logs` (`agent_id`, `timestamp` DESC);
CREATE INDEX IF NOT EXISTS `idx_action_logs_target_timestamp` ON `action_logs` (`target_type`, `target_id`, `timestamp`);
CREATE INDEX IF NOT EXISTS `idx_action_logs_session_success` ON `action_logs` (`session_id`, `success`);
CREATE INDEX IF NOT EXISTS `idx_action_logs_timestamp_desc` ON `action_logs` (`timestamp` DESC);
CREATE INDEX IF NOT EXISTS `idx_action_logs_success_timestamp` ON `action_logs` (`success`, `timestamp`);

-- Performance Indexes for Sessions
CREATE INDEX IF NOT EXISTS `idx_sessions_agent_status_expires` ON `sessions` (`agent_id`, `status`, `expires_at`);
CREATE INDEX IF NOT EXISTS `idx_sessions_expires_at_active` ON `sessions` (`expires_at`) WHERE `status` = 'active';
CREATE INDEX IF NOT EXISTS `idx_sessions_last_activity_desc` ON `sessions` (`last_activity` DESC);
CREATE INDEX IF NOT EXISTS `idx_sessions_user_status` ON `sessions` (`user_id`, `status`);

-- Performance Indexes for Tags
CREATE UNIQUE INDEX IF NOT EXISTS `idx_tags_name_unique` ON `tags` (`name`);
CREATE INDEX IF NOT EXISTS `idx_tags_created_at` ON `tags` (`created_at`);

-- Performance Indexes for Item Dependencies
CREATE INDEX IF NOT EXISTS `idx_item_deps_item_type` ON `item_dependencies` (`item_id`, `dependency_type`);
CREATE INDEX IF NOT EXISTS `idx_item_deps_depends_on_type` ON `item_dependencies` (`depends_on_item_id`, `dependency_type`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_item_deps_unique` ON `item_dependencies` (`item_id`, `depends_on_item_id`, `dependency_type`);

-- Composite Indexes for Complex Queries
CREATE INDEX IF NOT EXISTS `idx_items_search_composite` ON `items` (`list_id`, `status`, `priority`, `due_date`);
CREATE INDEX IF NOT EXISTS `idx_action_logs_audit_composite` ON `action_logs` (`target_type`, `target_id`, `agent_id`, `timestamp`);
CREATE INDEX IF NOT EXISTS `idx_lists_hierarchy_composite` ON `lists` (`parent_list_id`, `position`, `status`, `created_at`);

-- Triggers for Updated At Timestamps
CREATE TRIGGER IF NOT EXISTS `trigger_lists_updated_at`
  AFTER UPDATE ON `lists`
  BEGIN
    UPDATE `lists` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
  END;

CREATE TRIGGER IF NOT EXISTS `trigger_items_updated_at`
  AFTER UPDATE ON `items`
  BEGIN
    UPDATE `items` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
  END;

CREATE TRIGGER IF NOT EXISTS `trigger_agents_updated_at`
  AFTER UPDATE ON `agents`
  BEGIN
    UPDATE `agents` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
  END;

-- Triggers for Completed At Timestamps
CREATE TRIGGER IF NOT EXISTS `trigger_items_completed_at`
  AFTER UPDATE OF `status` ON `items`
  WHEN NEW.`status` = 'completed' AND OLD.`status` != 'completed'
  BEGIN
    UPDATE `items` SET `completed_at` = unixepoch() WHERE `id` = NEW.`id`;
  END;

CREATE TRIGGER IF NOT EXISTS `trigger_lists_completed_at`
  AFTER UPDATE OF `status` ON `lists`
  WHEN NEW.`status` = 'archived' AND OLD.`status` != 'archived'
  BEGIN
    UPDATE `lists` SET `completed_at` = unixepoch() WHERE `id` = NEW.`id`;
  END;

-- DOWN MIGRATION
-- Remove triggers
DROP TRIGGER IF EXISTS `trigger_lists_completed_at`;
DROP TRIGGER IF EXISTS `trigger_items_completed_at`;
DROP TRIGGER IF EXISTS `trigger_agents_updated_at`;
DROP TRIGGER IF EXISTS `trigger_items_updated_at`;
DROP TRIGGER IF EXISTS `trigger_lists_updated_at`;

-- Remove composite indexes
DROP INDEX IF EXISTS `idx_lists_hierarchy_composite`;
DROP INDEX IF EXISTS `idx_action_logs_audit_composite`;
DROP INDEX IF EXISTS `idx_items_search_composite`;

-- Remove performance indexes
DROP INDEX IF EXISTS `idx_item_deps_unique`;
DROP INDEX IF EXISTS `idx_item_deps_depends_on_type`;
DROP INDEX IF EXISTS `idx_item_deps_item_type`;
DROP INDEX IF EXISTS `idx_tags_created_at`;
DROP INDEX IF EXISTS `idx_tags_name_unique`;
DROP INDEX IF EXISTS `idx_sessions_user_status`;
DROP INDEX IF EXISTS `idx_sessions_last_activity_desc`;
DROP INDEX IF EXISTS `idx_sessions_expires_at_active`;
DROP INDEX IF EXISTS `idx_sessions_agent_status_expires`;
DROP INDEX IF EXISTS `idx_action_logs_success_timestamp`;
DROP INDEX IF EXISTS `idx_action_logs_timestamp_desc`;
DROP INDEX IF EXISTS `idx_action_logs_session_success`;
DROP INDEX IF EXISTS `idx_action_logs_target_timestamp`;
DROP INDEX IF EXISTS `idx_action_logs_agent_timestamp_desc`;
DROP INDEX IF EXISTS `idx_agents_last_active_desc`;
DROP INDEX IF EXISTS `idx_agents_status_last_active`;
DROP INDEX IF EXISTS `idx_agents_role_status`;
DROP INDEX IF EXISTS `idx_items_position_list`;
DROP INDEX IF EXISTS `idx_items_created_by_status`;
DROP INDEX IF EXISTS `idx_items_status_priority`;
DROP INDEX IF EXISTS `idx_items_due_date_not_null`;
DROP INDEX IF EXISTS `idx_items_assigned_status_due`;
DROP INDEX IF EXISTS `idx_items_list_status_priority`;
DROP INDEX IF EXISTS `idx_lists_status_created_at`;
DROP INDEX IF EXISTS `idx_lists_updated_at_desc`;
DROP INDEX IF EXISTS `idx_lists_created_by_status`;
DROP INDEX IF EXISTS `idx_lists_parent_status_position`;

-- Remove tables (in reverse dependency order)
DROP TABLE IF EXISTS `item_dependencies`;
DROP TABLE IF EXISTS `tags`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `action_logs`;
DROP TABLE IF EXISTS `agents`;
DROP TABLE IF EXISTS `items`;
DROP TABLE IF EXISTS `lists`;
