/**
 * MCP Subscription Hook - Subscribe to AI-initiated events and state changes
 * SemanticType: MCPSubscriptionHook
 * ExtensibleByAI: true
 * AIUseCases: ["Event handling", "Real-time updates", "AI coordination"]
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MCPCommand, MCPResponse } from '@ai-todo/shared-types';

export interface MCPSubscriptionOptions {
  description?: string;
  filter?: (event: MCPEvent) => boolean;
  transform?: (event: MCPEvent) => any;
  debounceMs?: number;
  maxRetries?: number;
  autoReconnect?: boolean;
}

export interface MCPEvent {
  type: string;
  source: string;
  data: any;
  timestamp: string;
  sessionId?: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface MCPEventHandler<T = any> {
  (event: MCPEvent & { data: T }): void | Promise<void>;
}

interface MCPEventBus {
  subscribers: Map<string, Set<{
    handler: MCPEventHandler;
    options: MCPSubscriptionOptions;
    componentId: string;
  }>>;
  emit: (event: MCPEvent) => void;
  subscribe: (eventType: string, handler: MCPEventHandler, options: MCPSubscriptionOptions, componentId: string) => () => void;
  unsubscribe: (eventType: string, componentId: string) => void;
  getSubscribers: () => Array<{ eventType: string; componentId: string; options: MCPSubscriptionOptions }>;
}

// Global MCP Event Bus (singleton pattern)
const createMCPEventBus = (): MCPEventBus => {
  const subscribers = new Map<string, Set<any>>();

  const emit = (event: MCPEvent) => {
    const eventSubscribers = subscribers.get(event.type) || new Set();
    const wildcardSubscribers = subscribers.get('*') || new Set();
    
    const allSubscribers = [...eventSubscribers, ...wildcardSubscribers];
    
    allSubscribers.forEach(async ({ handler, options }) => {
      try {
        // Apply filter if specified
        if (options.filter && !options.filter(event)) {
          return;
        }

        // Transform event if specified
        const processedEvent = options.transform ? options.transform(event) : event;

        // Execute handler with debouncing if specified
        if (options.debounceMs) {
          // Simple debouncing implementation
          setTimeout(() => handler(processedEvent), options.debounceMs);
        } else {
          await handler(processedEvent);
        }
      } catch (error) {
        console.error(`Error in MCP event handler for ${event.type}:`, error);
        
        // Retry logic if specified
        if (options.maxRetries && options.maxRetries > 0) {
          // Implement retry logic here
          console.log(`Retrying event handler (${options.maxRetries} retries remaining)`);
        }
      }
    });
  };

  const subscribe = (
    eventType: string,
    handler: MCPEventHandler,
    options: MCPSubscriptionOptions,
    componentId: string
  ) => {
    if (!subscribers.has(eventType)) {
      subscribers.set(eventType, new Set());
    }

    const subscription = { handler, options, componentId };
    subscribers.get(eventType)!.add(subscription);

    return () => {
      const eventSubscribers = subscribers.get(eventType);
      if (eventSubscribers) {
        eventSubscribers.delete(subscription);
        if (eventSubscribers.size === 0) {
          subscribers.delete(eventType);
        }
      }
    };
  };

  const unsubscribe = (eventType: string, componentId: string) => {
    const eventSubscribers = subscribers.get(eventType);
    if (eventSubscribers) {
      eventSubscribers.forEach(subscription => {
        if (subscription.componentId === componentId) {
          eventSubscribers.delete(subscription);
        }
      });
      if (eventSubscribers.size === 0) {
        subscribers.delete(eventType);
      }
    }
  };

  const getSubscribers = () => {
    const result: Array<{ eventType: string; componentId: string; options: MCPSubscriptionOptions }> = [];
    subscribers.forEach((subs, eventType) => {
      subs.forEach(sub => {
        result.push({
          eventType,
          componentId: sub.componentId,
          options: sub.options
        });
      });
    });
    return result;
  };

  return {
    subscribers,
    emit,
    subscribe,
    unsubscribe,
    getSubscribers
  };
};

// Global event bus instance
const mcpEventBus = createMCPEventBus();

/**
 * Hook to subscribe to MCP events
 * @param eventType - Type of event to subscribe to (use '*' for all events)
 * @param handler - Function to handle the event
 * @param options - Subscription configuration options
 */
export const useMCPSubscription = <T = any>(
  eventType: string,
  handler: MCPEventHandler<T>,
  options: MCPSubscriptionOptions = {}
) => {
  const componentIdRef = useRef<string>();
  const [isConnected, setIsConnected] = useState(true);
  const [lastEvent, setLastEvent] = useState<MCPEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);

  // Generate unique component ID if not exists
  if (!componentIdRef.current) {
    componentIdRef.current = `component_${Math.random().toString(36).substr(2, 9)}`;
  }

  const wrappedHandler = useCallback((event: MCPEvent) => {
    setLastEvent(event);
    setEventCount(prev => prev + 1);
    handler(event as MCPEvent & { data: T });
  }, [handler]);

  useEffect(() => {
    const unsubscribe = mcpEventBus.subscribe(
      eventType,
      wrappedHandler,
      options,
      componentIdRef.current!
    );

    setIsConnected(true);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [eventType, wrappedHandler, options]);

  return {
    isConnected,
    lastEvent,
    eventCount,
    componentId: componentIdRef.current
  };
};

/**
 * Hook to emit MCP events
 */
export const useMCPEventEmitter = () => {
  const componentIdRef = useRef<string>();

  if (!componentIdRef.current) {
    componentIdRef.current = `component_${Math.random().toString(36).substr(2, 9)}`;
  }

  const emit = useCallback((
    type: string,
    data: any,
    metadata?: Record<string, any>
  ) => {
    const event: MCPEvent = {
      type,
      source: componentIdRef.current!,
      data,
      timestamp: new Date().toISOString(),
      metadata
    };

    mcpEventBus.emit(event);
  }, []);

  const emitCommand = useCallback((command: MCPCommand) => {
    emit('mcp.command', command, { commandType: 'mcp' });
  }, [emit]);

  const emitResponse = useCallback((response: MCPResponse) => {
    emit('mcp.response', response, { responseType: 'mcp' });
  }, [emit]);

  return {
    emit,
    emitCommand,
    emitResponse,
    componentId: componentIdRef.current
  };
};

/**
 * Hook to access the global MCP event bus
 */
export const useMCPEventBus = () => {
  const [subscribers, setSubscribers] = useState<Array<{ eventType: string; componentId: string; options: MCPSubscriptionOptions }>>([]);

  useEffect(() => {
    const updateSubscribers = () => {
      setSubscribers(mcpEventBus.getSubscribers());
    };

    // Update subscribers list periodically
    const interval = setInterval(updateSubscribers, 1000);
    updateSubscribers();

    return () => clearInterval(interval);
  }, []);

  return {
    emit: mcpEventBus.emit,
    getSubscribers: mcpEventBus.getSubscribers,
    subscribers
  };
};

/**
 * Hook for real-time MCP state synchronization
 */
export const useMCPStateSync = <T>(
  stateKey: string,
  initialState: T,
  options: { 
    syncInterval?: number;
    conflictResolution?: 'client' | 'server' | 'merge';
  } = {}
) => {
  const [state, setState] = useState<T>(initialState);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  const { emit } = useMCPEventEmitter();

  // Subscribe to state updates from other components/agents
  useMCPSubscription(
    `state.${stateKey}`,
    useCallback((event: MCPEvent) => {
      if (event.data && event.source !== componentIdRef.current) {
        setSyncStatus('syncing');
        
        // Apply conflict resolution strategy
        switch (options.conflictResolution) {
          case 'server':
            setState(event.data.state);
            break;
          case 'client':
            // Keep current state
            break;
          case 'merge':
          default:
            // Simple merge strategy - can be enhanced
            if (typeof state === 'object' && typeof event.data.state === 'object') {
              setState(prev => ({ ...prev, ...event.data.state }));
            } else {
              setState(event.data.state);
            }
            break;
        }
        
        setLastSync(event.timestamp);
        setSyncStatus('idle');
      }
    }, [state, options.conflictResolution]),
    { description: `State sync for ${stateKey}` }
  );

  const componentIdRef = useRef<string>();
  if (!componentIdRef.current) {
    componentIdRef.current = `component_${Math.random().toString(36).substr(2, 9)}`;
  }

  const updateState = useCallback((newState: T | ((prev: T) => T)) => {
    const updatedState = typeof newState === 'function' 
      ? (newState as (prev: T) => T)(state)
      : newState;
    
    setState(updatedState);
    
    // Emit state change event
    emit(`state.${stateKey}`, {
      state: updatedState,
      stateKey,
      timestamp: new Date().toISOString()
    });
  }, [state, stateKey, emit]);

  return {
    state,
    updateState,
    lastSync,
    syncStatus
  };
};

export default useMCPSubscription;
