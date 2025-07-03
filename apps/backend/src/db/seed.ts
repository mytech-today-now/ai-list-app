#!/usr/bin/env node

import dotenv from 'dotenv'
import { getDb } from './connection'
import { agentsTable, listsTable, itemsTable, tagsTable } from './schema'
import { exit } from 'process'
import { randomUUID } from 'crypto'

// Load environment variables
dotenv.config()

/**
 * Database seeder for initial data
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...')
    
    const db = await getDb()
    
    // Seed agents
    console.log('📝 Seeding agents...')
    const agents = [
      {
        id: 'reader-1',
        name: 'Reader Agent',
        role: 'reader' as const,
        status: 'active' as const,
        permissions: JSON.stringify(['read', 'status']),
        configuration: JSON.stringify({ maxConcurrentTasks: 5 }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'executor-1',
        name: 'Executor Agent',
        role: 'executor' as const,
        status: 'active' as const,
        permissions: JSON.stringify(['read', 'execute', 'mark_done', 'reorder']),
        configuration: JSON.stringify({ maxConcurrentTasks: 3 }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'planner-1',
        name: 'Planner Agent',
        role: 'planner' as const,
        status: 'active' as const,
        permissions: JSON.stringify(['create', 'read', 'update', 'plan']),
        configuration: JSON.stringify({ maxConcurrentTasks: 2 }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    await db.insert(agentsTable).values(agents).onConflictDoNothing()
    console.log(`✅ Seeded ${agents.length} agents`)
    
    // Seed tags
    console.log('🏷️ Seeding tags...')
    const tags = [
      {
        id: randomUUID(),
        name: 'urgent',
        color: '#ff4444',
        description: 'High priority tasks that need immediate attention',
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: 'work',
        color: '#4444ff',
        description: 'Work-related tasks',
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: 'personal',
        color: '#44ff44',
        description: 'Personal tasks and activities',
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: 'learning',
        color: '#ff8844',
        description: 'Educational and skill development tasks',
        createdAt: new Date()
      }
    ]
    
    await db.insert(tagsTable).values(tags).onConflictDoNothing()
    console.log(`✅ Seeded ${tags.length} tags`)
    
    // Seed sample list
    console.log('📋 Seeding sample list...')
    const sampleListId = randomUUID()
    const sampleList = {
      id: sampleListId,
      title: 'Getting Started with AI ToDo',
      description: 'A sample list to help you get started with the AI ToDo system',
      priority: 'medium' as const,
      status: 'active' as const,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await db.insert(listsTable).values([sampleList]).onConflictDoNothing()
    console.log('✅ Seeded sample list')
    
    // Seed sample items
    console.log('📝 Seeding sample items...')
    const sampleItems = [
      {
        id: randomUUID(),
        listId: sampleListId,
        title: 'Explore the AI ToDo interface',
        description: 'Take a tour of the application and familiarize yourself with the features',
        position: 0,
        priority: 'high' as const,
        status: 'pending' as const,
        tags: JSON.stringify(['learning']),
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        listId: sampleListId,
        title: 'Create your first custom list',
        description: 'Try creating a new list for your own tasks',
        position: 1,
        priority: 'medium' as const,
        status: 'pending' as const,
        tags: JSON.stringify(['learning']),
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        listId: sampleListId,
        title: 'Test AI agent interactions',
        description: 'Experiment with different AI agents and their capabilities',
        position: 2,
        priority: 'medium' as const,
        status: 'pending' as const,
        tags: JSON.stringify(['learning', 'work']),
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    await db.insert(itemsTable).values(sampleItems).onConflictDoNothing()
    console.log(`✅ Seeded ${sampleItems.length} sample items`)
    
    console.log('🎉 Database seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => exit(0))
    .catch(() => exit(1))
}

export { seedDatabase }
