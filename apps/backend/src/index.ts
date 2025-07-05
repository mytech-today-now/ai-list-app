import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import winston from 'winston'
import expressWinston from 'express-winston'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'

// Load environment variables
dotenv.config()

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, correlationId, ...meta }) => {
      const logEntry = {
        timestamp,
        level,
        message,
        correlationId,
        ...meta
      }
      if (stack) {
        logEntry.stack = stack
      }
      return JSON.stringify(logEntry)
    })
  ),
  defaultMeta: { service: 'ai-todo-backend' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, correlationId }) => {
          const corrId = correlationId ? `[${correlationId}] ` : ''
          return `${timestamp} ${level}: ${corrId}${message}`
        })
      )
    })
  ]
})

// Create logs directory if it doesn't exist
import { mkdir } from 'fs/promises'
await mkdir('logs', { recursive: true }).catch(() => {})

// Database imports
import { dbManager, gracefulShutdown } from './db/connection'
import { dirname } from 'path'

// Route imports
import listsRouter from './routes/lists'
import itemsRouter from './routes/items'
import agentsRouter from './routes/agents'
import sessionsRouter from './routes/sessions'
import bulkRouter from './routes/bulk'

// Enhanced middleware imports
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

// Create database directory if it doesn't exist
const dbPath = process.env.DATABASE_URL?.replace('sqlite:', '') || './data/ai-todo.db'
await mkdir(dirname(dbPath), { recursive: true }).catch(() => {})

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId
    })
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    })
  }
})

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'https://your-frontend-domain.com'
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
}

const app = express()
const PORT = process.env.PORT || 3001

// Initialize database
async function initializeDatabase() {
  try {
    logger.info('🔌 Connecting to database...')
    await dbManager.connect()
    logger.info('🚀 Running database migrations...')
    await dbManager.runMigrations()
    logger.info('✅ Database initialized successfully')
  } catch (error) {
    logger.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

// Correlation ID middleware
const correlationIdMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || randomUUID()
  req.correlationId = correlationId
  res.setHeader('X-Correlation-ID', correlationId)
  next()
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}))

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
  threshold: 1024 // Only compress responses larger than 1KB
}))

app.use(cors(corsOptions))
app.use(limiter)
app.use(correlationIdMiddleware)

// Winston request logging
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  ignoreRoute: (req, res) => req.url === '/health',
  requestWhitelist: ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query'],
  responseWhitelist: ['statusCode'],
  dynamicMeta: (req, res) => ({
    correlationId: req.correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  })
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = dbManager.isConnected()
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    const healthStatus = {
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'AI ToDo MCP Backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      database: {
        status: dbConnected ? 'connected' : 'disconnected',
        type: process.env.DATABASE_URL?.includes('postgres') ? 'postgresql' : 'sqlite'
      },
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      correlationId: req.correlationId
    }

    logger.debug('Health check performed', {
      correlationId: req.correlationId,
      status: healthStatus.status
    })

    res.json(healthStatus)
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      correlationId: req.correlationId
    })

    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'AI ToDo MCP Backend',
      error: 'Health check failed',
      correlationId: req.correlationId
    })
  }
})

// API routes
app.use('/api/lists', listsRouter)
app.use('/api/items', itemsRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/bulk', bulkRouter)

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

// Winston error logging middleware
app.use(expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}} - {{err.message}}",
  requestWhitelist: ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query'],
  dynamicMeta: (req, res, err) => ({
    correlationId: req.correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    errorType: err.constructor.name
  })
}))

// Enhanced error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const correlationId = req.correlationId || randomUUID()

  // Determine error type and status code
  let statusCode = 500
  let errorType = 'InternalServerError'
  let message = 'Something went wrong!'

  if (err.name === 'ValidationError') {
    statusCode = 400
    errorType = 'ValidationError'
    message = err.message
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401
    errorType = 'UnauthorizedError'
    message = 'Unauthorized access'
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403
    errorType = 'ForbiddenError'
    message = 'Forbidden access'
  } else if (err.name === 'NotFoundError') {
    statusCode = 404
    errorType = 'NotFoundError'
    message = 'Resource not found'
  } else if (err.name === 'ConflictError') {
    statusCode = 409
    errorType = 'ConflictError'
    message = err.message
  } else if (err.statusCode) {
    statusCode = err.statusCode
    message = err.message
  }

  // Log error with appropriate level
  const logLevel = statusCode >= 500 ? 'error' : 'warn'
  logger[logLevel]('Request error', {
    error: err.message,
    stack: err.stack,
    statusCode,
    errorType,
    correlationId,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  })

  // Send error response
  const errorResponse = {
    success: false,
    error: errorType,
    message,
    correlationId,
    timestamp: new Date().toISOString()
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack
  }

  res.status(statusCode).json(errorResponse)
})

// Use enhanced error handlers
app.use('*', notFoundHandler)
app.use(errorHandler)

// Enhanced graceful shutdown handling
let server: any
let isShuttingDown = false

const gracefulShutdownHandler = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn(`Received ${signal} during shutdown, forcing exit...`)
    process.exit(1)
  }

  isShuttingDown = true
  logger.info(`🛑 Received ${signal}, shutting down gracefully...`)

  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit...')
    process.exit(1)
  }, 30000) // 30 second timeout

  try {
    // Stop accepting new connections
    if (server) {
      logger.info('Closing HTTP server...')
      await new Promise<void>((resolve, reject) => {
        server.close((err: any) => {
          if (err) {
            logger.error('Error closing HTTP server:', err)
            reject(err)
          } else {
            logger.info('HTTP server closed')
            resolve()
          }
        })
      })
    }

    // Close database connections
    logger.info('Closing database connections...')
    await gracefulShutdown()

    // Clear the timeout
    clearTimeout(shutdownTimeout)

    logger.info('✅ Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    logger.error('Error during graceful shutdown:', error)
    clearTimeout(shutdownTimeout)
    process.exit(1)
  }
}

process.on('SIGINT', () => gracefulShutdownHandler('SIGINT'))
process.on('SIGTERM', () => gracefulShutdownHandler('SIGTERM'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  gracefulShutdownHandler('UNCAUGHT_EXCEPTION')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdownHandler('UNHANDLED_REJECTION')
})

// Start server
async function startServer() {
  try {
    await initializeDatabase()

    server = app.listen(PORT, () => {
      logger.info(`🚀 AI ToDo MCP Backend running on port ${PORT}`)
      logger.info(`📊 Health check: http://localhost:${PORT}/health`)
      logger.info(`🔗 API base: http://localhost:${PORT}/api`)
      logger.info(`📋 Lists: http://localhost:${PORT}/api/lists`)
      logger.info(`📝 Items: http://localhost:${PORT}/api/items`)
      logger.info(`🤖 Agents: http://localhost:${PORT}/api/agents`)
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`📝 Log level: ${logger.level}`)
    })

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`)
          process.exit(1)
          break
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`)
          process.exit(1)
          break
        default:
          throw error
      }
    })

  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
