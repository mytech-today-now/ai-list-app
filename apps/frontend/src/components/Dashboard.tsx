/**
 * MCP-Native Dashboard Component
 * SemanticType: MCPDashboardComponent
 * ExtensibleByAI: true
 * AIUseCases: ["Dashboard management", "Quick actions", "System overview"]
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  useMCPTool,
  useMCPResource,
  useMCPPrompt,
  useMCPSubscription,
  useMCPContext,
  useMCPNavigation
} from '../hooks';
import { TodoList, TodoItem, MCPEvent } from '@ai-todo/shared-types';

interface DashboardState {
  selectedView: 'overview' | 'lists' | 'agents' | 'console';
  recentActivity: Array<{ id: string; action: string; timestamp: string; description: string }>;
  quickStats: {
    totalLists: number;
    totalItems: number;
    completedToday: number;
    activeAgents: number;
  };
}

const Dashboard: React.FC = () => {
  // Component State
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    selectedView: 'overview',
    recentActivity: [],
    quickStats: {
      totalLists: 0,
      totalItems: 0,
      completedToday: 0,
      activeAgents: 1
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // MCP Context
  const { executeCommand, generateAIContext, isConnected } = useMCPContext();
  const { navigateTo } = useMCPNavigation();

  // MCP Tool: Create List
  const createList = useCallback(async (params: { title: string; description?: string }) => {
    setIsLoading(true);
    try {
      const response = await executeCommand({
        action: 'create',
        targetType: 'list',
        targetId: 'new_list',
        parameters: params
      });

      // Update recent activity
      setDashboardState(prev => ({
        ...prev,
        recentActivity: [
          {
            id: `activity_${Date.now()}`,
            action: 'create_list',
            timestamp: new Date().toISOString(),
            description: `Created list: ${params.title}`
          },
          ...prev.recentActivity.slice(0, 9)
        ],
        quickStats: {
          ...prev.quickStats,
          totalLists: prev.quickStats.totalLists + 1
        }
      }));

      return response;
    } finally {
      setIsLoading(false);
    }
  }, [executeCommand]);

  useMCPTool('createList', createList, {
    description: 'Create a new task list',
    parameters: {
      title: { type: 'string', required: true },
      description: { type: 'string', required: false }
    },
    category: 'list_management'
  });

  // MCP Tool: Navigate to View
  const navigateToView = useCallback(async (params: { view: string; path?: string }) => {
    setDashboardState(prev => ({
      ...prev,
      selectedView: params.view as DashboardState['selectedView']
    }));

    if (params.path) {
      await navigateTo(params.path);
    }

    return { success: true, view: params.view };
  }, [navigateTo]);

  useMCPTool('navigateToView', navigateToView, {
    description: 'Navigate to a specific dashboard view',
    parameters: {
      view: { type: 'string', enum: ['overview', 'lists', 'agents', 'console'], required: true },
      path: { type: 'string', required: false }
    },
    category: 'navigation'
  });

  // MCP Tool: Refresh Dashboard
  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate data refresh
      await new Promise(resolve => setTimeout(resolve, 1000));

      setDashboardState(prev => ({
        ...prev,
        recentActivity: [
          {
            id: `activity_${Date.now()}`,
            action: 'refresh',
            timestamp: new Date().toISOString(),
            description: 'Dashboard refreshed'
          },
          ...prev.recentActivity.slice(0, 9)
        ]
      }));

      return { success: true, timestamp: new Date().toISOString() };
    } finally {
      setIsLoading(false);
    }
  }, []);

  useMCPTool('refreshDashboard', refreshDashboard, {
    description: 'Refresh dashboard data and statistics',
    category: 'data_management'
  });

  // MCP Resource: Dashboard State
  useMCPResource('dashboardState', dashboardState, {
    description: 'Current dashboard state including view, stats, and activity',
    schema: {
      selectedView: 'string',
      recentActivity: 'array',
      quickStats: 'object'
    },
    category: 'state'
  });

  // MCP Resource: Loading State
  useMCPResource('isLoading', isLoading, {
    description: 'Dashboard loading state',
    category: 'ui_state'
  });

  // MCP Prompt: Dashboard Context
  useMCPPrompt('dashboardContext', {
    template: `Dashboard is currently showing {{selectedView}} view.
Recent activity: {{activityCount}} items.
Statistics: {{totalLists}} lists, {{totalItems}} items, {{completedToday}} completed today.
Connection status: {{connectionStatus}}.`,
    variables: {
      selectedView: dashboardState.selectedView,
      activityCount: dashboardState.recentActivity.length,
      totalLists: dashboardState.quickStats.totalLists,
      totalItems: dashboardState.quickStats.totalItems,
      completedToday: dashboardState.quickStats.completedToday,
      connectionStatus: isConnected ? 'connected' : 'disconnected'
    },
    examples: [
      'To create a new list, use the createList tool with title parameter',
      'To navigate to different views, use the navigateToView tool'
    ],
    constraints: [
      'Only authenticated users can create lists',
      'Dashboard refreshes automatically every 30 seconds'
    ]
  }, {
    description: 'Provides context about current dashboard state for AI assistance',
    category: 'context',
    priority: 'high',
    dynamic: true
  });

  // MCP Subscription: Listen for list updates
  useMCPSubscription('list.created', useCallback((event: MCPEvent) => {
    setDashboardState(prev => ({
      ...prev,
      quickStats: {
        ...prev.quickStats,
        totalLists: prev.quickStats.totalLists + 1
      },
      recentActivity: [
        {
          id: `activity_${Date.now()}`,
          action: 'list_created',
          timestamp: event.timestamp,
          description: `New list created: ${event.data.title || 'Untitled'}`
        },
        ...prev.recentActivity.slice(0, 9)
      ]
    }));
  }, []), {
    description: 'Listen for new list creation events'
  });

  // Event Handlers
  const handleCreateList = async () => {
    const title = prompt('Enter list title:');
    if (title) {
      await createList({ title });
    }
  };

  const handleViewChange = (view: DashboardState['selectedView']) => {
    navigateToView({ view });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI ToDo MCP
            </h1>
            <p className="text-lg text-gray-600">
              AI-Driven Progressive Web App Task Manager
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                 title={isConnected ? 'Connected' : 'Disconnected'} />
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={isLoading}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{dashboardState.quickStats.totalLists}</div>
          <div className="text-sm text-gray-600">Total Lists</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{dashboardState.quickStats.totalItems}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{dashboardState.quickStats.completedToday}</div>
          <div className="text-sm text-gray-600">Completed Today</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{dashboardState.quickStats.activeAgents}</div>
          <div className="text-sm text-gray-600">Active Agents</div>
        </div>
      </div>

      <main role="main">
        {/* View Selector */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['overview', 'lists', 'agents', 'console'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => handleViewChange(view)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dashboardState.selectedView === view
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        {dashboardState.selectedView === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Task Lists</h2>
              <p className="text-gray-600 mb-4">
                Create and manage your task lists with AI assistance.
              </p>
              <button
                type="button"
                onClick={handleCreateList}
                disabled={isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Create List
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">AI Agents</h2>
              <p className="text-gray-600 mb-4">
                Configure AI agents to help manage your tasks.
              </p>
              <button
                type="button"
                onClick={() => handleViewChange('agents')}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Manage Agents
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">MCP Console</h2>
              <p className="text-gray-600 mb-4">
                Execute MCP commands directly.
              </p>
              <button
                type="button"
                onClick={() => handleViewChange('console')}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              >
                Open Console
              </button>
            </div>
          </div>
        )}

        {dashboardState.selectedView === 'lists' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Task Lists Management</h2>
            <p className="text-gray-600">
              Task lists management interface will be implemented here.
            </p>
          </div>
        )}

        {dashboardState.selectedView === 'agents' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">AI Agents Configuration</h2>
            <p className="text-gray-600">
              AI agents configuration interface will be implemented here.
            </p>
          </div>
        )}

        {dashboardState.selectedView === 'console' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">MCP Command Console</h2>
            <p className="text-gray-600">
              MCP command console interface will be implemented here.
            </p>
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {dashboardState.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {dashboardState.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{activity.description}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {activity.action}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">
              No recent activity. Start by creating your first task list!
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
