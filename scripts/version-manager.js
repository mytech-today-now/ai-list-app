#!/usr/bin/env node

/**
 * @fileoverview Version management and release automation script
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
 * Version management configuration
 */
const versionConfig = {
  // Package files to update
  packageFiles: [
    'package.json',
    'apps/frontend/package.json',
    'apps/backend/package.json',
    'packages/mcp-core/package.json',
    'packages/shared-types/package.json',
    'packages/storage/package.json'
  ],
  
  // Version files to update
  versionFiles: [
    '.env.example',
    'README.md',
    'docs/PROJECT_SUMMARY.md'
  ],
  
  // Git configuration
  git: {
    tagPrefix: 'v',
    commitMessage: 'chore(release): {version}',
    tagMessage: 'Release {version}',
    pushTags: true,
    pushBranch: true
  },
  
  // Changelog configuration
  changelog: {
    file: 'CHANGELOG.md',
    sections: [
      { type: 'feat', section: '✨ Features' },
      { type: 'fix', section: '🐛 Bug Fixes' },
      { type: 'docs', section: '📚 Documentation' },
      { type: 'style', section: '💄 Styles' },
      { type: 'refactor', section: '♻️ Code Refactoring' },
      { type: 'perf', section: '⚡ Performance Improvements' },
      { type: 'test', section: '🧪 Tests' },
      { type: 'build', section: '🏗️ Build System' },
      { type: 'ci', section: '👷 CI/CD' },
      { type: 'chore', section: '🔧 Maintenance' },
      { type: 'security', section: '🔒 Security' }
    ]
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
 * Version manager class
 */
class VersionManager {
  constructor() {
    this.currentVersion = null;
    this.newVersion = null;
  }
  
  /**
   * Execute command with error handling
   */
  execCommand(command, options = {}) {
    try {
      const result = execSync(command, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
        ...options
      });
      return { success: true, output: result.trim() };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || ''
      };
    }
  }
  
  /**
   * Get current version from package.json
   */
  async getCurrentVersion() {
    try {
      const packagePath = path.join(rootDir, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      this.currentVersion = packageJson.version;
      return this.currentVersion;
    } catch (error) {
      throw new Error(`Failed to read current version: ${error.message}`);
    }
  }
  
  /**
   * Calculate next version based on type
   */
  calculateNextVersion(versionType) {
    if (!this.currentVersion) {
      throw new Error('Current version not loaded');
    }
    
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);
    
    switch (versionType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      case 'prerelease':
        return `${major}.${minor}.${patch + 1}-alpha.0`;
      default:
        throw new Error(`Invalid version type: ${versionType}`);
    }
  }
  
  /**
   * Update package.json files
   */
  async updatePackageFiles(newVersion) {
    logger.step('Updating package.json files...');
    
    for (const packageFile of versionConfig.packageFiles) {
      const packagePath = path.join(rootDir, packageFile);
      
      try {
        const content = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(content);
        
        packageJson.version = newVersion;
        
        // Update dependencies if they reference workspace packages
        if (packageJson.dependencies) {
          for (const [dep, version] of Object.entries(packageJson.dependencies)) {
            if (version === 'workspace:*' || dep.startsWith('@ai-todo/')) {
              packageJson.dependencies[dep] = newVersion;
            }
          }
        }
        
        if (packageJson.devDependencies) {
          for (const [dep, version] of Object.entries(packageJson.devDependencies)) {
            if (version === 'workspace:*' || dep.startsWith('@ai-todo/')) {
              packageJson.devDependencies[dep] = newVersion;
            }
          }
        }
        
        await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
        logger.success(`Updated ${packageFile}`);
        
      } catch (error) {
        logger.warn(`Failed to update ${packageFile}: ${error.message}`);
      }
    }
  }
  
  /**
   * Update version references in other files
   */
  async updateVersionFiles(newVersion) {
    logger.step('Updating version references...');
    
    for (const versionFile of versionConfig.versionFiles) {
      const filePath = path.join(rootDir, versionFile);
      
      try {
        let content = await fs.readFile(filePath, 'utf8');
        
        // Replace version patterns
        content = content.replace(
          /APP_VERSION=[\d.]+/g,
          `APP_VERSION=${newVersion}`
        );
        content = content.replace(
          /VITE_APP_VERSION=[\d.]+/g,
          `VITE_APP_VERSION=${newVersion}`
        );
        content = content.replace(
          /version:\s*[\d.]+/g,
          `version: ${newVersion}`
        );
        content = content.replace(
          /"version":\s*"[\d.]+"/g,
          `"version": "${newVersion}"`
        );
        
        await fs.writeFile(filePath, content);
        logger.success(`Updated ${versionFile}`);
        
      } catch (error) {
        logger.warn(`Failed to update ${versionFile}: ${error.message}`);
      }
    }
  }
  
  /**
   * Generate changelog entry
   */
  async generateChangelogEntry(newVersion) {
    logger.step('Generating changelog entry...');
    
    try {
      // Get commits since last tag
      const lastTagResult = this.execCommand('git describe --tags --abbrev=0');
      const lastTag = lastTagResult.success ? lastTagResult.output : '';
      
      const commitsCommand = lastTag 
        ? `git log ${lastTag}..HEAD --oneline --pretty=format:"%s"`
        : 'git log --oneline --pretty=format:"%s"';
      
      const commitsResult = this.execCommand(commitsCommand);
      
      if (!commitsResult.success) {
        logger.warn('Failed to get commit history for changelog');
        return;
      }
      
      const commits = commitsResult.output.split('\n').filter(Boolean);
      
      // Group commits by type
      const groupedCommits = {};
      
      for (const commit of commits) {
        const match = commit.match(/^(\w+)(\(.+\))?: (.+)$/);
        if (match) {
          const [, type, scope, message] = match;
          if (!groupedCommits[type]) {
            groupedCommits[type] = [];
          }
          groupedCommits[type].push({ scope: scope?.slice(1, -1), message });
        } else {
          if (!groupedCommits.other) {
            groupedCommits.other = [];
          }
          groupedCommits.other.push({ message: commit });
        }
      }
      
      // Generate changelog content
      let changelogEntry = `## [${newVersion}] - ${new Date().toISOString().split('T')[0]}\n\n`;
      
      for (const section of versionConfig.changelog.sections) {
        const commits = groupedCommits[section.type];
        if (commits && commits.length > 0) {
          changelogEntry += `### ${section.section}\n\n`;
          for (const commit of commits) {
            const scope = commit.scope ? `**${commit.scope}**: ` : '';
            changelogEntry += `- ${scope}${commit.message}\n`;
          }
          changelogEntry += '\n';
        }
      }
      
      // Add other commits
      if (groupedCommits.other && groupedCommits.other.length > 0) {
        changelogEntry += '### Other Changes\n\n';
        for (const commit of groupedCommits.other) {
          changelogEntry += `- ${commit.message}\n`;
        }
        changelogEntry += '\n';
      }
      
      // Prepend to existing changelog
      const changelogPath = path.join(rootDir, versionConfig.changelog.file);
      let existingChangelog = '';
      
      try {
        existingChangelog = await fs.readFile(changelogPath, 'utf8');
      } catch (error) {
        // File doesn't exist, create header
        existingChangelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n## [Unreleased]\n\n`;
      }
      
      // Insert new entry after the header and unreleased section
      const unreleasedIndex = existingChangelog.indexOf('## [Unreleased]');
      if (unreleasedIndex !== -1) {
        const afterUnreleased = existingChangelog.indexOf('\n## [', unreleasedIndex + 1);
        const insertIndex = afterUnreleased !== -1 ? afterUnreleased : existingChangelog.length;
        
        const newChangelog = 
          existingChangelog.slice(0, insertIndex) + 
          '\n' + changelogEntry + 
          existingChangelog.slice(insertIndex);
        
        await fs.writeFile(changelogPath, newChangelog);
        logger.success('Updated CHANGELOG.md');
      }
      
    } catch (error) {
      logger.warn(`Failed to generate changelog: ${error.message}`);
    }
  }
  
  /**
   * Create git commit and tag
   */
  async createGitCommitAndTag(newVersion) {
    logger.step('Creating git commit and tag...');
    
    try {
      // Stage all changes
      const stageResult = this.execCommand('git add .');
      if (!stageResult.success) {
        throw new Error('Failed to stage changes');
      }
      
      // Create commit
      const commitMessage = versionConfig.git.commitMessage.replace('{version}', newVersion);
      const commitResult = this.execCommand(`git commit -m "${commitMessage}"`);
      if (!commitResult.success) {
        throw new Error('Failed to create commit');
      }
      
      // Create tag
      const tagName = `${versionConfig.git.tagPrefix}${newVersion}`;
      const tagMessage = versionConfig.git.tagMessage.replace('{version}', newVersion);
      const tagResult = this.execCommand(`git tag -a ${tagName} -m "${tagMessage}"`);
      if (!tagResult.success) {
        throw new Error('Failed to create tag');
      }
      
      logger.success(`Created commit and tag ${tagName}`);
      
      // Push if configured
      if (versionConfig.git.pushBranch) {
        const pushResult = this.execCommand('git push');
        if (pushResult.success) {
          logger.success('Pushed branch to remote');
        } else {
          logger.warn('Failed to push branch to remote');
        }
      }
      
      if (versionConfig.git.pushTags) {
        const pushTagsResult = this.execCommand('git push --tags');
        if (pushTagsResult.success) {
          logger.success('Pushed tags to remote');
        } else {
          logger.warn('Failed to push tags to remote');
        }
      }
      
    } catch (error) {
      throw new Error(`Git operations failed: ${error.message}`);
    }
  }
  
  /**
   * Run pre-release checks
   */
  async runPreReleaseChecks() {
    logger.step('Running pre-release checks...');
    
    const checks = [];
    
    // Check if working directory is clean
    const statusResult = this.execCommand('git status --porcelain');
    if (statusResult.success && statusResult.output.trim() === '') {
      checks.push({ name: 'Clean working directory', passed: true });
    } else {
      checks.push({ name: 'Clean working directory', passed: false, error: 'Uncommitted changes' });
    }
    
    // Check if on main/master branch
    const branchResult = this.execCommand('git branch --show-current');
    if (branchResult.success) {
      const branch = branchResult.output;
      if (['main', 'master'].includes(branch)) {
        checks.push({ name: 'On main branch', passed: true });
      } else {
        checks.push({ name: 'On main branch', passed: false, error: `Currently on ${branch}` });
      }
    }
    
    // Check if tests pass
    const testResult = this.execCommand('npm test -- --watchAll=false');
    checks.push({
      name: 'Tests passing',
      passed: testResult.success,
      error: testResult.success ? null : 'Tests failed'
    });
    
    const failedChecks = checks.filter(check => !check.passed);
    
    if (failedChecks.length > 0) {
      logger.error('Pre-release checks failed:');
      failedChecks.forEach(check => {
        logger.error(`  - ${check.name}: ${check.error}`);
      });
      return false;
    }
    
    logger.success('All pre-release checks passed');
    return true;
  }
  
  /**
   * Release a new version
   */
  async release(versionType, options = {}) {
    try {
      logger.info(`Starting ${versionType} release...`);
      
      // Get current version
      await this.getCurrentVersion();
      logger.info(`Current version: ${this.currentVersion}`);
      
      // Calculate new version
      this.newVersion = this.calculateNextVersion(versionType);
      logger.info(`New version: ${this.newVersion}`);
      
      // Run pre-release checks
      if (!options.skipChecks) {
        const checksPass = await this.runPreReleaseChecks();
        if (!checksPass && !options.force) {
          throw new Error('Pre-release checks failed. Use --force to override.');
        }
      }
      
      // Update version in files
      await this.updatePackageFiles(this.newVersion);
      await this.updateVersionFiles(this.newVersion);
      
      // Generate changelog
      if (!options.skipChangelog) {
        await this.generateChangelogEntry(this.newVersion);
      }
      
      // Create git commit and tag
      if (!options.skipGit) {
        await this.createGitCommitAndTag(this.newVersion);
      }
      
      logger.success(`🎉 Successfully released version ${this.newVersion}!`);
      
      return {
        success: true,
        oldVersion: this.currentVersion,
        newVersion: this.newVersion
      };
      
    } catch (error) {
      logger.error(`Release failed: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch';
  
  const options = {
    force: args.includes('--force'),
    skipChecks: args.includes('--skip-checks'),
    skipChangelog: args.includes('--skip-changelog'),
    skipGit: args.includes('--skip-git'),
    dryRun: args.includes('--dry-run')
  };
  
  if (!['major', 'minor', 'patch', 'prerelease'].includes(versionType)) {
    logger.error('Invalid version type. Use: major, minor, patch, or prerelease');
    process.exit(1);
  }
  
  try {
    const versionManager = new VersionManager();
    
    if (options.dryRun) {
      await versionManager.getCurrentVersion();
      const newVersion = versionManager.calculateNextVersion(versionType);
      logger.info(`Dry run: ${versionManager.currentVersion} → ${newVersion}`);
      return;
    }
    
    const result = await versionManager.release(versionType, options);
    
    logger.info('\n' + '='.repeat(50));
    logger.info('RELEASE COMPLETE');
    logger.info('='.repeat(50));
    logger.info(`Version: ${result.oldVersion} → ${result.newVersion}`);
    logger.info('Next steps:');
    logger.info('1. Verify the release on GitHub');
    logger.info('2. Update deployment environments');
    logger.info('3. Notify the team');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('Release failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { VersionManager, versionConfig };
