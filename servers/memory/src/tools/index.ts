// Memory Graph MCP Tools
// Tool implementations for memory operations

import type { MemoryService } from '../services/MemoryService.js';
import type { 
  StoreMemoryArgs, 
  RetrieveMemoryArgs, 
  SearchMemoriesArgs,
  CreateConnectionArgs,
  GetRelatedArgs,
  MergeMemoriesArgs
} from '../types/index.js';

export async function storeMemoryTool(service: MemoryService, args: StoreMemoryArgs) {
  try {
    const memory = await service.storeMemory(args);
    
    return {
      content: [{
        type: 'text',
        text: `Memory stored successfully!\n\nID: ${memory.id}\nContent: ${memory.content.substring(0, 100)}...\nConcepts: ${memory.concepts.map(c => c.name).join(', ')}\nImportance: ${memory.importance}/5`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

export async function retrieveMemoryTool(service: MemoryService, args: RetrieveMemoryArgs) {
  try {
    const memories = await service.retrieveMemory(args);
    
    const results = memories.map(memory => 
      `ID: ${memory.id}\nContent: ${memory.content.substring(0, 100)}...\nConcepts: ${memory.concepts.map(c => c.name).join(', ')}\nCreated: ${memory.createdAt}`
    ).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: `Found ${memories.length} memories:\n\n${results}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Failed to retrieve memories: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

export async function searchMemoriesTool(service: MemoryService, args: SearchMemoriesArgs) {
  try {
    const result = await service.searchMemories(args);
    
    const results = result.memories.map(memory => 
      `ID: ${memory.id}\nContent: ${memory.content.substring(0, 100)}...\nConcepts: ${memory.concepts.map(c => c.name).join(', ')}\nCreated: ${memory.createdAt}`
    ).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: `Search Results (${result.total} found, ${result.processingTimeMs}ms):\n\n${results}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Failed to search memories: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

export async function createConnectionTool(service: MemoryService, args: CreateConnectionArgs) {
  try {
    await service.createConnection(args);
    
    return {
      content: [{
        type: 'text',
        text: `Connection created successfully between ${args.sourceId} and ${args.targetId} (${args.relationshipType})`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Failed to create connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

export async function getRelatedTool(service: MemoryService, args: GetRelatedArgs) {
  try {
    const related = await service.getRelated(args.memoryId, args.maxDepth, args.minStrength);
    
    const relatedInfo = related.relatedNodes.map(node =>
      `ID: ${node.memory.id}\nRelationship: ${node.relationship.relationshipType} (strength: ${node.relationship.strength})\nContent: ${node.memory.content.substring(0, 100)}...`
    ).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: `Related memories for ${args.memoryId}:\n\nCenter Memory: ${related.centerMemory.content.substring(0, 100)}...\n\nRelated (${related.relatedNodes.length}):\n\n${relatedInfo}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Failed to get related memories: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

export async function mergeMemoriesTool(service: MemoryService, args: MergeMemoriesArgs) {
  try {
    const merged = await service.mergeMemories(args.primaryMemoryId, args.secondaryMemoryIds, args.strategy);
    
    return {
      content: [{
        type: 'text',
        text: `Memories merged successfully into ${merged.id}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Failed to merge memories: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

export async function getMemoryStatsTool(service: MemoryService, args: any) {
  try {
    const stats = await service.getMemoryStats();
    
    return {
      content: [{
        type: 'text',
        text: `Memory Statistics:\n\nTotal Memories: ${stats.totalMemories}\nTotal Relationships: ${stats.totalRelationships}\nTotal Concepts: ${stats.totalConcepts}\nAverage Importance: ${stats.averageImportance}/5`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Failed to get memory statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

export async function createConceptTool(service: MemoryService, args: any) {
  return {
    content: [{
      type: 'text',
      text: 'Create concept tool not yet implemented'
    }]
  };
}