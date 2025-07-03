/**
 * MCP Prompt Hook - Create dynamic prompts for AI context understanding
 * SemanticType: MCPPromptHook
 * ExtensibleByAI: true
 * AIUseCases: ["Context generation", "AI guidance", "Dynamic prompting"]
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

export interface MCPPromptOptions {
  description?: string;
  category?: 'context' | 'instruction' | 'example' | 'constraint';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dynamic?: boolean;
  refreshInterval?: number; // in milliseconds
  conditions?: Record<string, any>; // Conditions for when prompt should be active
}

export interface MCPPromptTemplate {
  template: string;
  variables?: Record<string, any>;
  examples?: string[];
  constraints?: string[];
}

interface MCPPromptRegistry {
  prompts: Map<string, {
    getPrompt: () => MCPPromptTemplate | string;
    options: MCPPromptOptions;
    componentId: string;
    lastUpdated: string;
    isActive: boolean;
  }>;
  subscribe: (callback: (prompts: Map<string, any>) => void) => () => void;
  getPrompt: (promptName: string) => MCPPromptTemplate | string;
  getActivePrompts: () => Record<string, MCPPromptTemplate | string>;
  generateContextPrompt: () => string;
}

// Global MCP Prompt Registry (singleton pattern)
const createMCPPromptRegistry = (): MCPPromptRegistry => {
  const prompts = new Map();
  const subscribers = new Set<(prompts: Map<string, any>) => void>();

  const notifySubscribers = () => {
    subscribers.forEach(callback => callback(new Map(prompts)));
  };

  const evaluateConditions = (conditions?: Record<string, any>): boolean => {
    if (!conditions) return true;
    
    // Simple condition evaluation - can be extended
    return Object.entries(conditions).every(([key, value]) => {
      // Add your condition evaluation logic here
      return true; // Placeholder
    });
  };

  return {
    prompts,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    getPrompt: (promptName: string) => {
      const prompt = prompts.get(promptName);
      if (!prompt) {
        throw new Error(`MCP Prompt '${promptName}' not found`);
      }
      return prompt.getPrompt();
    },
    getActivePrompts: () => {
      const result: Record<string, MCPPromptTemplate | string> = {};
      prompts.forEach((prompt, name) => {
        if (prompt.isActive && evaluateConditions(prompt.options.conditions)) {
          result[name] = prompt.getPrompt();
        }
      });
      return result;
    },
    generateContextPrompt: () => {
      const activePrompts = Array.from(prompts.values())
        .filter(prompt => prompt.isActive && evaluateConditions(prompt.options.conditions))
        .sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.options.priority || 'medium'];
          const bPriority = priorityOrder[b.options.priority || 'medium'];
          return bPriority - aPriority;
        });

      const contextSections = {
        context: [] as string[],
        instruction: [] as string[],
        example: [] as string[],
        constraint: [] as string[]
      };

      activePrompts.forEach(prompt => {
        const content = prompt.getPrompt();
        const category = prompt.options.category || 'context';
        
        if (typeof content === 'string') {
          contextSections[category].push(content);
        } else {
          // Handle MCPPromptTemplate
          let formattedContent = content.template;
          if (content.variables) {
            Object.entries(content.variables).forEach(([key, value]) => {
              formattedContent = formattedContent.replace(
                new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                String(value)
              );
            });
          }
          contextSections[category].push(formattedContent);
          
          if (content.examples) {
            contextSections.example.push(...content.examples);
          }
          if (content.constraints) {
            contextSections.constraint.push(...content.constraints);
          }
        }
      });

      // Build the final context prompt
      let contextPrompt = '';
      
      if (contextSections.context.length > 0) {
        contextPrompt += '## Context\n' + contextSections.context.join('\n\n') + '\n\n';
      }
      
      if (contextSections.instruction.length > 0) {
        contextPrompt += '## Instructions\n' + contextSections.instruction.join('\n\n') + '\n\n';
      }
      
      if (contextSections.example.length > 0) {
        contextPrompt += '## Examples\n' + contextSections.example.join('\n\n') + '\n\n';
      }
      
      if (contextSections.constraint.length > 0) {
        contextPrompt += '## Constraints\n' + contextSections.constraint.join('\n\n') + '\n\n';
      }

      return contextPrompt.trim();
    }
  };
};

// Global registry instance
const mcpPromptRegistry = createMCPPromptRegistry();

/**
 * Hook to register a dynamic prompt for AI context
 * @param promptName - Unique name for the prompt
 * @param promptContent - The prompt content (string or template function)
 * @param options - Prompt configuration options
 */
export const useMCPPrompt = (
  promptName: string,
  promptContent: MCPPromptTemplate | string | (() => MCPPromptTemplate | string),
  options: MCPPromptOptions = {}
) => {
  const componentIdRef = useRef<string>();
  
  // Generate unique component ID if not exists
  if (!componentIdRef.current) {
    componentIdRef.current = `component_${Math.random().toString(36).substr(2, 9)}`;
  }

  const getPrompt = useCallback(() => {
    return typeof promptContent === 'function' ? promptContent() : promptContent;
  }, [promptContent]);

  const isActive = useMemo(() => {
    // Determine if prompt should be active based on conditions
    if (!options.conditions) return true;
    
    // Add your condition evaluation logic here
    return true; // Placeholder
  }, [options.conditions]);

  useEffect(() => {
    const fullPromptName = `${componentIdRef.current}.${promptName}`;
    const lastUpdated = new Date().toISOString();
    
    // Register the prompt
    mcpPromptRegistry.prompts.set(fullPromptName, {
      getPrompt,
      options: {
        ...options,
        description: options.description || `Prompt: ${promptName}`,
        category: options.category || 'context',
        priority: options.priority || 'medium'
      },
      componentId: componentIdRef.current!,
      lastUpdated,
      isActive
    });

    // Set up refresh interval if specified
    let intervalId: NodeJS.Timeout | undefined;
    if (options.dynamic && options.refreshInterval) {
      intervalId = setInterval(() => {
        const prompt = mcpPromptRegistry.prompts.get(fullPromptName);
        if (prompt) {
          prompt.lastUpdated = new Date().toISOString();
        }
      }, options.refreshInterval);
    }

    // Cleanup on unmount
    return () => {
      mcpPromptRegistry.prompts.delete(fullPromptName);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [promptName, getPrompt, options, isActive]);

  return {
    promptName: `${componentIdRef.current}.${promptName}`,
    componentId: componentIdRef.current,
    isRegistered: mcpPromptRegistry.prompts.has(`${componentIdRef.current}.${promptName}`),
    isActive,
    getPrompt
  };
};

/**
 * Hook to access the global MCP prompt registry
 */
export const useMCPPromptRegistry = () => {
  return {
    getPrompt: mcpPromptRegistry.getPrompt,
    getActivePrompts: mcpPromptRegistry.getActivePrompts,
    generateContextPrompt: mcpPromptRegistry.generateContextPrompt,
    getPromptList: () => Array.from(mcpPromptRegistry.prompts.entries()).map(([name, prompt]) => ({
      name,
      description: prompt.options.description,
      category: prompt.options.category,
      priority: prompt.options.priority,
      componentId: prompt.componentId,
      lastUpdated: prompt.lastUpdated,
      isActive: prompt.isActive
    })),
    subscribe: mcpPromptRegistry.subscribe
  };
};

/**
 * Hook to generate AI context from all active prompts
 */
export const useMCPContext = () => {
  const generateContext = useCallback(() => {
    return mcpPromptRegistry.generateContextPrompt();
  }, []);

  const getActivePrompts = useCallback(() => {
    return mcpPromptRegistry.getActivePrompts();
  }, []);

  return {
    generateContext,
    getActivePrompts
  };
};

export default useMCPPrompt;
