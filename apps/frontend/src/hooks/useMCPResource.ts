/**
 * MCP Resource Hook - Expose component data as readable MCP resources
 * SemanticType: MCPResourceHook
 * ExtensibleByAI: true
 * AIUseCases: ["State exposure", "Data discovery", "Real-time monitoring"]
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface MCPResourceOptions {
  description?: string;
  schema?: Record<string, any>;
  permissions?: string[];
  category?: string;
  cacheable?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface MCPResourceRegistry {
  resources: Map<string, {
    getValue: () => any;
    options: MCPResourceOptions;
    componentId: string;
    lastUpdated: string;
  }>;
  subscribe: (callback: (resources: Map<string, any>) => void) => () => void;
  subscribeToResource: (resourceName: string, callback: (value: any) => void) => () => void;
  getResource: (resourceName: string) => any;
  getAllResources: () => Record<string, any>;
}

// Global MCP Resource Registry (singleton pattern)
const createMCPResourceRegistry = (): MCPResourceRegistry => {
  const resources = new Map();
  const subscribers = new Set<(resources: Map<string, any>) => void>();
  const resourceSubscribers = new Map<string, Set<(value: any) => void>>();

  const notifySubscribers = () => {
    subscribers.forEach(callback => callback(new Map(resources)));
  };

  const notifyResourceSubscribers = (resourceName: string, value: any) => {
    const subs = resourceSubscribers.get(resourceName);
    if (subs) {
      subs.forEach(callback => callback(value));
    }
  };

  return {
    resources,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    subscribeToResource: (resourceName: string, callback: (value: any) => void) => {
      if (!resourceSubscribers.has(resourceName)) {
        resourceSubscribers.set(resourceName, new Set());
      }
      resourceSubscribers.get(resourceName)!.add(callback);
      
      return () => {
        const subs = resourceSubscribers.get(resourceName);
        if (subs) {
          subs.delete(callback);
          if (subs.size === 0) {
            resourceSubscribers.delete(resourceName);
          }
        }
      };
    },
    getResource: (resourceName: string) => {
      const resource = resources.get(resourceName);
      if (!resource) {
        throw new Error(`MCP Resource '${resourceName}' not found`);
      }
      return {
        value: resource.getValue(),
        metadata: {
          resourceName,
          componentId: resource.componentId,
          lastUpdated: resource.lastUpdated,
          options: resource.options
        }
      };
    },
    getAllResources: () => {
      const result: Record<string, any> = {};
      resources.forEach((resource, name) => {
        result[name] = {
          value: resource.getValue(),
          metadata: {
            componentId: resource.componentId,
            lastUpdated: resource.lastUpdated,
            options: resource.options
          }
        };
      });
      return result;
    }
  };
};

// Global registry instance
const mcpResourceRegistry = createMCPResourceRegistry();

/**
 * Hook to expose component data as an MCP resource
 * @param resourceName - Unique name for the resource
 * @param value - The data to expose
 * @param options - Resource configuration options
 */
export const useMCPResource = <T = any>(
  resourceName: string,
  value: T,
  options: MCPResourceOptions = {}
) => {
  const componentIdRef = useRef<string>();
  const previousValueRef = useRef<T>(value);
  
  // Generate unique component ID if not exists
  if (!componentIdRef.current) {
    componentIdRef.current = `component_${Math.random().toString(36).substr(2, 9)}`;
  }

  const getValue = useCallback(() => value, [value]);

  useEffect(() => {
    const fullResourceName = `${componentIdRef.current}.${resourceName}`;
    const lastUpdated = new Date().toISOString();
    
    // Register the resource
    mcpResourceRegistry.resources.set(fullResourceName, {
      getValue,
      options: {
        ...options,
        description: options.description || `Resource: ${resourceName}`,
      },
      componentId: componentIdRef.current!,
      lastUpdated
    });

    // Notify subscribers if value changed
    if (previousValueRef.current !== value) {
      mcpResourceRegistry.subscribeToResource(fullResourceName, () => {});
      previousValueRef.current = value;
    }

    // Cleanup on unmount
    return () => {
      mcpResourceRegistry.resources.delete(fullResourceName);
    };
  }, [resourceName, value, getValue, options]);

  return {
    resourceName: `${componentIdRef.current}.${resourceName}`,
    componentId: componentIdRef.current,
    isRegistered: mcpResourceRegistry.resources.has(`${componentIdRef.current}.${resourceName}`),
    lastUpdated: mcpResourceRegistry.resources.get(`${componentIdRef.current}.${resourceName}`)?.lastUpdated
  };
};

/**
 * Hook to access the global MCP resource registry
 */
export const useMCPResourceRegistry = () => {
  const [resources, setResources] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const unsubscribe = mcpResourceRegistry.subscribe(setResources);
    return unsubscribe;
  }, []);

  return {
    getResource: mcpResourceRegistry.getResource,
    getAllResources: mcpResourceRegistry.getAllResources,
    getResourceList: () => Array.from(mcpResourceRegistry.resources.entries()).map(([name, resource]) => ({
      name,
      description: resource.options.description,
      schema: resource.options.schema,
      permissions: resource.options.permissions,
      category: resource.options.category,
      componentId: resource.componentId,
      lastUpdated: resource.lastUpdated
    })),
    subscribe: mcpResourceRegistry.subscribe,
    subscribeToResource: mcpResourceRegistry.subscribeToResource,
    resources
  };
};

/**
 * Hook to consume MCP resources from other components
 */
export const useMCPResourceConsumer = (resourceName: string) => {
  const [resourceData, setResourceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = mcpResourceRegistry.getResource(resourceName);
      setResourceData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResourceData(null);
    } finally {
      setLoading(false);
    }

    // Subscribe to resource updates
    const unsubscribe = mcpResourceRegistry.subscribeToResource(resourceName, (newValue) => {
      setResourceData(prev => ({
        ...prev,
        value: newValue,
        metadata: {
          ...prev?.metadata,
          lastUpdated: new Date().toISOString()
        }
      }));
    });

    return unsubscribe;
  }, [resourceName]);

  return {
    data: resourceData,
    loading,
    error,
    refresh: () => {
      try {
        const data = mcpResourceRegistry.getResource(resourceName);
        setResourceData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };
};

export default useMCPResource;
