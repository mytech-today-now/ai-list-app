import { describe, it, expect } from 'vitest'
import React from 'react'
import {
  renderForVisualTest,
  takeVisualSnapshot,
  testAcrossDevices,
  testAcrossThemes,
  testComponentStates,
  testResponsiveDesign,
  testAccessibilityStates,
} from '../visual-test-utils'

// Mock TaskList component for testing
const MockTaskList: React.FC<{
  tasks?: any[]
  loading?: boolean
  error?: string
  disabled?: boolean
  'data-focus'?: boolean
  'data-hover'?: boolean
  'data-active'?: boolean
}> = ({ 
  tasks = [], 
  loading = false, 
  error = null, 
  disabled = false,
  ...props 
}) => {
  if (loading) {
    return (
      <div className="task-list loading" {...props}>
        <div className="loading-spinner">Loading tasks...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="task-list error" {...props}>
        <div className="error-message">{error}</div>
      </div>
    )
  }
  
  if (tasks.length === 0) {
    return (
      <div className="task-list empty" {...props}>
        <div className="empty-state">No tasks found</div>
      </div>
    )
  }
  
  return (
    <div className={`task-list ${disabled ? 'disabled' : ''}`} {...props}>
      <h2>Task List</h2>
      <ul>
        {tasks.map((task, index) => (
          <li key={index} className="task-item">
            <input type="checkbox" checked={task.completed} readOnly />
            <span className={task.completed ? 'completed' : ''}>{task.title}</span>
            <span className={`priority priority-${task.priority}`}>{task.priority}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const mockTasks = [
  { id: '1', title: 'Complete project documentation', completed: false, priority: 'high' },
  { id: '2', title: 'Review pull requests', completed: true, priority: 'medium' },
  { id: '3', title: 'Update dependencies', completed: false, priority: 'low' },
  { id: '4', title: 'Fix responsive design issues', completed: false, priority: 'high' },
  { id: '5', title: 'Write unit tests', completed: true, priority: 'medium' },
]

describe('TaskList Visual Tests', () => {
  describe('Basic States', () => {
    it('should render default state correctly', async () => {
      const { container } = renderForVisualTest(
        <MockTaskList tasks={mockTasks} />
      )
      await takeVisualSnapshot(container, 'TaskList-default')
    })
    
    it('should render loading state correctly', async () => {
      const { container } = renderForVisualTest(
        <MockTaskList loading={true} />
      )
      await takeVisualSnapshot(container, 'TaskList-loading')
    })
    
    it('should render error state correctly', async () => {
      const { container } = renderForVisualTest(
        <MockTaskList error="Failed to load tasks" />
      )
      await takeVisualSnapshot(container, 'TaskList-error')
    })
    
    it('should render empty state correctly', async () => {
      const { container } = renderForVisualTest(
        <MockTaskList tasks={[]} />
      )
      await takeVisualSnapshot(container, 'TaskList-empty')
    })
    
    it('should render disabled state correctly', async () => {
      const { container } = renderForVisualTest(
        <MockTaskList tasks={mockTasks} disabled={true} />
      )
      await takeVisualSnapshot(container, 'TaskList-disabled')
    })
  })
  
  describe('Cross-Device Testing', () => {
    it('should render correctly across different devices', async () => {
      await testAcrossDevices(
        <MockTaskList tasks={mockTasks} />,
        'TaskList-devices'
      )
    })
  })
  
  describe('Theme Testing', () => {
    it('should render correctly across different themes', async () => {
      await testAcrossThemes(
        <MockTaskList tasks={mockTasks} />,
        'TaskList-themes'
      )
    })
  })
  
  describe('Responsive Design', () => {
    it('should adapt to different screen sizes', async () => {
      await testResponsiveDesign(
        <MockTaskList tasks={mockTasks} />,
        'TaskList-responsive'
      )
    })
  })
  
  describe('Accessibility States', () => {
    it('should render accessibility states correctly', async () => {
      await testAccessibilityStates(
        <MockTaskList tasks={mockTasks} />,
        'TaskList-a11y'
      )
    })
  })
  
  describe('Data Variations', () => {
    it('should render with single task', async () => {
      const { container } = renderForVisualTest(
        <MockTaskList tasks={[mockTasks[0]]} />
      )
      await takeVisualSnapshot(container, 'TaskList-single-task')
    })
    
    it('should render with many tasks', async () => {
      const manyTasks = Array.from({ length: 20 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i + 1}`,
        completed: i % 3 === 0,
        priority: ['low', 'medium', 'high'][i % 3],
      }))
      
      const { container } = renderForVisualTest(
        <MockTaskList tasks={manyTasks} />
      )
      await takeVisualSnapshot(container, 'TaskList-many-tasks')
    })
    
    it('should render with all completed tasks', async () => {
      const completedTasks = mockTasks.map(task => ({ ...task, completed: true }))
      
      const { container } = renderForVisualTest(
        <MockTaskList tasks={completedTasks} />
      )
      await takeVisualSnapshot(container, 'TaskList-all-completed')
    })
    
    it('should render with mixed priorities', async () => {
      const mixedPriorityTasks = [
        { id: '1', title: 'High priority task', completed: false, priority: 'high' },
        { id: '2', title: 'Medium priority task', completed: false, priority: 'medium' },
        { id: '3', title: 'Low priority task', completed: false, priority: 'low' },
        { id: '4', title: 'Another high priority', completed: true, priority: 'high' },
      ]
      
      const { container } = renderForVisualTest(
        <MockTaskList tasks={mixedPriorityTasks} />
      )
      await takeVisualSnapshot(container, 'TaskList-mixed-priorities')
    })
  })
  
  describe('Edge Cases', () => {
    it('should render with very long task titles', async () => {
      const longTitleTasks = [
        {
          id: '1',
          title: 'This is a very long task title that should test how the component handles text overflow and wrapping in different scenarios',
          completed: false,
          priority: 'medium',
        },
        {
          id: '2',
          title: 'AnotherVeryLongTaskTitleWithoutSpacesThatShouldTestWordBreaking',
          completed: true,
          priority: 'high',
        },
      ]
      
      const { container } = renderForVisualTest(
        <MockTaskList tasks={longTitleTasks} />
      )
      await takeVisualSnapshot(container, 'TaskList-long-titles')
    })
    
    it('should render with special characters', async () => {
      const specialCharTasks = [
        { id: '1', title: 'Task with émojis 🚀 ✅ 📝', completed: false, priority: 'high' },
        { id: '2', title: 'Task with spëcial çharacters', completed: true, priority: 'medium' },
        { id: '3', title: 'Task with "quotes" and \'apostrophes\'', completed: false, priority: 'low' },
      ]
      
      const { container } = renderForVisualTest(
        <MockTaskList tasks={specialCharTasks} />
      )
      await takeVisualSnapshot(container, 'TaskList-special-chars')
    })
  })
  
  describe('Performance Visual Tests', () => {
    it('should render large dataset efficiently', async () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        title: `Performance test task ${i + 1}`,
        completed: Math.random() > 0.5,
        priority: ['low', 'medium', 'high'][i % 3],
      }))
      
      const startTime = performance.now()
      const { container } = renderForVisualTest(
        <MockTaskList tasks={largeTasks} />
      )
      const renderTime = performance.now() - startTime
      
      // Assert performance
      expect(renderTime).toBeLessThan(1000) // Should render in less than 1 second
      
      await takeVisualSnapshot(container, 'TaskList-performance-large')
    })
  })
})
