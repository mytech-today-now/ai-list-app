#!/usr/bin/env node

/**
 * @fileoverview Generates Swagger/OpenAPI documentation from JSDoc comments
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Swagger configuration options
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI ToDo MCP API',
      version: '1.0.0',
      description: 'AI-Driven PWA Task Manager with Modular Command Protocol',
      contact: {
        name: 'AI ToDo MCP Team',
        url: 'https://github.com/your-username/ai-todo-mcp',
        email: 'your-email@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.ai-todo-mcp.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          },
          required: ['error']
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique task identifier'
            },
            title: {
              type: 'string',
              description: 'Task title'
            },
            description: {
              type: 'string',
              description: 'Task description'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: 'Task status'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Task priority'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Task creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Task last update timestamp'
            }
          },
          required: ['id', 'title', 'status']
        },
        TaskList: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique list identifier'
            },
            name: {
              type: 'string',
              description: 'List name'
            },
            description: {
              type: 'string',
              description: 'List description'
            },
            tasks: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Task'
              },
              description: 'Tasks in the list'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'List creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'List last update timestamp'
            }
          },
          required: ['id', 'name']
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Tasks',
        description: 'Task management operations'
      },
      {
        name: 'Lists',
        description: 'Task list management operations'
      },
      {
        name: 'MCP',
        description: 'Modular Command Protocol operations'
      },
      {
        name: 'Auth',
        description: 'Authentication and authorization'
      },
      {
        name: 'Health',
        description: 'Health check and monitoring'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../apps/backend/src/routes/*.ts'),
    path.join(__dirname, '../apps/backend/src/controllers/*.ts'),
    path.join(__dirname, '../apps/backend/src/middleware/*.ts'),
    path.join(__dirname, '../packages/mcp-core/src/**/*.ts'),
    path.join(__dirname, '../packages/shared-types/src/**/*.ts')
  ]
};

/**
 * Generates Swagger specification and saves it to file
 */
async function generateSwaggerDocs() {
  try {
    console.log('🔄 Generating Swagger documentation...');
    
    // Generate the specification
    const specs = swaggerJSDoc(swaggerOptions);
    
    // Ensure output directory exists
    const outputDir = path.join(__dirname, '../docs/api');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write JSON specification
    const jsonPath = path.join(outputDir, 'swagger.json');
    await fs.writeFile(jsonPath, JSON.stringify(specs, null, 2));
    console.log(`✅ Swagger JSON saved to: ${jsonPath}`);
    
    // Write YAML specification
    const yaml = await import('js-yaml');
    const yamlPath = path.join(outputDir, 'swagger.yaml');
    await fs.writeFile(yamlPath, yaml.dump(specs));
    console.log(`✅ Swagger YAML saved to: ${yamlPath}`);
    
    // Generate HTML documentation
    const htmlContent = generateSwaggerHTML(specs);
    const htmlPath = path.join(outputDir, 'swagger.html');
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`✅ Swagger HTML saved to: ${htmlPath}`);
    
    console.log('🎉 Swagger documentation generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating Swagger documentation:', error);
    process.exit(1);
  }
}

/**
 * Generates HTML page for Swagger UI
 * @param {Object} specs - Swagger specification object
 * @returns {string} HTML content
 */
function generateSwaggerHTML(specs) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI ToDo MCP API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${JSON.stringify(specs, null, 2)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        onComplete: function() {
          console.log('Swagger UI loaded successfully');
        },
        onFailure: function(data) {
          console.error('Failed to load Swagger UI:', data);
        }
      });
    };
  </script>
</body>
</html>`;
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSwaggerDocs();
}

export { generateSwaggerDocs, swaggerOptions };
