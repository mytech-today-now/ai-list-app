import { test, expect, Page } from '@playwright/test'

// Test data and utilities
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User',
}

const testTasks = [
  { title: 'Complete project documentation', priority: 'high', description: 'Write comprehensive docs' },
  { title: 'Review pull requests', priority: 'medium', description: 'Review team PRs' },
  { title: 'Update dependencies', priority: 'low', description: 'Update npm packages' },
]

const testLists = [
  { name: 'Work Tasks', description: 'Professional tasks and projects', color: '#3B82F6' },
  { name: 'Personal', description: 'Personal todos and reminders', color: '#10B981' },
  { name: 'Shopping', description: 'Shopping list items', color: '#F59E0B' },
]

// Helper functions
const loginUser = async (page: Page, email: string = testUser.email, password: string = testUser.password) => {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('/')
}

const createTaskList = async (page: Page, list: typeof testLists[0]) => {
  await page.click('[data-testid="create-list-button"]')
  await page.fill('[data-testid="list-name-input"]', list.name)
  await page.fill('[data-testid="list-description-input"]', list.description)
  await page.click(`[data-testid="color-picker"][data-color="${list.color}"]`)
  await page.click('[data-testid="save-list-button"]')
  await page.waitForSelector(`[data-testid="list-${list.name}"]`)
}

const createTask = async (page: Page, task: typeof testTasks[0], listName?: string) => {
  if (listName) {
    await page.click(`[data-testid="list-${listName}"]`)
  }
  await page.click('[data-testid="add-task-button"]')
  await page.fill('[data-testid="task-title-input"]', task.title)
  await page.fill('[data-testid="task-description-input"]', task.description)
  await page.selectOption('[data-testid="task-priority-select"]', task.priority)
  await page.click('[data-testid="save-task-button"]')
  await page.waitForSelector(`[data-testid="task-${task.title}"]`)
}

test.describe('Complete User Workflows', () => {
  test.describe('New User Onboarding', () => {
    test('should complete full registration and onboarding flow', async ({ page }) => {
      // 1. Visit landing page
      await page.goto('/')
      await expect(page.getByText('AI ToDo MCP')).toBeVisible()
      
      // 2. Navigate to registration
      await page.click('[data-testid="get-started-button"]')
      await expect(page).toHaveURL('/register')
      
      // 3. Fill registration form
      await page.fill('[data-testid="name-input"]', testUser.name)
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.fill('[data-testid="confirm-password-input"]', testUser.password)
      await page.check('[data-testid="terms-checkbox"]')
      
      // 4. Submit registration
      await page.click('[data-testid="register-button"]')
      await page.waitForURL('/onboarding')
      
      // 5. Complete onboarding steps
      await expect(page.getByText('Welcome to AI ToDo MCP')).toBeVisible()
      
      // Step 1: Choose preferences
      await page.click('[data-testid="theme-dark"]')
      await page.click('[data-testid="next-button"]')
      
      // Step 2: Create first list
      await page.fill('[data-testid="first-list-name"]', 'Getting Started')
      await page.click('[data-testid="next-button"]')
      
      // Step 3: Add first task
      await page.fill('[data-testid="first-task-title"]', 'Explore the app')
      await page.click('[data-testid="finish-onboarding"]')
      
      // 6. Verify redirect to dashboard
      await page.waitForURL('/')
      await expect(page.getByText('Getting Started')).toBeVisible()
      await expect(page.getByText('Explore the app')).toBeVisible()
    })
    
    test('should handle registration validation errors', async ({ page }) => {
      await page.goto('/register')
      
      // Try to submit empty form
      await page.click('[data-testid="register-button"]')
      await expect(page.getByText('Name is required')).toBeVisible()
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toBeVisible()
      
      // Try invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.click('[data-testid="register-button"]')
      await expect(page.getByText('Please enter a valid email')).toBeVisible()
      
      // Try weak password
      await page.fill('[data-testid="password-input"]', '123')
      await page.click('[data-testid="register-button"]')
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
      
      // Try mismatched passwords
      await page.fill('[data-testid="password-input"]', 'validpassword123')
      await page.fill('[data-testid="confirm-password-input"]', 'differentpassword')
      await page.click('[data-testid="register-button"]')
      await expect(page.getByText('Passwords do not match')).toBeVisible()
    })
  })
  
  test.describe('Task Management Workflows', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page)
    })
    
    test('should complete full task lifecycle', async ({ page }) => {
      // 1. Create a new list
      await createTaskList(page, testLists[0])
      
      // 2. Add multiple tasks
      for (const task of testTasks) {
        await createTask(page, task, testLists[0].name)
      }
      
      // 3. Verify all tasks are created
      for (const task of testTasks) {
        await expect(page.getByText(task.title)).toBeVisible()
      }
      
      // 4. Edit a task
      await page.click(`[data-testid="task-${testTasks[0].title}"] [data-testid="edit-button"]`)
      await page.fill('[data-testid="task-title-input"]', 'Updated: ' + testTasks[0].title)
      await page.click('[data-testid="save-task-button"]')
      await expect(page.getByText('Updated: ' + testTasks[0].title)).toBeVisible()
      
      // 5. Mark task as complete
      await page.click(`[data-testid="task-${testTasks[1].title}"] [data-testid="complete-checkbox"]`)
      await expect(page.locator(`[data-testid="task-${testTasks[1].title}"]`)).toHaveClass(/completed/)
      
      // 6. Set due date
      await page.click(`[data-testid="task-${testTasks[2].title}"] [data-testid="edit-button"]`)
      await page.fill('[data-testid="due-date-input"]', '2024-12-31')
      await page.click('[data-testid="save-task-button"]')
      await expect(page.getByText('Dec 31, 2024')).toBeVisible()
      
      // 7. Add subtasks
      await page.click(`[data-testid="task-${testTasks[0].title}"] [data-testid="add-subtask-button"]`)
      await page.fill('[data-testid="subtask-title-input"]', 'Research requirements')
      await page.click('[data-testid="save-subtask-button"]')
      await expect(page.getByText('Research requirements')).toBeVisible()
      
      // 8. Delete a task
      await page.click(`[data-testid="task-${testTasks[2].title}"] [data-testid="delete-button"]`)
      await page.click('[data-testid="confirm-delete-button"]')
      await expect(page.getByText(testTasks[2].title)).not.toBeVisible()
    })
    
    test('should handle task filtering and sorting', async ({ page }) => {
      // Setup: Create list with tasks
      await createTaskList(page, testLists[0])
      for (const task of testTasks) {
        await createTask(page, task, testLists[0].name)
      }
      
      // Mark one task as complete
      await page.click(`[data-testid="task-${testTasks[0].title}"] [data-testid="complete-checkbox"]`)
      
      // Test filtering
      await page.click('[data-testid="filter-dropdown"]')
      await page.click('[data-testid="filter-completed"]')
      await expect(page.getByText(testTasks[0].title)).toBeVisible()
      await expect(page.getByText(testTasks[1].title)).not.toBeVisible()
      
      await page.click('[data-testid="filter-pending"]')
      await expect(page.getByText(testTasks[0].title)).not.toBeVisible()
      await expect(page.getByText(testTasks[1].title)).toBeVisible()
      
      await page.click('[data-testid="filter-all"]')
      await expect(page.getByText(testTasks[0].title)).toBeVisible()
      await expect(page.getByText(testTasks[1].title)).toBeVisible()
      
      // Test sorting
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('[data-testid="sort-priority"]')
      
      // Verify high priority tasks appear first
      const taskElements = await page.locator('[data-testid^="task-"]').all()
      const firstTaskText = await taskElements[0].textContent()
      expect(firstTaskText).toContain('high')
      
      // Sort by due date
      await page.click('[data-testid="sort-due-date"]')
      // Verify sorting (would need due dates set)
    })
    
    test('should handle bulk operations', async ({ page }) => {
      // Setup: Create list with multiple tasks
      await createTaskList(page, testLists[0])
      for (const task of testTasks) {
        await createTask(page, task, testLists[0].name)
      }
      
      // Select multiple tasks
      await page.click(`[data-testid="task-${testTasks[0].title}"] [data-testid="select-checkbox"]`)
      await page.click(`[data-testid="task-${testTasks[1].title}"] [data-testid="select-checkbox"]`)
      
      // Verify bulk actions appear
      await expect(page.getByText('2 tasks selected')).toBeVisible()
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible()
      
      // Bulk complete
      await page.click('[data-testid="bulk-complete"]')
      await expect(page.locator(`[data-testid="task-${testTasks[0].title}"]`)).toHaveClass(/completed/)
      await expect(page.locator(`[data-testid="task-${testTasks[1].title}"]`)).toHaveClass(/completed/)
      
      // Bulk delete
      await page.click(`[data-testid="task-${testTasks[0].title}"] [data-testid="select-checkbox"]`)
      await page.click(`[data-testid="task-${testTasks[1].title}"] [data-testid="select-checkbox"]`)
      await page.click('[data-testid="bulk-delete"]')
      await page.click('[data-testid="confirm-bulk-delete"]')
      
      await expect(page.getByText(testTasks[0].title)).not.toBeVisible()
      await expect(page.getByText(testTasks[1].title)).not.toBeVisible()
    })
  })
  
  test.describe('AI Agent Workflows', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page)
    })
    
    test('should create and interact with AI agent', async ({ page }) => {
      // 1. Navigate to AI agents
      await page.click('[data-testid="manage-agents-button"]')
      await expect(page).toHaveURL('/agents')
      
      // 2. Create new agent
      await page.click('[data-testid="create-agent-button"]')
      await page.fill('[data-testid="agent-name-input"]', 'Task Assistant')
      await page.fill('[data-testid="agent-description-input"]', 'Helps with task management')
      await page.selectOption('[data-testid="agent-model-select"]', 'gpt-3.5-turbo')
      await page.fill('[data-testid="system-prompt-textarea"]', 'You are a helpful task management assistant.')
      await page.click('[data-testid="save-agent-button"]')
      
      // 3. Verify agent is created
      await expect(page.getByText('Task Assistant')).toBeVisible()
      
      // 4. Test agent interaction
      await page.click('[data-testid="agent-Task Assistant"] [data-testid="chat-button"]')
      await page.fill('[data-testid="message-input"]', 'Help me organize my tasks')
      await page.click('[data-testid="send-button"]')
      
      // 5. Verify response
      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible()
      
      // 6. Test agent suggestions
      await page.click('[data-testid="get-suggestions-button"]')
      await expect(page.locator('[data-testid="task-suggestions"]')).toBeVisible()
    })
  })
})
