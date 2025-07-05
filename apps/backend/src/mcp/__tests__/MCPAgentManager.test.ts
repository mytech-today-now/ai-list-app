/**
 * MCP Agent Manager Tests
 * SemanticType: MCPAgentManagerTests
 * ExtensibleByAI: true
 * AIUseCases: ["Agent management testing", "Permission validation", "Session tracking"]
 */

import { MCPAgentManager } from '../agents/MCPAgentManager';
import { AgentRole, AgentStatus } from '@ai-todo/shared-types';

describe('MCPAgentManager', () => {
  let agentManager: MCPAgentManager;

  beforeEach(() => {
    agentManager = new MCPAgentManager();
  });

  describe('Agent Creation', () => {
    it('should create a new agent', async () => {
      const agentData = {
        name: 'Test Agent',
        role: 'writer' as AgentRole,
        permissions: ['read', 'write'],
        capabilities: ['create_lists', 'update_lists'],
        description: 'A test agent'
      };

      const agent = await agentManager.createAgent(agentData);

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe(agentData.name);
      expect(agent.role).toBe(agentData.role);
      expect(agent.permissions).toEqual(agentData.permissions);
      expect(agent.capabilities).toEqual(agentData.capabilities);
      expect(agent.status).toBe('active');
      expect(agent.createdAt).toBeDefined();
      expect(agent.lastActivity).toBeDefined();
    });

    it('should generate unique agent IDs', async () => {
      const agentData = {
        name: 'Test Agent',
        role: 'reader' as AgentRole,
        permissions: ['read']
      };

      const agent1 = await agentManager.createAgent(agentData);
      const agent2 = await agentManager.createAgent(agentData);

      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('Agent Retrieval', () => {
    it('should retrieve an existing agent', async () => {
      const agentData = {
        name: 'Test Agent',
        role: 'reader' as AgentRole,
        permissions: ['read']
      };

      const createdAgent = await agentManager.createAgent(agentData);
      const retrievedAgent = await agentManager.getAgent(createdAgent.id);

      expect(retrievedAgent).toBeDefined();
      expect(retrievedAgent?.id).toBe(createdAgent.id);
      expect(retrievedAgent?.name).toBe(createdAgent.name);
    });

    it('should return null for non-existent agent', async () => {
      const agent = await agentManager.getAgent('non-existent-id');
      expect(agent).toBeNull();
    });

    it('should update last activity when retrieving agent', async () => {
      const agentData = {
        name: 'Test Agent',
        role: 'reader' as AgentRole,
        permissions: ['read']
      };

      const createdAgent = await agentManager.createAgent(agentData);
      const originalActivity = createdAgent.lastActivity;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const retrievedAgent = await agentManager.getAgent(createdAgent.id);
      
      expect(retrievedAgent?.lastActivity).not.toBe(originalActivity);
    });
  });

  describe('System Agent', () => {
    it('should provide system agent', () => {
      const systemAgent = agentManager.getSystemAgent();

      expect(systemAgent).toBeDefined();
      expect(systemAgent.id).toBe('system');
      expect(systemAgent.name).toBe('System Agent');
      expect(systemAgent.role).toBe('admin');
      expect(systemAgent.permissions).toContain('admin');
    });
  });

  describe('Agent Updates', () => {
    it('should update agent properties', async () => {
      const agentData = {
        name: 'Test Agent',
        role: 'reader' as AgentRole,
        permissions: ['read']
      };

      const agent = await agentManager.createAgent(agentData);
      
      const updates = {
        name: 'Updated Agent',
        permissions: ['read', 'write']
      };

      const updatedAgent = await agentManager.updateAgent(agent.id, updates);

      expect(updatedAgent).toBeDefined();
      expect(updatedAgent?.name).toBe(updates.name);
      expect(updatedAgent?.permissions).toEqual(updates.permissions);
      expect(updatedAgent?.updatedAt).toBeDefined();
    });

    it('should not allow ID changes', async () => {
      const agentData = {
        name: 'Test Agent',
        role: 'reader' as AgentRole,
        permissions: ['read']
      };

      const agent = await agentManager.createAgent(agentData);
      const originalId = agent.id;
      
      const updates = {
        id: 'new-id',
        name: 'Updated Agent'
      };

      const updatedAgent = await agentManager.updateAgent(agent.id, updates);

      expect(updatedAgent?.id).toBe(originalId);
    });

    it('should return null when updating non-existent agent', async () => {
      const updates = { name: 'Updated Agent' };
      const result = await agentManager.updateAgent('non-existent-id', updates);
      
      expect(result).toBeNull();
    });
  });

  describe('Agent Deletion', () => {
    it('should delete an agent', async () => {
      const agentData = {
        name: 'Test Agent',
        role: 'reader' as AgentRole,
        permissions: ['read']
      };

      const agent = await agentManager.createAgent(agentData);
      const deleted = await agentManager.deleteAgent(agent.id);

      expect(deleted).toBe(true);

      const retrievedAgent = await agentManager.getAgent(agent.id);
      expect(retrievedAgent).toBeNull();
    });

    it('should not delete system agent', async () => {
      const deleted = await agentManager.deleteAgent('system');
      expect(deleted).toBe(false);

      const systemAgent = agentManager.getSystemAgent();
      expect(systemAgent).toBeDefined();
    });

    it('should return false when deleting non-existent agent', async () => {
      const deleted = await agentManager.deleteAgent('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('Agent Listing', () => {
    beforeEach(async () => {
      // Create test agents
      await agentManager.createAgent({
        name: 'Reader Agent',
        role: 'reader' as AgentRole,
        permissions: ['read']
      });

      await agentManager.createAgent({
        name: 'Writer Agent',
        role: 'writer' as AgentRole,
        permissions: ['read', 'write']
      });

      await agentManager.createAgent({
        name: 'Inactive Agent',
        role: 'reader' as AgentRole,
        permissions: ['read']
      });
    });

    it('should list all agents', async () => {
      const agents = await agentManager.listAgents();
      
      expect(agents.length).toBeGreaterThanOrEqual(3); // Including system agent and defaults
    });

    it('should filter agents by role', async () => {
      const readerAgents = await agentManager.listAgents({ role: 'reader' });
      
      expect(readerAgents.length).toBeGreaterThan(0);
      readerAgents.forEach(agent => {
        expect(agent.role).toBe('reader');
      });
    });

    it('should filter agents by status', async () => {
      const activeAgents = await agentManager.listAgents({ status: 'active' });
      
      expect(activeAgents.length).toBeGreaterThan(0);
      activeAgents.forEach(agent => {
        expect(agent.status).toBe('active');
      });
    });

    it('should apply limit and offset', async () => {
      const firstPage = await agentManager.listAgents({ limit: 2, offset: 0 });
      const secondPage = await agentManager.listAgents({ limit: 2, offset: 2 });
      
      expect(firstPage.length).toBeLessThanOrEqual(2);
      expect(secondPage.length).toBeLessThanOrEqual(2);
      
      // Ensure different results
      if (firstPage.length > 0 && secondPage.length > 0) {
        expect(firstPage[0].id).not.toBe(secondPage[0].id);
      }
    });
  });

  describe('Permission Validation', () => {
    it('should validate agent permissions', async () => {
      const agent = await agentManager.createAgent({
        name: 'Test Agent',
        role: 'writer' as AgentRole,
        permissions: ['read', 'write']
      });

      const hasRead = await agentManager.validateAgentPermissions(agent, ['read']);
      const hasWrite = await agentManager.validateAgentPermissions(agent, ['write']);
      const hasAdmin = await agentManager.validateAgentPermissions(agent, ['admin']);

      expect(hasRead).toBe(true);
      expect(hasWrite).toBe(true);
      expect(hasAdmin).toBe(false);
    });

    it('should grant all permissions to admin agents', async () => {
      const adminAgent = await agentManager.createAgent({
        name: 'Admin Agent',
        role: 'admin' as AgentRole,
        permissions: ['admin']
      });

      const hasAnyPermission = await agentManager.validateAgentPermissions(
        adminAgent, 
        ['read', 'write', 'execute', 'delete']
      );

      expect(hasAnyPermission).toBe(true);
    });

    it('should always grant permissions to system agent', async () => {
      const systemAgent = agentManager.getSystemAgent();

      const hasAnyPermission = await agentManager.validateAgentPermissions(
        systemAgent, 
        ['read', 'write', 'execute', 'delete', 'admin']
      );

      expect(hasAnyPermission).toBe(true);
    });
  });

  describe('Capability Validation', () => {
    it('should validate agent capabilities', async () => {
      const agent = await agentManager.createAgent({
        name: 'Test Agent',
        role: 'writer' as AgentRole,
        permissions: ['read', 'write'],
        capabilities: ['create_lists', 'update_lists']
      });

      const canCreateLists = await agentManager.validateAgentCapability(agent, 'create_lists');
      const canDeleteLists = await agentManager.validateAgentCapability(agent, 'delete_lists');

      expect(canCreateLists).toBe(true);
      expect(canDeleteLists).toBe(false);
    });

    it('should grant all capabilities to system agent', async () => {
      const systemAgent = agentManager.getSystemAgent();

      const canDoAnything = await agentManager.validateAgentCapability(systemAgent, 'any_capability');

      expect(canDoAnything).toBe(true);
    });
  });

  describe('Agent Statistics', () => {
    it('should return agent statistics', async () => {
      const stats = await agentManager.getAgentStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeGreaterThan(0);
      expect(typeof stats.inactive).toBe('number');
    });
  });

  describe('Activity Tracking', () => {
    it('should record agent activity', async () => {
      const agent = await agentManager.createAgent({
        name: 'Test Agent',
        role: 'writer' as AgentRole,
        permissions: ['read', 'write']
      });

      await agentManager.recordAgentActivity(agent.id, {
        action: 'create',
        targetType: 'list',
        targetId: 'test-list'
      });

      const updatedAgent = await agentManager.getAgent(agent.id);
      
      expect(updatedAgent?.metadata?.recentActivities).toBeDefined();
      expect(updatedAgent?.metadata?.recentActivities.length).toBeGreaterThan(0);
    });
  });
});
