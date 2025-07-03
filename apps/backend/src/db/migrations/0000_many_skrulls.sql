CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text(500) NOT NULL,
	`description` text,
	`parent_list_id` text,
	`position` integer DEFAULT 0,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'active',
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`completed_at` integer,
	`metadata` text,
	FOREIGN KEY (`parent_list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`title` text(500) NOT NULL,
	`description` text,
	`position` integer DEFAULT 0,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'pending',
	`due_date` integer,
	`estimated_duration` integer,
	`actual_duration` integer,
	`tags` text,
	`dependencies` text,
	`created_by` text,
	`assigned_to` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`completed_at` integer,
	`metadata` text,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active',
	`permissions` text,
	`configuration` text,
	`api_key_hash` text(255),
	`last_active` integer,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `action_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`command` text(1000) NOT NULL,
	`action` text(100) NOT NULL,
	`target_type` text(100) NOT NULL,
	`target_id` text(255),
	`agent_id` text(255),
	`parameters` text,
	`result` text,
	`success` integer NOT NULL,
	`error_message` text,
	`execution_time` integer,
	`timestamp` integer DEFAULT (unixepoch()),
	`rollback_id` integer,
	`session_id` text(255),
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rollback_id`) REFERENCES `action_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text(255),
	`user_id` text(255),
	`status` text DEFAULT 'active',
	`created_at` integer DEFAULT (unixepoch()),
	`expires_at` integer NOT NULL,
	`last_activity` integer DEFAULT (unixepoch()),
	`metadata` text,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`color` text(7),
	`description` text,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `item_dependencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` text(255) NOT NULL,
	`depends_on_item_id` text(255) NOT NULL,
	`dependency_type` text DEFAULT 'requires',
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`depends_on_item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lists_parent_list` ON `lists` (`parent_list_id`);--> statement-breakpoint
CREATE INDEX `idx_lists_status` ON `lists` (`status`);--> statement-breakpoint
CREATE INDEX `idx_lists_created_at` ON `lists` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_lists_parent_position` ON `lists` (`parent_list_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_items_list_id` ON `items` (`list_id`);--> statement-breakpoint
CREATE INDEX `idx_items_status` ON `items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_items_due_date` ON `items` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_items_assigned_to` ON `items` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_items_list_status` ON `items` (`list_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_items_assigned_status` ON `items` (`assigned_to`,`status`);--> statement-breakpoint
CREATE INDEX `idx_agents_role` ON `agents` (`role`);--> statement-breakpoint
CREATE INDEX `idx_agents_status` ON `agents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_agents_last_active` ON `agents` (`last_active`);--> statement-breakpoint
CREATE INDEX `idx_action_logs_timestamp` ON `action_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_action_logs_agent_id` ON `action_logs` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_action_logs_target` ON `action_logs` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_action_logs_session` ON `action_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_action_logs_agent_timestamp` ON `action_logs` (`agent_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires_at` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_sessions_agent_id` ON `sessions` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_tags_name` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_tag_name` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `idx_item_dependencies_item_id` ON `item_dependencies` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_item_dependencies_depends_on` ON `item_dependencies` (`depends_on_item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_item_dependency` ON `item_dependencies` (`item_id`,`depends_on_item_id`);