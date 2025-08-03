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

// New feature tools
import { 
  registerCreateCustomFieldTool, 
  registerUpdateCustomFieldTool, 
  registerDeleteCustomFieldTool, 
  registerGetCustomFieldsTool,
  registerSetCustomFieldValueTool,
  registerGetCustomFieldValuesTool 
} from './custom-field/custom-field-tools.js';

import { 
  registerCreateMilestoneTool, 
  registerUpdateMilestoneTool, 
  registerCompleteMilestoneTool,
  registerDeleteMilestoneTool,
  registerGetMilestonesTool,
  registerAssignCardToMilestoneTool,
  registerUnassignCardFromMilestoneTool,
  registerGetMilestoneProgressTool
} from './milestone/milestone-tools.js';

import { 
  registerCreateSubtaskTool, 
  registerUpdateSubtaskTool, 
  registerCompleteSubtaskTool,
  registerDeleteSubtaskTool,
  registerGetSubtasksTool,
  registerMoveSubtaskTool,
  registerGetSubtaskProgressTool
} from './subtask/subtask-tools.js';

import { 
  registerCreateCardLinkTool, 
  registerUpdateCardLinkTool, 
  registerDeleteCardLinkTool,
  registerGetCardLinksTool,
  registerGetLinkedCardsTool,
  registerCheckCardBlockedTool,
  registerGetCardDependenciesTool
} from './card-link/card-link-tools.js';

import { 
  registerCreateTimeEntryTool, 
  registerUpdateTimeEntryTool, 
  registerDeleteTimeEntryTool,
  registerStartTimeTrackingTool,
  registerStopTimeTrackingTool,
  registerGetTimeEntriesForCardTool,
  registerUpdateCardTimeEstimateTool,
  registerGetActiveTimeEntresTool,
  registerGetTimeReportTool
} from './time-tracking/time-tracking-tools.js';

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

  // Custom Fields tools
  server.registerTool(registerCreateCustomFieldTool(db, wsServer));
  server.registerTool(registerUpdateCustomFieldTool(db, wsServer));
  server.registerTool(registerDeleteCustomFieldTool(db, wsServer));
  server.registerTool(registerGetCustomFieldsTool(db));
  server.registerTool(registerSetCustomFieldValueTool(db, wsServer));
  server.registerTool(registerGetCustomFieldValuesTool(db));

  // Milestones tools
  server.registerTool(registerCreateMilestoneTool(db, wsServer));
  server.registerTool(registerUpdateMilestoneTool(db, wsServer));
  server.registerTool(registerCompleteMilestoneTool(db, wsServer));
  server.registerTool(registerDeleteMilestoneTool(db, wsServer));
  server.registerTool(registerGetMilestonesTool(db));
  server.registerTool(registerAssignCardToMilestoneTool(db, wsServer));
  server.registerTool(registerUnassignCardFromMilestoneTool(db, wsServer));
  server.registerTool(registerGetMilestoneProgressTool(db));

  // Subtasks tools
  server.registerTool(registerCreateSubtaskTool(db, wsServer));
  server.registerTool(registerUpdateSubtaskTool(db, wsServer));
  server.registerTool(registerCompleteSubtaskTool(db, wsServer));
  server.registerTool(registerDeleteSubtaskTool(db, wsServer));
  server.registerTool(registerGetSubtasksTool(db));
  server.registerTool(registerMoveSubtaskTool(db, wsServer));
  server.registerTool(registerGetSubtaskProgressTool(db));

  // Card Links tools
  server.registerTool(registerCreateCardLinkTool(db, wsServer));
  server.registerTool(registerUpdateCardLinkTool(db, wsServer));
  server.registerTool(registerDeleteCardLinkTool(db, wsServer));
  server.registerTool(registerGetCardLinksTool(db));
  server.registerTool(registerGetLinkedCardsTool(db));
  server.registerTool(registerCheckCardBlockedTool(db));
  server.registerTool(registerGetCardDependenciesTool(db));

  // Time Tracking tools
  server.registerTool(registerCreateTimeEntryTool(db, wsServer));
  server.registerTool(registerUpdateTimeEntryTool(db, wsServer));
  server.registerTool(registerDeleteTimeEntryTool(db, wsServer));
  server.registerTool(registerStartTimeTrackingTool(db, wsServer));
  server.registerTool(registerStopTimeTrackingTool(db, wsServer));
  server.registerTool(registerGetTimeEntriesForCardTool(db));
  server.registerTool(registerUpdateCardTimeEstimateTool(db, wsServer));
  server.registerTool(registerGetActiveTimeEntresTool(db));
  server.registerTool(registerGetTimeReportTool(db));
}

// Temporary adapter to make existing tools work with KanbanService
function createDatabaseAdapter(service: KanbanService): any {
  return {
    getBoards: () => service.getAllBoards(),
    getBoardById: (id: number) => service.getBoardById(id),
    createBoard: (data: any) => service.createBoard(data),
    updateBoard: (id: number, data: any) => service.updateBoard(id, data),
    deleteBoard: (id: number) => service.deleteBoard(id),
    // Add more adapter methods as needed for cards, columns, etc.
    // For now, these will throw errors until properly implemented
    getColumnsByBoard: () => { throw new Error('Not implemented in service yet'); },
    getCardsByColumn: () => { throw new Error('Not implemented in service yet'); },
    getCardTags: () => { throw new Error('Not implemented in service yet'); },
    createCard: (data: any) => service.createCard(data),
    updateCard: (id: number, data: any) => service.updateCard(id, data),
    moveCard: (id: number, data: any) => service.moveCard(id, data),
    deleteCard: (id: number) => service.deleteCard(id),
    getCardById: (id: number) => service.getCardById(id),
    searchCards: (query: string) => service.searchCards({ query }),
    getRecentlyUpdatedCards: () => { throw new Error('Not implemented in service yet'); },
    getCardComments: (cardId: number) => service.getCardComments(cardId),
    // Placeholder methods for other tools
    createColumn: (data: any) => service.createColumn(data),
    updateColumn: (id: number, data: any) => service.updateColumn(id, data),
    deleteColumn: (id: number) => service.deleteColumn(id),
    getColumn: () => { throw new Error('Not implemented in service yet'); },
    addComment: (data: any) => service.addComment(data),
    getComments: (cardId: number) => service.getCardComments(cardId),
    deleteComment: (id: number) => service.deleteComment(id),
    getTags: () => service.getAllTags(),
    createTag: (data: any) => service.createTag(data),
    addCardTag: (cardId: number, tagId: number) => service.addCardTag(cardId, tagId),
    removeCardTag: (cardId: number, tagId: number) => service.removeCardTag(cardId, tagId),
    
    // Custom Fields methods
    createCustomField: () => { throw new Error('Not implemented in service yet'); },
    updateCustomField: () => { throw new Error('Not implemented in service yet'); },
    deleteCustomField: () => { throw new Error('Not implemented in service yet'); },
    getCustomFieldById: () => { throw new Error('Not implemented in service yet'); },
    getCustomFieldsByBoard: () => { throw new Error('Not implemented in service yet'); },
    setCustomFieldValue: () => { throw new Error('Not implemented in service yet'); },
    getCustomFieldValuesByCard: () => { throw new Error('Not implemented in service yet'); },
    
    // Milestones methods
    createMilestone: () => { throw new Error('Not implemented in service yet'); },
    updateMilestone: () => { throw new Error('Not implemented in service yet'); },
    deleteMilestone: () => { throw new Error('Not implemented in service yet'); },
    getMilestoneById: () => { throw new Error('Not implemented in service yet'); },
    getMilestonesByBoard: () => { throw new Error('Not implemented in service yet'); },
    assignCardToMilestone: () => { throw new Error('Not implemented in service yet'); },
    unassignCardFromMilestone: () => { throw new Error('Not implemented in service yet'); },
    getMilestoneProgress: () => { throw new Error('Not implemented in service yet'); },
    
    // Subtasks methods
    createSubtask: () => { throw new Error('Not implemented in service yet'); },
    updateSubtask: () => { throw new Error('Not implemented in service yet'); },
    deleteSubtask: () => { throw new Error('Not implemented in service yet'); },
    getSubtaskById: () => { throw new Error('Not implemented in service yet'); },
    getSubtasksByCard: () => { throw new Error('Not implemented in service yet'); },
    getSubtaskProgress: () => { throw new Error('Not implemented in service yet'); },
    
    // Card Links methods
    createCardLink: () => { throw new Error('Not implemented in service yet'); },
    updateCardLink: () => { throw new Error('Not implemented in service yet'); },
    deleteCardLink: () => { throw new Error('Not implemented in service yet'); },
    getCardLinkById: () => { throw new Error('Not implemented in service yet'); },
    getCardLink: () => { throw new Error('Not implemented in service yet'); },
    getCardLinks: () => { throw new Error('Not implemented in service yet'); },
    getLinkedCards: () => { throw new Error('Not implemented in service yet'); },
    getBlockingCards: () => { throw new Error('Not implemented in service yet'); },
    getCardDependencies: () => { throw new Error('Not implemented in service yet'); },
    
    // Time Tracking methods
    createTimeEntry: () => { throw new Error('Not implemented in service yet'); },
    updateTimeEntry: () => { throw new Error('Not implemented in service yet'); },
    deleteTimeEntry: () => { throw new Error('Not implemented in service yet'); },
    getTimeEntryById: () => { throw new Error('Not implemented in service yet'); },
    getTimeEntriesByCard: () => { throw new Error('Not implemented in service yet'); },
    getActiveTimeEntry: () => { throw new Error('Not implemented in service yet'); },
    getActiveTimeEntries: () => { throw new Error('Not implemented in service yet'); },
    updateCardActualHours: () => { throw new Error('Not implemented in service yet'); },
    getTimeReport: () => { throw new Error('Not implemented in service yet'); },
  };
}