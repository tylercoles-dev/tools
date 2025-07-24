import { MCPServer } from '@tylercoles/mcp-server';
import { KanbanService } from '@mcp-tools/core/kanban';
import { KanbanWebSocketServer } from '../websocket-server.js';
import { registerSearchCardsTool } from './analytics/search-cards.js';
import { registerGetStatsTool } from './analytics/get-stats.js';
import { registerCreateBoardTool, registerDeleteBoardTool, registerGetBoardsTool, registerGetBoardTool, registerUpdateBoardTool } from './board/board-tools.js';
import { registerCreateCardTool, registerDeleteCardTool, registerMoveCardTool, registerUpdateCardTool } from './card/card-tools.js';
import { registerCreateColumnTool, registerDeleteColumnTool, registerUpdateColumnTool } from './column/column-tools.js';
import { registerAddCommentTool, registerDeleteCommentTool, registerGetCommentsTool } from './comment/comment-tools.js';
import { registerAddCardTagTool, registerCreateTagTool, registerGetTagsTool, registerRemoveCardTagTool } from './tag/tag-tools.js';

export const registerTools = (server: MCPServer, kanbanService: KanbanService, wsServer: KanbanWebSocketServer) => {
  // Create a database adapter for legacy tools
  const db = createDatabaseAdapter(kanbanService);
  server.registerTool(registerGetStatsTool(db))
  server.registerTool(registerSearchCardsTool(db));

  server.registerTool(registerGetBoardsTool(db));
  server.registerTool(registerGetBoardTool(db));
  server.registerTool(registerCreateBoardTool(db, wsServer));
  server.registerTool(registerUpdateBoardTool(db));
  server.registerTool(registerDeleteBoardTool(db));

  server.registerTool(registerCreateCardTool(db, wsServer));
  server.registerTool(registerUpdateCardTool(db, wsServer));
  server.registerTool(registerMoveCardTool(db, wsServer));
  server.registerTool(registerDeleteCardTool(db, wsServer));

  server.registerTool(registerCreateColumnTool(db, wsServer));
  server.registerTool(registerUpdateColumnTool(db, wsServer));
  server.registerTool(registerDeleteColumnTool(db, wsServer));

  server.registerTool(registerAddCommentTool(db, wsServer));
  server.registerTool(registerGetCommentsTool(db, wsServer));
  server.registerTool(registerDeleteCommentTool(db, wsServer));

  server.registerTool(registerGetTagsTool(db, wsServer));
  server.registerTool(registerCreateTagTool(db, wsServer));
  server.registerTool(registerAddCardTagTool(db, wsServer));
  server.registerTool(registerRemoveCardTagTool(db, wsServer));
}

// Temporary adapter to make existing tools work with KanbanService
function createDatabaseAdapter(service: KanbanService): any {
  return {
    getBoards: () => service.getBoards(),
    getBoardById: (id: number) => service.getBoard(id),
    createBoard: (data: any) => service.createBoard(data),
    updateBoard: (id: number, data: any) => service.updateCard({ card_id: id, ...data }),
    deleteBoard: (id: number) => service.deleteCard(id),
    // Add more adapter methods as needed for cards, columns, etc.
    // For now, these will throw errors until properly implemented
    getColumnsByBoard: () => { throw new Error('Not implemented in service yet'); },
    getCardsByColumn: () => { throw new Error('Not implemented in service yet'); },
    getCardTags: () => { throw new Error('Not implemented in service yet'); },
    createCard: (data: any) => service.createCard(data),
    updateCard: (id: number, data: any) => service.updateCard({ card_id: id, ...data }),
    moveCard: (id: number, data: any) => service.moveCard({ card_id: id, ...data }),
    deleteCard: (id: number) => service.deleteCard(id),
    getCardById: () => { throw new Error('Not implemented in service yet'); },
    searchCards: (query: string) => service.searchCards({ query }),
    getRecentlyUpdatedCards: () => { throw new Error('Not implemented in service yet'); },
    getCardComments: () => { throw new Error('Not implemented in service yet'); },
    // Placeholder methods for other tools
    createColumn: () => { throw new Error('Not implemented in service yet'); },
    updateColumn: () => { throw new Error('Not implemented in service yet'); },
    deleteColumn: () => { throw new Error('Not implemented in service yet'); },
    getColumn: () => { throw new Error('Not implemented in service yet'); },
    addComment: () => { throw new Error('Not implemented in service yet'); },
    getComments: () => { throw new Error('Not implemented in service yet'); },
    deleteComment: () => { throw new Error('Not implemented in service yet'); },
    getTags: () => { throw new Error('Not implemented in service yet'); },
    createTag: () => { throw new Error('Not implemented in service yet'); },
    addCardTag: () => { throw new Error('Not implemented in service yet'); },
    removeCardTag: () => { throw new Error('Not implemented in service yet'); },
  };
}