#!/usr/bin/env node

import { MCPServer, LogLevel } from '@tylercoles/mcp-server';
import { HttpTransport } from '@tylercoles/mcp-transport-http';
import { KanbanService, KanbanDatabase } from '@mcp-tools/core/kanban';
import { registerTools } from './tools/index.js';
import { KanbanWebSocketServer } from './websocket-server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const config = {
  port: parseInt(process.env.PORT || '8193'),
  wsPort: parseInt(process.env.WS_PORT || '8194'),
  host: process.env.HOST || 'localhost',
  database: {
    type: (process.env.DB_TYPE as 'sqlite' | 'postgres') || 'sqlite',
    file: process.env.DB_FILE || path.join(__dirname, '../kanban.db'),
    connectionString: process.env.DATABASE_URL,
    config: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }
  },
};

async function createKanbanServer() {
  // Initialize kanban database and service
  console.log('🔧 Initializing kanban database...');
  const kanbanDatabase = new KanbanDatabase(config.database);
  await kanbanDatabase.initialize();
  console.log('✅ Kanban database initialized');

  console.log('🔧 Initializing kanban service...');
  const kanbanService = new KanbanService(kanbanDatabase);
  console.log('✅ Kanban service initialized');

  // Create MCP server with logging configuration
  const server = new MCPServer({
    name: 'kanban-board',
    version: '1.0.0',
    capabilities: {
      logging: {
        supportedLevels: ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'],
        supportsStructuredLogs: true,
        supportsLoggerNamespaces: true
      }
    },
    logging: {
      level: LogLevel.Info, // Info level - reduces noise while keeping important messages
      structured: false, // Disable structured logging to avoid notification failures
      includeTimestamp: true,
      includeSource: false,
      maxMessageLength: 8192
    }
  });

  // Setup WebSocket server first
  const wsServer = new KanbanWebSocketServer(config.wsPort, kanbanService);

  // Setup tools with WebSocket server reference
  registerTools(server, kanbanService, wsServer);

  // Add resources for board data access
  server.registerResource('all-boards', 'kanban://boards', {
    title: 'All Boards',
    description: 'List of all kanban boards',
    mimeType: 'application/json',
  }, async () => {
    const boards = await kanbanService.getBoards();
    return {
      contents: [{
        uri: 'kanban://boards',
        mimeType: 'application/json',
        text: JSON.stringify(boards, null, 2),
      }]
    };
  });

  server.registerResourceTemplate('board-details', 'kanban://board/{board_id}', {
    title: 'Board Details',
    description: 'Detailed information about a specific board',
    mimeType: 'application/json',
  }, async (uri: any) => {
    const uriString = typeof uri === 'string' ? uri : uri.toString();
    const match = uriString.match(/kanban:\/\/board\/(\d+)/);
    if (!match) {
      throw new Error('Invalid board URI format');
    }

    const boardId = parseInt(match[1]);
    const board = await kanbanService.getBoard(boardId);
    if (!board) {
      throw new Error(`Board ${boardId} not found`);
    }
    
    const boardData = board;

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(boardData, null, 2),
      }]
    };
  });

  server.registerResource('kanban-stats', 'kanban://stats', {
    title: 'Kanban Statistics',
    description: 'Analytics and statistics for the kanban system',
    mimeType: 'application/json',
  }, async () => {
    const stats = await kanbanService.getStats();

    return {
      contents: [{
        uri: 'kanban://stats',
        mimeType: 'application/json',
        text: JSON.stringify(stats, null, 2),
      }]
    };
  });

  // Individual card details resource
  server.registerResourceTemplate('card-details', 'kanban://card/{card_id}', {
    title: 'Card Details',
    description: 'Detailed information about a specific card including comments',
    mimeType: 'application/json',
  }, async (uri: any) => {
    const uriString = typeof uri === 'string' ? uri : uri.toString();
    const match = uriString.match(/kanban:\/\/card\/(\d+)/);
    if (!match) {
      throw new Error('Invalid card URI format');
    }

    const cardId = parseInt(match[1]);
    const cardData = await kanbanService.getCardDetails(cardId);
    if (!cardData) {
      throw new Error(`Card ${cardId} not found`);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(cardData, null, 2),
      }]
    };
  });

  // Search results resource
  server.registerResourceTemplate('search-results', 'kanban://search/{query}', {
    title: 'Search Results',
    description: 'Cards matching a search query',
    mimeType: 'application/json',
  }, async (uri: any) => {
    const uriString = typeof uri === 'string' ? uri : uri.toString();
    const match = uriString.match(/kanban:\/\/search\/(.+)/);
    if (!match) {
      throw new Error('Invalid search URI format');
    }

    const query = decodeURIComponent(match[1]);
    const searchResults = await kanbanService.searchCards({ query });

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(searchResults, null, 2),
      }]
    };
  });

  // Recent activity resource
  server.registerResource('recent-activity', 'kanban://activity', {
    title: 'Recent Activity',
    description: 'Recent changes and activities across all boards',
    mimeType: 'application/json',
  }, async () => {
    const activityData = await kanbanService.getRecentActivity(50);

    return {
      contents: [{
        uri: 'kanban://activity',
        mimeType: 'application/json',
        text: JSON.stringify(activityData, null, 2),
      }]
    };
  });

  // Add prompts for common workflows
  server.registerPrompt('create_project_board', {
    title: 'Create Project Board',
    description: 'Create a new project board with standard columns',
    argsSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Name of the project'
        },
        description: {
          type: 'string',
          description: 'Project description'
        }
      },
      required: ['project_name']
    },
  }, (args: any) => {
    const { project_name, description } = args;
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please create a new kanban board for the project "${project_name}"${description ? ` with description: ${description}` : ''}. After creating the board, add the standard columns: "To Do", "In Progress", "Review", and "Done". Use appropriate colors for each column.`,
          },
        },
      ],
    };
  });

  server.registerPrompt('daily_standup', {
    title: 'Daily Standup Report',
    description: 'Generate a daily standup report for a board',
    argsSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'ID of the board to report on'
        }
      },
      required: ['board_id']
    },
  }, (args: any) => {
    const { board_id } = args;
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Generate a daily standup report for board ${board_id}. Include:
1. Cards completed yesterday (moved to "Done" column)
2. Cards in progress today ("In Progress" column)
3. Any blocked or overdue cards
4. Summary of team workload and priorities

Please use the get_board tool to fetch the current board state and analyze the data.`,
          },
        },
      ],
    };
  });

  server.registerPrompt('sprint_planning', {
    title: 'Sprint Planning Assistant',
    description: 'Help with sprint planning based on board state',
    argsSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'ID of the board for sprint planning'
        },
        sprint_capacity: {
          type: 'string',
          description: 'Team capacity for the sprint (story points or hours)'
        }
      },
      required: ['board_id']
    },
  }, (args: any) => {
    const { board_id, sprint_capacity } = args;
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Help me plan the next sprint for board ${board_id}. Please:
1. Get the current board state and analyze the backlog
2. Suggest which cards should be prioritized based on priority levels and due dates
3. Identify any dependencies or blockers
4. ${sprint_capacity ? `Recommend cards that fit within the ${sprint_capacity} capacity` : 'Suggest a reasonable sprint scope'}
5. Highlight any cards that need more detail or clarification

Use the kanban tools to analyze the current state and provide recommendations.`,
          },
        },
      ],
    };
  });

  // Setup HTTP transport
  const httpTransport = new HttpTransport({
    port: config.port,
    host: config.host,
    // enableJsonResponse is false by default, enabling SSE streaming
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'], // React dev servers
      credentials: true,
    },
  });

  server.useTransport(httpTransport);

  // Wait for the transport to start before adding static file routes
  await server.start();
  
  // Serve static frontend files
  const frontendPath = path.join(__dirname, 'frontend');
  const app = httpTransport.getApp();
  if (app) {
    // Import express here to avoid circular dependency
    const express = await import('express');
    const { Router } = express.default;
    
    // Create a router for static files
    const staticRouter = Router();
    
    // Serve static files from the frontend build
    staticRouter.use(express.default.static(frontendPath));
    
    // Fallback to index.html for client-side routing
    staticRouter.get('*', (req: any, res: any) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
    
    // Register the static router at root path
    httpTransport.registerRouter('/', staticRouter, false);
  }

  // Setup graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down server...');
    wsServer.close();
    await kanbanDatabase.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { server, kanbanService, kanbanDatabase, wsServer };
}

async function main() {
  try {
    console.log('🚀 Starting Kanban Board MCP Server...');
    console.log(`📊 Database: ${config.database.type}`);
    console.log(`🌐 HTTP Server: http://${config.host}:${config.port}`);
    console.log(`🔌 WebSocket Server: ws://${config.host}:${config.wsPort}`);

    const { server, kanbanService, kanbanDatabase, wsServer } = await createKanbanServer();

    console.log('✅ Kanban Board MCP Server is running!');
    console.log('\n📚 Available endpoints:');
    console.log(`   • MCP HTTP: http://${config.host}:${config.port}/mcp`);
    console.log(`   • WebSocket: ws://${config.host}:${config.wsPort}`);
    console.log(`   • Health: http://${config.host}:${config.port}/health`);
    console.log(`   • Frontend: http://${config.host}:${config.port}/`);
    console.log('\n🛠️  Available tools:');
    console.log('   • Board management: get_boards, create_board, update_board, delete_board');
    console.log('   • Column management: create_column, update_column, delete_column');
    console.log('   • Card management: create_card, update_card, move_card, delete_card');
    console.log('   • Tags & comments: create_tag, add_card_tag, add_comment');
    console.log('   • Analytics: get_stats, search_cards');
    console.log('\n📋 Available prompts:');
    console.log('   • create_project_board - Set up a new project with standard columns');
    console.log('   • daily_standup - Generate daily standup reports');
    console.log('   • sprint_planning - Sprint planning assistance');
    console.log('\n📚 Available resources:');
    console.log('   • kanban://boards - List all boards');
    console.log('   • kanban://board/{id} - Detailed board data');
    console.log('   • kanban://stats - System statistics');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}
console.log(import.meta.url)

main();