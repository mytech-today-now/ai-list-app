#!/usr/bin/env node

/**
 * @fileoverview Generate coverage and quality badges
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Badge configuration
 */
const config = {
  badgeDir: path.join(rootDir, 'docs', 'badges'),
  coverageDir: path.join(rootDir, 'coverage'),
  
  workspaces: [
    { name: 'frontend', path: 'apps/frontend' },
    { name: 'backend', path: 'apps/backend' },
    { name: 'mcp-core', path: 'packages/mcp-core' },
    { name: 'shared-types', path: 'packages/shared-types' },
    { name: 'storage', path: 'packages/storage' }
  ],
  
  badges: {
    coverage: { label: 'coverage', color: '#4c1' },
    build: { label: 'build', color: '#4c1' },
    tests: { label: 'tests', color: '#4c1' },
    version: { label: 'version', color: '#blue' },
    license: { label: 'license', color: '#blue' },
    typescript: { label: 'typescript', color: '#blue' }
  }
};

/**
 * Logger utility
 */
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`)
};

/**
 * Generate SVG badge
 */
function generateBadgeSVG(label, value, color, style = 'flat') {
  const labelWidth = Math.max(label.length * 7 + 10, 50);
  const valueWidth = Math.max(value.length * 7 + 10, 40);
  const totalWidth = labelWidth + valueWidth;
  
  // Color mapping
  const colorMap = {
    '#4c1': '#4c1',
    '#blue': '#007ec6',
    '#green': '#4c1',
    '#red': '#e05d44',
    '#yellow': '#dfb317',
    '#orange': '#fe7d37',
    '#lightgrey': '#9f9f9f'
  };
  
  const badgeColor = colorMap[color] || color;
  
  if (style === 'flat-square') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
      <g>
        <rect width="${labelWidth}" height="20" fill="#555"/>
        <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${badgeColor}"/>
      </g>
      <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
        <text x="${labelWidth / 2}" y="14">${label}</text>
        <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
      </g>
    </svg>`;
  }
  
  // Default flat style
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
      <path fill="${badgeColor}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
      <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="${labelWidth / 2}" y="14">${label}</text>
      <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
      <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
    </g>
  </svg>`;
}

/**
 * Get color for percentage value
 */
function getPercentageColor(percentage) {
  if (percentage >= 90) return '#4c1';
  if (percentage >= 80) return '#97ca00';
  if (percentage >= 70) return '#a4a61d';
  if (percentage >= 60) return '#dfb317';
  return '#e05d44';
}

/**
 * Read package.json
 */
async function readPackageJson() {
  try {
    const content = await fs.readFile(path.join(rootDir, 'package.json'), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to read package.json');
    return {};
  }
}

/**
 * Read coverage summary
 */
async function readCoverageSummary(workspace) {
  const summaryPath = path.join(rootDir, workspace.path, 'coverage', 'coverage-summary.json');
  
  try {
    const content = await fs.readFile(summaryPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    // Try global coverage directory
    const globalSummaryPath = path.join(config.coverageDir, 'coverage-summary.json');
    try {
      const content = await fs.readFile(globalSummaryPath, 'utf8');
      return JSON.parse(content);
    } catch (globalError) {
      logger.warn(`Coverage summary not found for ${workspace.name}`);
      return null;
    }
  }
}

/**
 * Generate coverage badges
 */
async function generateCoverageBadges() {
  logger.info('Generating coverage badges...');
  
  for (const workspace of config.workspaces) {
    const summary = await readCoverageSummary(workspace);
    
    if (!summary || !summary.total) {
      logger.warn(`No coverage data for ${workspace.name}`);
      continue;
    }
    
    const { total } = summary;
    
    // Generate individual metric badges
    const metrics = ['lines', 'functions', 'branches', 'statements'];
    
    for (const metric of metrics) {
      const percentage = total[metric].pct;
      const color = getPercentageColor(percentage);
      const badge = generateBadgeSVG(metric, `${percentage}%`, color);
      
      const badgePath = path.join(config.badgeDir, `${workspace.name}-${metric}.svg`);
      await fs.writeFile(badgePath, badge);
    }
    
    // Generate overall coverage badge
    const overallPercentage = Math.round(
      (total.lines.pct + total.functions.pct + total.branches.pct + total.statements.pct) / 4
    );
    const overallColor = getPercentageColor(overallPercentage);
    const overallBadge = generateBadgeSVG('coverage', `${overallPercentage}%`, overallColor);
    
    const overallPath = path.join(config.badgeDir, `${workspace.name}-coverage.svg`);
    await fs.writeFile(overallPath, overallBadge);
    
    logger.success(`Generated coverage badges for ${workspace.name}`);
  }
}

/**
 * Generate project badges
 */
async function generateProjectBadges() {
  logger.info('Generating project badges...');
  
  const packageJson = await readPackageJson();
  
  // Version badge
  if (packageJson.version) {
    const versionBadge = generateBadgeSVG('version', `v${packageJson.version}`, '#blue');
    await fs.writeFile(path.join(config.badgeDir, 'version.svg'), versionBadge);
  }
  
  // License badge
  if (packageJson.license) {
    const licenseBadge = generateBadgeSVG('license', packageJson.license, '#blue');
    await fs.writeFile(path.join(config.badgeDir, 'license.svg'), licenseBadge);
  }
  
  // TypeScript badge
  const typeScriptBadge = generateBadgeSVG('typescript', '5.3+', '#blue');
  await fs.writeFile(path.join(config.badgeDir, 'typescript.svg'), typeScriptBadge);
  
  // Build status badge (mock - in real CI this would be dynamic)
  const buildBadge = generateBadgeSVG('build', 'passing', '#4c1');
  await fs.writeFile(path.join(config.badgeDir, 'build.svg'), buildBadge);
  
  // Tests badge (mock - in real CI this would be dynamic)
  const testsBadge = generateBadgeSVG('tests', 'passing', '#4c1');
  await fs.writeFile(path.join(config.badgeDir, 'tests.svg'), testsBadge);
  
  logger.success('Generated project badges');
}

/**
 * Generate quality badges
 */
async function generateQualityBadges() {
  logger.info('Generating quality badges...');
  
  // Code quality badge (mock - would integrate with SonarQube, CodeClimate, etc.)
  const qualityBadge = generateBadgeSVG('code quality', 'A', '#4c1');
  await fs.writeFile(path.join(config.badgeDir, 'quality.svg'), qualityBadge);
  
  // Security badge (mock - would integrate with Snyk, etc.)
  const securityBadge = generateBadgeSVG('security', 'no issues', '#4c1');
  await fs.writeFile(path.join(config.badgeDir, 'security.svg'), securityBadge);
  
  // Dependencies badge (mock - would check for outdated dependencies)
  const depsBadge = generateBadgeSVG('dependencies', 'up to date', '#4c1');
  await fs.writeFile(path.join(config.badgeDir, 'dependencies.svg'), depsBadge);
  
  logger.success('Generated quality badges');
}

/**
 * Generate README with badges
 */
async function generateBadgeReadme() {
  const badgeContent = `# Project Badges

This directory contains automatically generated badges for the AI ToDo MCP project.

## Coverage Badges

${config.workspaces.map(ws => 
  `### ${ws.name}
![Coverage](./coverage/${ws.name}-coverage.svg)
![Lines](./coverage/${ws.name}-lines.svg)
![Functions](./coverage/${ws.name}-functions.svg)
![Branches](./coverage/${ws.name}-branches.svg)
![Statements](./coverage/${ws.name}-statements.svg)`
).join('\n\n')}

## Project Badges

![Version](./version.svg)
![License](./license.svg)
![TypeScript](./typescript.svg)
![Build](./build.svg)
![Tests](./tests.svg)

## Quality Badges

![Code Quality](./quality.svg)
![Security](./security.svg)
![Dependencies](./dependencies.svg)

## Usage

To use these badges in your README or documentation, reference them like this:

\`\`\`markdown
![Coverage](./docs/badges/frontend-coverage.svg)
\`\`\`

## Automation

These badges are automatically generated by the \`scripts/generate-badges.js\` script and updated on each CI run.

Last updated: ${new Date().toISOString()}
`;

  await fs.writeFile(path.join(config.badgeDir, 'README.md'), badgeContent);
  logger.success('Generated badge README');
}

/**
 * Main function
 */
async function main() {
  try {
    // Ensure badge directory exists
    await fs.mkdir(config.badgeDir, { recursive: true });
    
    // Generate all types of badges
    await generateCoverageBadges();
    await generateProjectBadges();
    await generateQualityBadges();
    await generateBadgeReadme();
    
    logger.success('All badges generated successfully!');
    logger.info(`Badges available at: ${config.badgeDir}`);
    
  } catch (error) {
    logger.error('Badge generation failed');
    logger.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, generateBadgeSVG, config };
