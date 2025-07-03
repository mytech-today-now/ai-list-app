import { BaseService, QueryOptions, FilterCondition, SortCondition } from './services/base'
import { getTransactionManager, TransactionOptions } from './transaction-manager'
import { QueryBuilderFactory } from './query-builder'

/**
 * SemanticType: MCPRepositoryExtensions
 * Description: MCP protocol integration for repositories enabling AI agents to perform database operations
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add natural language query processing
 *   - Implement AI-driven data insights
 *   - Add automated data validation
 *   - Integrate with AI workflow orchestration
 */

/**
 * MCP Tool definition for repository operations
 */
export interface MCPTool {
  name: string
  description: string
  inputSchema: any
  handler: (params: any) => Promise<any>
}

/**
 * MCP Resource definition for data exposure
 */
export interface MCPResource {
  uri: string
  name: string
  description: string
  mimeType: string
  handler: () => Promise<any>
}

/**
 * MCP Query parameters for standardized operations
 */
export interface MCPQueryParams {
  filters?: Record<string, any>
  sorts?: Array<{ field: string; direction: 'asc' | 'desc' }>
  limit?: number
  offset?: number
  include?: string[]
  format?: 'json' | 'csv' | 'xml'
}

/**
 * MCP Operation result with metadata
 */
export interface MCPOperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata: {
    operation: string
    timestamp: string
    executionTime: number
    recordCount?: number
    agent?: string
  }
}

/**
 * Base MCP-aware repository mixin
 */
export class MCPRepositoryMixin {
  private tools: Map<string, MCPTool> = new Map()
  private resources: Map<string, MCPResource> = new Map()

  /**
   * Register MCP tool for AI agent access
   */
  protected registerMCPTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Register MCP resource for AI agent access
   */
  protected registerMCPResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource)
  }

  /**
   * Get all available MCP tools
   */
  getMCPTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get all available MCP resources
   */
  getMCPResources(): MCPResource[] {
    return Array.from(this.resources.values())
  }

  /**
   * Execute MCP tool by name
   */
  async executeMCPTool(toolName: string, params: any): Promise<MCPOperationResult> {
    const startTime = Date.now()
    
    try {
      const tool = this.tools.get(toolName)
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`,
          metadata: {
            operation: toolName,
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - startTime
          }
        }
      }

      const result = await tool.handler(params)
      
      return {
        success: true,
        data: result,
        metadata: {
          operation: toolName,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          recordCount: Array.isArray(result) ? result.length : 1
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operation: toolName,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        }
      }
    }
  }

  /**
   * Get MCP resource by URI
   */
  async getMCPResource(uri: string): Promise<MCPOperationResult> {
    const startTime = Date.now()
    
    try {
      const resource = this.resources.get(uri)
      if (!resource) {
        return {
          success: false,
          error: `Resource '${uri}' not found`,
          metadata: {
            operation: `get_resource:${uri}`,
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - startTime
          }
        }
      }

      const result = await resource.handler()
      
      return {
        success: true,
        data: result,
        metadata: {
          operation: `get_resource:${uri}`,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          recordCount: Array.isArray(result) ? result.length : 1
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operation: `get_resource:${uri}`,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        }
      }
    }
  }

  /**
   * Convert MCP query parameters to internal format
   */
  protected convertMCPQuery(params: MCPQueryParams): QueryOptions {
    const queryOptions: QueryOptions = {}

    // Convert filters
    if (params.filters) {
      queryOptions.filters = Object.entries(params.filters).map(([field, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle complex filter objects
          const filterObj = value as any
          return {
            field,
            operator: filterObj.operator || 'eq',
            value: filterObj.value,
            values: filterObj.values
          } as FilterCondition
        } else {
          // Simple equality filter
          return {
            field,
            operator: 'eq' as const,
            value
          } as FilterCondition
        }
      })
    }

    // Convert sorts
    if (params.sorts) {
      queryOptions.sorts = params.sorts.map(sort => ({
        field: sort.field,
        direction: sort.direction
      } as SortCondition))
    }

    // Set pagination
    if (params.limit) queryOptions.limit = params.limit
    if (params.offset) queryOptions.offset = params.offset

    return queryOptions
  }

  /**
   * Format result based on requested format
   */
  protected formatResult(data: any, format: string = 'json'): any {
    switch (format) {
      case 'csv':
        return this.convertToCSV(data)
      case 'xml':
        return this.convertToXML(data)
      case 'json':
      default:
        return data
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return ''
    }

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        }).join(',')
      )
    ]

    return csvRows.join('\n')
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any): string {
    const convertObject = (obj: any, indent = 0): string => {
      const spaces = '  '.repeat(indent)
      
      if (Array.isArray(obj)) {
        return obj.map(item => 
          `${spaces}<item>\n${convertObject(item, indent + 1)}\n${spaces}</item>`
        ).join('\n')
      }
      
      if (typeof obj === 'object' && obj !== null) {
        return Object.entries(obj).map(([key, value]) => {
          if (typeof value === 'object') {
            return `${spaces}<${key}>\n${convertObject(value, indent + 1)}\n${spaces}</${key}>`
          } else {
            return `${spaces}<${key}>${value}</${key}>`
          }
        }).join('\n')
      }
      
      return `${spaces}${obj}`
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${convertObject(data, 1)}\n</root>`
  }
}

/**
 * Enhanced base repository with MCP integration
 */
export abstract class MCPAwareRepository<TTable, TSelect, TInsert> 
  extends BaseService<TTable, TSelect, TInsert> {
  
  private mcpMixin = new MCPRepositoryMixin()

  constructor() {
    super()
    this.initializeMCPTools()
    this.initializeMCPResources()
  }

  /**
   * Initialize standard MCP tools for this repository
   */
  protected initializeMCPTools(): void {
    // Standard CRUD tools
    this.mcpMixin.registerMCPTool({
      name: `${this.getEntityName()}.find`,
      description: `Find ${this.getEntityName()} records with filtering and sorting`,
      inputSchema: {
        type: 'object',
        properties: {
          filters: { type: 'object' },
          sorts: { type: 'array' },
          limit: { type: 'number' },
          offset: { type: 'number' },
          format: { type: 'string', enum: ['json', 'csv', 'xml'] }
        }
      },
      handler: async (params: MCPQueryParams) => {
        const queryOptions = this.mcpMixin['convertMCPQuery'](params)
        const results = await this.findAll(queryOptions)
        return this.mcpMixin['formatResult'](results, params.format)
      }
    })

    this.mcpMixin.registerMCPTool({
      name: `${this.getEntityName()}.findById`,
      description: `Find a ${this.getEntityName()} record by ID`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          format: { type: 'string', enum: ['json', 'csv', 'xml'] }
        },
        required: ['id']
      },
      handler: async (params: { id: string; format?: string }) => {
        const result = await this.findById(params.id)
        return this.mcpMixin['formatResult'](result, params.format)
      }
    })

    this.mcpMixin.registerMCPTool({
      name: `${this.getEntityName()}.create`,
      description: `Create a new ${this.getEntityName()} record`,
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object' }
        },
        required: ['data']
      },
      handler: async (params: { data: TInsert }) => {
        return await this.create(params.data)
      }
    })

    this.mcpMixin.registerMCPTool({
      name: `${this.getEntityName()}.update`,
      description: `Update a ${this.getEntityName()} record`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          data: { type: 'object' }
        },
        required: ['id', 'data']
      },
      handler: async (params: { id: string; data: Partial<TInsert> }) => {
        return await this.updateById(params.id, params.data)
      }
    })

    this.mcpMixin.registerMCPTool({
      name: `${this.getEntityName()}.delete`,
      description: `Delete a ${this.getEntityName()} record`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      handler: async (params: { id: string }) => {
        return await this.deleteById(params.id)
      }
    })

    this.mcpMixin.registerMCPTool({
      name: `${this.getEntityName()}.count`,
      description: `Count ${this.getEntityName()} records with filtering`,
      inputSchema: {
        type: 'object',
        properties: {
          filters: { type: 'object' }
        }
      },
      handler: async (params: MCPQueryParams) => {
        const queryOptions = this.mcpMixin['convertMCPQuery'](params)
        const whereCondition = queryOptions.filters ? 
          this.buildFilterConditions(queryOptions.filters) : undefined
        return await this.count(whereCondition)
      }
    })
  }

  /**
   * Initialize standard MCP resources for this repository
   */
  protected initializeMCPResources(): void {
    this.mcpMixin.registerMCPResource({
      uri: `${this.getEntityName()}://schema`,
      name: `${this.getEntityName()} Schema`,
      description: `Database schema for ${this.getEntityName()} entity`,
      mimeType: 'application/json',
      handler: async () => {
        return this.getEntitySchema()
      }
    })

    this.mcpMixin.registerMCPResource({
      uri: `${this.getEntityName()}://stats`,
      name: `${this.getEntityName()} Statistics`,
      description: `Statistical information about ${this.getEntityName()} records`,
      mimeType: 'application/json',
      handler: async () => {
        return await this.getEntityStatistics()
      }
    })
  }

  /**
   * Get entity name for MCP tool/resource naming
   */
  protected abstract getEntityName(): string

  /**
   * Get entity schema information
   */
  protected abstract getEntitySchema(): any

  /**
   * Get entity statistics
   */
  protected abstract getEntityStatistics(): Promise<any>

  /**
   * Execute MCP tool
   */
  async executeMCPTool(toolName: string, params: any): Promise<MCPOperationResult> {
    return this.mcpMixin.executeMCPTool(toolName, params)
  }

  /**
   * Get MCP resource
   */
  async getMCPResource(uri: string): Promise<MCPOperationResult> {
    return this.mcpMixin.getMCPResource(uri)
  }

  /**
   * Get available MCP tools
   */
  getMCPTools(): MCPTool[] {
    return this.mcpMixin.getMCPTools()
  }

  /**
   * Get available MCP resources
   */
  getMCPResources(): MCPResource[] {
    return this.mcpMixin.getMCPResources()
  }

  /**
   * Register custom MCP tool
   */
  protected registerCustomMCPTool(tool: MCPTool): void {
    this.mcpMixin.registerMCPTool(tool)
  }

  /**
   * Register custom MCP resource
   */
  protected registerCustomMCPResource(resource: MCPResource): void {
    this.mcpMixin.registerMCPResource(resource)
  }
}

/**
 * MCP Server for repository operations
 */
export class MCPRepositoryServer {
  private repositories: Map<string, MCPAwareRepository<any, any, any>> = new Map()

  /**
   * Register repository with MCP server
   */
  registerRepository(name: string, repository: MCPAwareRepository<any, any, any>): void {
    this.repositories.set(name, repository)
  }

  /**
   * Get all available tools across repositories
   */
  getAllTools(): Array<MCPTool & { repository: string }> {
    const tools: Array<MCPTool & { repository: string }> = []
    
    for (const [repoName, repo] of this.repositories) {
      const repoTools = repo.getMCPTools().map(tool => ({
        ...tool,
        repository: repoName
      }))
      tools.push(...repoTools)
    }
    
    return tools
  }

  /**
   * Get all available resources across repositories
   */
  getAllResources(): Array<MCPResource & { repository: string }> {
    const resources: Array<MCPResource & { repository: string }> = []
    
    for (const [repoName, repo] of this.repositories) {
      const repoResources = repo.getMCPResources().map(resource => ({
        ...resource,
        repository: repoName
      }))
      resources.push(...repoResources)
    }
    
    return resources
  }

  /**
   * Execute tool across repositories
   */
  async executeTool(repositoryName: string, toolName: string, params: any): Promise<MCPOperationResult> {
    const repository = this.repositories.get(repositoryName)
    if (!repository) {
      return {
        success: false,
        error: `Repository '${repositoryName}' not found`,
        metadata: {
          operation: `${repositoryName}.${toolName}`,
          timestamp: new Date().toISOString(),
          executionTime: 0
        }
      }
    }

    return repository.executeMCPTool(toolName, params)
  }

  /**
   * Get resource across repositories
   */
  async getResource(repositoryName: string, uri: string): Promise<MCPOperationResult> {
    const repository = this.repositories.get(repositoryName)
    if (!repository) {
      return {
        success: false,
        error: `Repository '${repositoryName}' not found`,
        metadata: {
          operation: `${repositoryName}.get_resource:${uri}`,
          timestamp: new Date().toISOString(),
          executionTime: 0
        }
      }
    }

    return repository.getMCPResource(uri)
  }
}

/**
 * Global MCP repository server instance
 */
export const mcpRepositoryServer = new MCPRepositoryServer()
