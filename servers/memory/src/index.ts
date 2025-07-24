#!/usr/bin/env node

/**
 * Memory Graph MCP Server
 * 
 * A Model Context Protocol server for long-term knowledge persistence and relationship mapping.
 * Based on the @tylercoles/mcp-server framework.
 */

import { Server } from '@tylercoles/mcp-server';
import { StdioServerTransport } from '@tylercoles/mcp-transport-http';
import { MemoryService } from '@mcp-tools/core/memory';
import { 
  storeMemoryTool,
  retrieveMemoryTool,
  searchMemoriesTool,
  createConnectionTool,
  getRelatedTool,
  mergeMemoriesTool,
  getMemoryStatsTool,
  createConceptTool
} from './tools/index.js';

// Environment configuration
const config = {
  database: {
    type: (process.env.DATABASE_TYPE as 'sqlite' | 'postgres') || 'sqlite',
    file: process.env.DATABASE_FILE || './memory.db',
    config: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : undefined,
      database: process.env.DATABASE_NAME,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
    }
  },
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  server: {
    name: 'memory-graph-mcp-server',
    version: '1.0.0',
    port: parseInt(process.env.PORT || '8195')
  }
};

async function main() {
  try {
    // Initialize memory service
    console.log('Initializing memory service...');
    const memoryService = new MemoryService(config.database, config.natsUrl);
    await memoryService.initialize();

    // Create MCP server
    const server = new Server({
      name: config.server.name,
      version: config.server.version
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });

    // Register tools
    console.log('Registering MCP tools...');
    server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'store_memory',
            description: 'Store a new memory in the graph with automatic relationship detection',
            inputSchema: {
              type: 'object',
              properties: {
                content: { type: 'string', description: 'The memory content to store' },
                context: { 
                  type: 'object',
                  description: 'Context information for the memory',
                  properties: {
                    source: { type: 'string' },
                    timestamp: { type: 'string' },
                    location: { type: 'string' },
                    participants: { type: 'array', items: { type: 'string' } },
                    tags: { type: 'array', items: { type: 'string' } },
                    userId: { type: 'string' },
                    projectName: { type: 'string' },
                    memoryTopic: { type: 'string' },
                    memoryType: { type: 'string' }
                  },
                  additionalProperties: true
                },
                concepts: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Explicit concepts to associate with this memory'
                },
                importance: { 
                  type: 'number', 
                  minimum: 1, 
                  maximum: 5,
                  description: 'Importance level (1=low, 5=critical)'
                }
              },
              required: ['content', 'context']
            }
          },
          {
            name: 'retrieve_memory',
            description: 'Retrieve memories based on query and context filters',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query for memory content' },
                concepts: { type: 'array', items: { type: 'string' } },
                dateRange: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    to: { type: 'string' }
                  }
                },
                context: { type: 'object', additionalProperties: true },
                userId: { type: 'string' },
                projectName: { type: 'string' },
                similarityThreshold: { type: 'number', minimum: 0, maximum: 1 },
                limit: { type: 'number', minimum: 1, maximum: 100 }
              }
            }
          },
          {
            name: 'search_memories',
            description: 'Perform semantic search across all memories',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                contextFilters: { type: 'object', additionalProperties: true },
                conceptFilters: { type: 'array', items: { type: 'string' } },
                includeRelated: { type: 'boolean' },
                maxDepth: { type: 'number', minimum: 1, maximum: 5 },
                userId: { type: 'string' },
                projectName: { type: 'string' },
                similarityThreshold: { type: 'number', minimum: 0, maximum: 1 },
                limit: { type: 'number', minimum: 1, maximum: 100 }
              },
              required: ['query']
            }
          },
          {
            name: 'create_connection',
            description: 'Create an explicit relationship between two memories',
            inputSchema: {
              type: 'object',
              properties: {
                sourceId: { type: 'string' },
                targetId: { type: 'string' },
                relationshipType: { 
                  type: 'string',
                  enum: ['semantic_similarity', 'causal', 'temporal', 'conceptual', 'custom']
                },
                strength: { type: 'number', minimum: 0, maximum: 1 },
                metadata: { type: 'object', additionalProperties: true },
                bidirectional: { type: 'boolean' }
              },
              required: ['sourceId', 'targetId', 'relationshipType']
            }
          },
          {
            name: 'get_related',
            description: 'Find memories related to a specific memory through the relationship graph',
            inputSchema: {
              type: 'object',
              properties: {
                memoryId: { type: 'string' },
                relationshipTypes: { type: 'array', items: { type: 'string' } },
                maxDepth: { type: 'number', minimum: 1, maximum: 5 },
                minStrength: { type: 'number', minimum: 0, maximum: 1 }
              },
              required: ['memoryId']
            }
          },
          {
            name: 'merge_memories',
            description: 'Merge multiple memories into one, combining their content and relationships',
            inputSchema: {
              type: 'object',
              properties: {
                primaryMemoryId: { type: 'string' },
                secondaryMemoryIds: { type: 'array', items: { type: 'string' } },
                strategy: { 
                  type: 'string',
                  enum: ['combine_content', 'preserve_primary', 'create_summary']
                }
              },
              required: ['primaryMemoryId', 'secondaryMemoryIds', 'strategy']
            }
          },
          {
            name: 'get_memory_stats',
            description: 'Get statistics and insights about the memory graph',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                projectName: { type: 'string' },
                dateRange: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    to: { type: 'string' }
                  }
                }
              }
            }
          },
          {
            name: 'create_concept',
            description: 'Create or update a concept in the knowledge graph',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                type: { 
                  type: 'string',
                  enum: ['entity', 'topic', 'skill', 'project', 'person', 'custom']
                },
                relatedMemoryIds: { type: 'array', items: { type: 'string' } }
              },
              required: ['name', 'type']
            }
          }
        ]
      };
    });

    // Register tool handlers
    server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'store_memory':
          return await storeMemoryTool(memoryService, args);
        case 'retrieve_memory':
          return await retrieveMemoryTool(memoryService, args);
        case 'search_memories':
          return await searchMemoriesTool(memoryService, args);
        case 'create_connection':
          return await createConnectionTool(memoryService, args);
        case 'get_related':
          return await getRelatedTool(memoryService, args);
        case 'merge_memories':
          return await mergeMemoriesTool(memoryService, args);
        case 'get_memory_stats':
          return await getMemoryStatsTool(memoryService, args);
        case 'create_concept':
          return await createConceptTool(memoryService, args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // Register resource templates
    server.setRequestHandler('resources/templates/list', async () => {
      return {
        resourceTemplates: [
          {
            uriTemplate: 'memory://memory/{id}',
            name: 'Memory by ID',
            description: 'Access a specific memory by its ID',
            mimeType: 'application/json'
          },
          {
            uriTemplate: 'memory://search/{query}',
            name: 'Memory Search',
            description: 'Search memories by query',
            mimeType: 'application/json'
          },
          {
            uriTemplate: 'memory://concept/{name}',
            name: 'Concept by Name',
            description: 'Access memories related to a specific concept',
            mimeType: 'application/json'
          },
          {
            uriTemplate: 'memory://stats',
            name: 'Memory Statistics',
            description: 'Get memory graph statistics',
            mimeType: 'application/json'
          }
        ]
      };
    });

    // Register resource handlers
    server.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;
      const url = new URL(uri);
      
      try {
        switch (url.hostname) {
          case 'memory': {
            const pathParts = url.pathname.split('/').filter(p => p);
            
            if (pathParts[0] === 'memory' && pathParts[1]) {
              // Get specific memory
              const memoryRecord = await database.getMemory(pathParts[1]);
              if (!memoryRecord) {
                throw new Error('Memory not found');
              }
              
              const concepts = await database.getMemoryConcepts(pathParts[1]);
              const memory = memoryService['convertToMemoryNode'](memoryRecord, concepts.map(c => ({
                id: c.id,
                name: c.name,
                description: c.description || undefined,
                type: c.type,
                confidence: c.confidence,
                extractedAt: c.extracted_at
              })));
              
              return {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(memory, null, 2)
                }]
              };
            }
            
            if (pathParts[0] === 'search' && pathParts[1]) {
              // Search memories
              const query = decodeURIComponent(pathParts[1]);
              const results = await memoryService.searchMemories({ query });
              
              return {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(results, null, 2)
                }]
              };
            }
            
            if (pathParts[0] === 'stats') {
              // Get statistics
              const stats = await memoryService.getMemoryStats();
              
              return {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(stats, null, 2)
                }]
              };
            }
            
            throw new Error('Invalid memory resource path');
          }
          
          default:
            throw new Error('Unknown resource scheme');
        }
      } catch (error) {
        throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Register prompts
    server.setRequestHandler('prompts/list', async () => {
      return {
        prompts: [
          {
            name: 'analyze_memory_patterns',
            description: 'Analyze patterns in stored memories to identify insights and relationships',
            arguments: [
              {
                name: 'user_id',
                description: 'User ID to analyze memories for',
                required: false
              },
              {
                name: 'time_range',
                description: 'Time range for analysis (e.g., "last_week", "last_month")',
                required: false
              }
            ]
          },
          {
            name: 'memory_summary',
            description: 'Generate a summary of memories related to a specific topic or concept',
            arguments: [
              {
                name: 'topic',
                description: 'Topic or concept to summarize memories for',
                required: true
              },
              {
                name: 'depth',
                description: 'Analysis depth (1-5, where 5 is most detailed)',
                required: false
              }
            ]
          }
        ]
      };
    });

    // Register prompt handlers
    server.setRequestHandler('prompts/get', async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'analyze_memory_patterns': {
          const stats = await memoryService.getMemoryStats();
          const prompt = `You are a memory pattern analyst. Analyze the following memory statistics and provide insights:

Memory Statistics:
- Total Memories: ${stats.totalMemories}
- Total Relationships: ${stats.totalRelationships}
- Total Concepts: ${stats.totalConcepts}
- Average Importance: ${stats.averageImportance}/5

${args?.user_id ? `Focus on patterns for user: ${args.user_id}` : 'Analyze patterns across all users'}
${args?.time_range ? `Time range: ${args.time_range}` : 'Consider all available data'}

Provide insights on:
1. Memory clustering and relationship patterns
2. Concept distribution and importance trends
3. User behavior patterns (if applicable)
4. Recommendations for memory organization
`;

          return {
            description: 'Memory pattern analysis prompt',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: prompt
                }
              }
            ]
          };
        }
        
        case 'memory_summary': {
          if (!args?.topic) {
            throw new Error('Topic argument is required for memory summary');
          }
          
          const searchResults = await memoryService.searchMemories({
            query: args.topic,
            limit: 20
          });
          
          const memoriesText = searchResults.memories.map(m => 
            `Memory ID: ${m.id}\nContent: ${m.content}\nConcepts: ${m.concepts.map(c => c.name).join(', ')}\nCreated: ${m.createdAt}\n`
          ).join('\n---\n\n');
          
          const depth = args?.depth || 3;
          const prompt = `You are a memory summarizer. Create a comprehensive summary of memories related to "${args.topic}".

Analysis Depth: ${depth}/5 (${depth <= 2 ? 'Brief' : depth <= 3 ? 'Moderate' : 'Detailed'})

Related Memories:
${memoriesText}

Please provide:
1. Key themes and patterns across these memories
2. Important concepts and their relationships
3. Timeline of developments (if applicable)
4. Insights and actionable takeaways
5. Connections to other potential topics

Format as a well-structured summary with clear sections.`;

          return {
            description: `Memory summary for topic: ${args.topic}`,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: prompt
                }
              }
            ]
          };
        }
        
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.log(`Memory Graph MCP Server started on port ${config.server.port}`);
    console.log('Server ready to handle MCP requests');

  } catch (error) {
    console.error('Failed to start Memory Graph MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Memory Graph MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Memory Graph MCP Server...');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}