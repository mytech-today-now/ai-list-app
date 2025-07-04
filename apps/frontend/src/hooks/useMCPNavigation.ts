/**
 * MCP Navigation Hooks - AI-First Navigation with MCP Integration
 * SemanticType: MCPNavigationHooks
 * ExtensibleByAI: true
 * AIUseCases: ["Navigation management", "Route handling", "History tracking", "AI-driven navigation"]
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useMCPContext } from '../contexts/MCPContext';
import { useMCPEventEmitter } from './useMCPSubscription';
import type { MCPCommand, MCPResponse } from '@ai-todo/shared-types';

// Navigation Types
export interface MCPNavigationOptions {
  enableHistory?: boolean;
  maxHistorySize?: number;
  enableAITracking?: boolean;
  routeValidation?: (path: string) => boolean;
  onNavigationStart?: (path: string, params?: Record<string, any>) => void;
  onNavigationComplete?: (path: string, params?: Record<string, any>) => void;
  onNavigationError?: (error: Error, path: string, params?: Record<string, any>) => void;
}

export interface MCPNavigationState {
  currentPath: string;
  previousPath: string | null;
  isNavigating: boolean;
  history: Array<{ path: string; params?: Record<string, any>; timestamp: string }>;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface MCPRouteHandler {
  path: string;
  handler: (params?: Record<string, any>) => Promise<void> | void;
  description?: string;
  permissions?: string[];
}

/**
 * Core MCP Navigation Hook
 * Provides AI-aware navigation with MCP integration
 */
export const useMCPNavigation = (options: MCPNavigationOptions = {}) => {
  const {
    enableHistory = true,
    maxHistorySize = 50,
    enableAITracking = true,
    routeValidation,
    onNavigationStart,
    onNavigationComplete,
    onNavigationError
  } = options;

  const { executeCommand } = useMCPContext();
  const { emit } = useMCPEventEmitter();
  
  // Navigation State
  const [navigationState, setNavigationState] = useState<MCPNavigationState>({
    currentPath: '/',
    previousPath: null,
    isNavigating: false,
    history: [],
    canGoBack: false,
    canGoForward: false
  });

  const historyIndexRef = useRef(0);
  const routeHandlersRef = useRef<Map<string, MCPRouteHandler>>(new Map());

  // Navigate to a specific path
  const navigateTo = useCallback(async (path: string, params?: Record<string, any>) => {
    try {
      // Validate route if validation function provided
      if (routeValidation && !routeValidation(path)) {
        throw new Error(`Invalid route: ${path}`);
      }

      setNavigationState(prev => ({ ...prev, isNavigating: true }));
      
      // Trigger navigation start callback
      onNavigationStart?.(path, params);

      // Emit navigation event for AI awareness
      if (enableAITracking) {
        emit('navigation.request', { 
          path, 
          params, 
          timestamp: new Date().toISOString(),
          source: 'useMCPNavigation'
        });
      }
      
      // Execute MCP navigation command
      const command: MCPCommand = {
        action: 'execute',
        targetType: 'system',
        targetId: 'navigation',
        parameters: { path, params }
      };

      await executeCommand(command);

      // Update navigation state
      setNavigationState(prev => {
        const newHistory = enableHistory 
          ? [
              ...prev.history.slice(-maxHistorySize + 1),
              { 
                path, 
                params, 
                timestamp: new Date().toISOString() 
              }
            ]
          : prev.history;

        historyIndexRef.current = newHistory.length - 1;

        return {
          currentPath: path,
          previousPath: prev.currentPath,
          isNavigating: false,
          history: newHistory,
          canGoBack: newHistory.length > 1,
          canGoForward: false
        };
      });

      // Trigger navigation complete callback
      onNavigationComplete?.(path, params);

      // Emit completion event
      if (enableAITracking) {
        emit('navigation.completed', { 
          path, 
          params, 
          timestamp: new Date().toISOString() 
        });
      }

    } catch (error) {
      setNavigationState(prev => ({ ...prev, isNavigating: false }));
      
      const navigationError = error instanceof Error ? error : new Error('Navigation failed');
      onNavigationError?.(navigationError, path, params);

      // Emit error event
      if (enableAITracking) {
        emit('navigation.error', { 
          path, 
          params, 
          error: navigationError.message,
          timestamp: new Date().toISOString()
        });
      }

      throw navigationError;
    }
  }, [
    executeCommand, 
    emit, 
    enableAITracking, 
    enableHistory, 
    maxHistorySize, 
    routeValidation,
    onNavigationStart,
    onNavigationComplete,
    onNavigationError
  ]);

  // Navigate back in history
  const goBack = useCallback(() => {
    if (!navigationState.canGoBack || !enableHistory) return;

    const newIndex = Math.max(0, historyIndexRef.current - 1);
    const targetEntry = navigationState.history[newIndex];
    
    if (targetEntry) {
      historyIndexRef.current = newIndex;
      navigateTo(targetEntry.path, targetEntry.params);
    }
  }, [navigationState.canGoBack, navigationState.history, enableHistory, navigateTo]);

  // Navigate forward in history
  const goForward = useCallback(() => {
    if (!navigationState.canGoForward || !enableHistory) return;

    const newIndex = Math.min(navigationState.history.length - 1, historyIndexRef.current + 1);
    const targetEntry = navigationState.history[newIndex];
    
    if (targetEntry) {
      historyIndexRef.current = newIndex;
      navigateTo(targetEntry.path, targetEntry.params);
    }
  }, [navigationState.canGoForward, navigationState.history, enableHistory, navigateTo]);

  // Register a route handler
  const registerRoute = useCallback((routeHandler: MCPRouteHandler) => {
    routeHandlersRef.current.set(routeHandler.path, routeHandler);
    
    // Emit route registration for AI awareness
    if (enableAITracking) {
      emit('navigation.route-registered', {
        path: routeHandler.path,
        description: routeHandler.description,
        permissions: routeHandler.permissions,
        timestamp: new Date().toISOString()
      });
    }
  }, [emit, enableAITracking]);

  // Unregister a route handler
  const unregisterRoute = useCallback((path: string) => {
    const removed = routeHandlersRef.current.delete(path);
    
    if (removed && enableAITracking) {
      emit('navigation.route-unregistered', {
        path,
        timestamp: new Date().toISOString()
      });
    }
  }, [emit, enableAITracking]);

  // Get all registered routes
  const getRoutes = useCallback(() => {
    return Array.from(routeHandlersRef.current.entries()).map(([path, handler]) => ({
      path,
      description: handler.description,
      permissions: handler.permissions
    }));
  }, []);

  // Clear navigation history
  const clearHistory = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      history: [],
      canGoBack: false,
      canGoForward: false
    }));
    historyIndexRef.current = 0;
  }, []);

  return {
    // Navigation actions
    navigateTo,
    goBack,
    goForward,
    
    // Route management
    registerRoute,
    unregisterRoute,
    getRoutes,
    
    // State management
    clearHistory,
    
    // Current state
    ...navigationState
  };
};

/**
 * MCP Router Hook
 * Provides route management and handling
 */
export const useMCPRouter = () => {
  const { registerRoute, unregisterRoute, getRoutes } = useMCPNavigation();
  
  return {
    registerRoute,
    unregisterRoute,
    getRoutes
  };
};

/**
 * MCP History Hook
 * Provides navigation history management
 */
export const useMCPHistory = () => {
  const { history, canGoBack, canGoForward, goBack, goForward, clearHistory } = useMCPNavigation();
  
  return {
    history,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    clearHistory
  };
};

export default useMCPNavigation;
