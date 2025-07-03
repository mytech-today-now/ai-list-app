import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Database imports
import { dbManager, gracefulShutdown } from './db/connection'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'

// Route imports
import listsRouter from './routes/lists'
import itemsRouter from './routes/items'
import agentsRouter from './routes/agents'

// Create database directory if it doesn't exist
const dbPath = process.env.DATABASE_URL?.replace('sqlite:', '') || './data/ai-todo.db'
await mkdir(dirname(dbPath), { recursive: true }).catch(() => {})

const app = express()
const PORT = process.env.PORT || 3001

// Initialize database
async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to database...')
    await dbManager.connect()
    console.log('🚀 Running database migrations...')
    await dbManager.runMigrations()
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = dbManager.isConnected()
    res.json({
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'AI ToDo MCP Backend',
      database: dbConnected ? 'connected' : 'disconnected'
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'AI ToDo MCP Backend',
      error: 'Health check failed'
    })
  }
})

// API routes
app.use('/api/lists', listsRouter)
app.use('/api/items', itemsRouter)
app.use('/api/agents', agentsRouter)

// MCP command endpoint
app.post('/api/mcp/command', (req, res) => {
  const { action, targetType, targetId, parameters } = req.body
  
  res.json({
    success: true,
    command: `${action}:${targetType}:${targetId}`,
    result: {
      message: `MCP command executed: ${action} on ${targetType}`,
      parameters
    },
    metadata: {
      executionTime: Math.random() * 100,
      agent: 'system',
      timestamp: new Date().toISOString()
    }
  })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: 'Something went wrong!'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not found',
    message: 'The requested resource was not found'
  })
})

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...')
  await gracefulShutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  await gracefulShutdown()
  process.exit(0)
})

// Start server
async function startServer() {
  await initializeDatabase()

  app.listen(PORT, () => {
    console.log(`🚀 AI ToDo MCP Backend running on port ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/health`)
    console.log(`🔗 API base: http://localhost:${PORT}/api`)
    console.log(`📋 Lists: http://localhost:${PORT}/api/lists`)
    console.log(`📝 Items: http://localhost:${PORT}/api/items`)
    console.log(`🤖 Agents: http://localhost:${PORT}/api/agents`)
  })
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})
