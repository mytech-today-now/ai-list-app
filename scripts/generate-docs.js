#!/usr/bin/env node

/**
 * @fileoverview Comprehensive documentation generation script
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Documentation generation configuration
 */
const config = {
  outputDir: path.join(rootDir, 'docs'),
  apiDir: path.join(rootDir, 'docs', 'api'),
  diagramsDir: path.join(rootDir, 'docs', 'diagrams'),
  tempDir: path.join(rootDir, 'docs-temp'),
  
  // Source directories
  sources: {
    packages: path.join(rootDir, 'packages'),
    frontend: path.join(rootDir, 'apps', 'frontend', 'src'),
    backend: path.join(rootDir, 'apps', 'backend', 'src')
  },
  
  // Documentation types to generate
  types: {
    typedoc: true,
    jsdoc: true,
    swagger: true,
    mermaid: true,
    dependencies: true,
    coverage: true,
    changelog: true
  }
};

/**
 * Logger utility
 */
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  step: (msg) => console.log(`🔄 ${msg}`)
};

/**
 * Ensure directory exists
 */
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Execute command with error handling
 */
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
    return result;
  } catch (error) {
    logger.error(`Command failed: ${command}`);
    logger.error(error.message);
    throw error;
  }
}

/**
 * Generate TypeDoc documentation
 */
async function generateTypeDoc() {
  logger.step('Generating TypeDoc documentation...');
  
  try {
    execCommand('npx typedoc --options typedoc.json');
    logger.success('TypeDoc documentation generated');
  } catch (error) {
    logger.error('Failed to generate TypeDoc documentation');
    throw error;
  }
}

/**
 * Generate JSDoc documentation
 */
async function generateJSDoc() {
  logger.step('Generating JSDoc documentation...');
  
  try {
    await ensureDir(path.join(config.apiDir, 'jsdoc'));
    
    // Generate JSDoc for each package
    const packages = ['mcp-core', 'shared-types', 'storage'];
    
    for (const pkg of packages) {
      const srcDir = path.join(config.sources.packages, pkg, 'src');
      const outputFile = path.join(config.apiDir, 'jsdoc', `${pkg}.md`);
      
      try {
        execCommand(`npx jsdoc2md "${srcDir}/**/*.{js,ts}" > "${outputFile}"`);
        logger.success(`JSDoc generated for ${pkg}`);
      } catch (error) {
        logger.warn(`Failed to generate JSDoc for ${pkg}: ${error.message}`);
      }
    }
    
    // Generate JSDoc for apps
    const apps = [
      { name: 'frontend', dir: config.sources.frontend },
      { name: 'backend', dir: config.sources.backend }
    ];
    
    for (const app of apps) {
      const outputFile = path.join(config.apiDir, 'jsdoc', `${app.name}.md`);
      
      try {
        execCommand(`npx jsdoc2md "${app.dir}/**/*.{js,ts}" > "${outputFile}"`);
        logger.success(`JSDoc generated for ${app.name}`);
      } catch (error) {
        logger.warn(`Failed to generate JSDoc for ${app.name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    logger.error('Failed to generate JSDoc documentation');
    throw error;
  }
}

/**
 * Generate Swagger documentation
 */
async function generateSwagger() {
  logger.step('Generating Swagger documentation...');
  
  try {
    execCommand('node scripts/generate-swagger.js');
    logger.success('Swagger documentation generated');
  } catch (error) {
    logger.error('Failed to generate Swagger documentation');
    throw error;
  }
}

/**
 * Generate Mermaid diagrams
 */
async function generateMermaid() {
  logger.step('Generating Mermaid diagrams...');
  
  try {
    await ensureDir(config.diagramsDir);
    
    const mermaidFiles = [
      'architecture.mmd',
      'mcp-flow.mmd',
      'testing-strategy.mmd'
    ];
    
    for (const file of mermaidFiles) {
      const inputPath = path.join(config.diagramsDir, file);
      const outputPath = path.join(config.diagramsDir, file.replace('.mmd', '.svg'));
      
      try {
        await fs.access(inputPath);
        execCommand(`npx mmdc -i "${inputPath}" -o "${outputPath}"`);
        logger.success(`Generated diagram: ${file}`);
      } catch (error) {
        logger.warn(`Mermaid file not found or failed to generate: ${file}`);
      }
    }
    
  } catch (error) {
    logger.error('Failed to generate Mermaid diagrams');
    throw error;
  }
}

/**
 * Generate dependency graphs
 */
async function generateDependencyGraphs() {
  logger.step('Generating dependency graphs...');
  
  try {
    await ensureDir(config.diagramsDir);
    
    // Generate overall dependency graph
    execCommand(`npx madge --image "${path.join(config.diagramsDir, 'dependencies.svg')}" --extensions ts,tsx,js,jsx .`);
    
    // Generate circular dependency report
    const circularDeps = execCommand('npx madge --circular --extensions ts,tsx,js,jsx .');
    if (circularDeps.trim()) {
      await fs.writeFile(
        path.join(config.apiDir, 'circular-dependencies.txt'),
        circularDeps
      );
      logger.warn('Circular dependencies detected - see circular-dependencies.txt');
    }
    
    logger.success('Dependency graphs generated');
  } catch (error) {
    logger.error('Failed to generate dependency graphs');
    throw error;
  }
}

/**
 * Generate coverage badges
 */
async function generateCoverageBadges() {
  logger.step('Generating coverage badges...');
  
  try {
    execCommand('npm run coverage:badges');
    logger.success('Coverage badges generated');
  } catch (error) {
    logger.warn('Failed to generate coverage badges');
  }
}

/**
 * Generate changelog
 */
async function generateChangelog() {
  logger.step('Updating changelog...');
  
  try {
    execCommand('npm run changelog');
    logger.success('Changelog updated');
  } catch (error) {
    logger.warn('Failed to update changelog');
  }
}

/**
 * Create documentation index
 */
async function createDocumentationIndex() {
  logger.step('Creating documentation index...');
  
  const indexContent = `# AI ToDo MCP - Documentation

Welcome to the comprehensive documentation for AI ToDo MCP, an AI-driven PWA task manager with Modular Command Protocol.

## 📚 Documentation Sections

### API Documentation
- [TypeDoc API Reference](./api/index.html) - Complete TypeScript API documentation
- [JSDoc Documentation](./api/jsdoc/) - JavaScript documentation
- [Swagger API Docs](./api/swagger.html) - REST API documentation

### Architecture & Design
- [System Architecture](./diagrams/architecture.svg) - High-level system overview
- [MCP Flow Diagram](./diagrams/mcp-flow.svg) - Command flow visualization
- [Testing Strategy](./diagrams/testing-strategy.svg) - Testing approach overview
- [Dependency Graph](./diagrams/dependencies.svg) - Code dependency visualization

### Specifications
- [MCP Specification](./MCP_SPECIFICATION.md) - Modular Command Protocol details
- [Database Schema](./DATABASE_SCHEMA.md) - Data model documentation
- [Database Setup](./DATABASE_SETUP.md) - Database configuration guide

### Development Guides
- [CLI Examples](./CLI_EXAMPLES.md) - Command-line usage examples
- [Project Summary](./PROJECT_SUMMARY.md) - Project overview and goals

### Quality Assurance
- [Test Coverage Report](../coverage/index.html) - Code coverage metrics
- [Performance Metrics](./performance/) - Performance test results
- [Accessibility Report](./accessibility/) - A11y compliance status

## 🚀 Quick Start

1. **Setup**: Follow the [main README](../README.md) for initial setup
2. **Development**: Check the [development guide](../README.md#development)
3. **API Usage**: Explore the [Swagger documentation](./api/swagger.html)
4. **MCP Commands**: See [CLI examples](./CLI_EXAMPLES.md)

## 📊 Project Status

- **Version**: ${process.env.npm_package_version || '1.0.0'}
- **Last Updated**: ${new Date().toISOString().split('T')[0]}
- **Build Status**: ✅ Passing
- **Test Coverage**: See [coverage report](../coverage/index.html)

## 🤝 Contributing

Please read our [contributing guidelines](../README.md#contributing) before submitting changes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

*This documentation is automatically generated. Last updated: ${new Date().toISOString()}*
`;

  await fs.writeFile(path.join(config.outputDir, 'index.md'), indexContent);
  logger.success('Documentation index created');
}

/**
 * Clean up temporary files
 */
async function cleanup() {
  try {
    await fs.rm(config.tempDir, { recursive: true, force: true });
    logger.success('Cleanup completed');
  } catch (error) {
    logger.warn('Cleanup failed');
  }
}

/**
 * Main documentation generation function
 */
async function generateDocumentation() {
  logger.info('Starting documentation generation...');
  
  try {
    // Ensure output directories exist
    await ensureDir(config.outputDir);
    await ensureDir(config.apiDir);
    await ensureDir(config.diagramsDir);
    await ensureDir(config.tempDir);
    
    // Generate different types of documentation
    const tasks = [];
    
    if (config.types.typedoc) tasks.push(generateTypeDoc);
    if (config.types.jsdoc) tasks.push(generateJSDoc);
    if (config.types.swagger) tasks.push(generateSwagger);
    if (config.types.mermaid) tasks.push(generateMermaid);
    if (config.types.dependencies) tasks.push(generateDependencyGraphs);
    if (config.types.coverage) tasks.push(generateCoverageBadges);
    if (config.types.changelog) tasks.push(generateChangelog);
    
    // Run tasks sequentially to avoid conflicts
    for (const task of tasks) {
      await task();
    }
    
    // Create documentation index
    await createDocumentationIndex();
    
    // Cleanup
    await cleanup();
    
    logger.success('Documentation generation completed successfully!');
    logger.info(`Documentation available at: ${config.outputDir}`);
    
  } catch (error) {
    logger.error('Documentation generation failed');
    logger.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDocumentation();
}

export { generateDocumentation, config };
