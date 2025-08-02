import { ToolModule, ToolResult } from '@tylercoles/mcp-server';
import { z } from 'zod';
import {
  CreateCardLinkSchema,
  UpdateCardLinkWithIdSchema,
  CardLinkIdSchema,
  CardIdSchema,
  NotFoundError,
  ValidationError,
} from '../../types/index.js';
import { createErrorResult, createSuccessResult } from '@tylercoles/mcp-server/dist/tools.js';
import { KanbanDatabase } from '../../database/index.js';
import { KanbanWebSocketServer } from '../../websocket-server.js';

export const registerCreateCardLinkTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'create_card_link',
  config: {
    title: 'Create Card Link',
    description: 'Create a link between two cards. Link types: blocks, relates_to, duplicate, parent_child',
    inputSchema: CreateCardLinkSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = CreateCardLinkSchema.parse(args);

      // Validate both cards exist
      const sourceCard = await db.getCardById(input.source_card_id);
      if (!sourceCard) {
        throw new NotFoundError('Source Card', input.source_card_id);
      }

      const targetCard = await db.getCardById(input.target_card_id);
      if (!targetCard) {
        throw new NotFoundError('Target Card', input.target_card_id);
      }

      // Prevent self-linking
      if (input.source_card_id === input.target_card_id) {
        throw new ValidationError('A card cannot be linked to itself');
      }

      // Check if link already exists
      const existingLink = await db.getCardLink(input.source_card_id, input.target_card_id, input.link_type);
      if (existingLink) {
        throw new ValidationError(`Link of type "${input.link_type}" already exists between these cards`);
      }

      const cardLink = await db.createCardLink({
        source_card_id: input.source_card_id,
        target_card_id: input.target_card_id,
        link_type: input.link_type,
        description: input.description || null,
        created_by: input.created_by || null,
      });

      // Broadcast to WebSocket clients for both boards (if different)
      if (wsServer) {
        console.log(`MCP Tool: Broadcasting card_link_created between cards ${input.source_card_id} and ${input.target_card_id}`);
        wsServer.broadcastToBoardClients(sourceCard.board_id, 'card_link_created', cardLink);
        
        if (targetCard.board_id !== sourceCard.board_id) {
          wsServer.broadcastToBoardClients(targetCard.board_id, 'card_link_created', cardLink);
        }
      }

      return createSuccessResult(
        `✅ Successfully created ${input.link_type} link from "${sourceCard.title}" to "${targetCard.title}" (ID: ${cardLink.id})`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerUpdateCardLinkTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'update_card_link',
  config: {
    title: 'Update Card Link',
    description: 'Update an existing card link',
    inputSchema: UpdateCardLinkWithIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { link_id, ...updates } = args;
      
      // Get existing link to validate and get card info
      const existingLink = await db.getCardLinkById(link_id);
      if (!existingLink) {
        throw new NotFoundError('Card Link', link_id);
      }

      const cardLink = await db.updateCardLink(link_id, updates);
      if (!cardLink) {
        throw new NotFoundError('Card Link', link_id);
      }

      // Get card info for WebSocket broadcast
      const sourceCard = await db.getCardById(cardLink.source_card_id);
      const targetCard = await db.getCardById(cardLink.target_card_id);
      
      if (wsServer && sourceCard && targetCard) {
        wsServer.broadcastToBoardClients(sourceCard.board_id, 'card_link_updated', cardLink);
        
        if (targetCard.board_id !== sourceCard.board_id) {
          wsServer.broadcastToBoardClients(targetCard.board_id, 'card_link_updated', cardLink);
        }
      }

      return createSuccessResult(`✅ Successfully updated card link (ID: ${cardLink.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerDeleteCardLinkTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'delete_card_link',
  config: {
    title: 'Delete Card Link',
    description: 'Delete a card link',
    inputSchema: CardLinkIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { link_id } = args;
      
      // Get the link first to get card info for WebSocket broadcast
      const cardLink = await db.getCardLinkById(link_id);
      if (!cardLink) {
        throw new NotFoundError('Card Link', link_id);
      }

      const deleted = await db.deleteCardLink(link_id);
      if (!deleted) {
        throw new NotFoundError('Card Link', link_id);
      }

      // Get card info for WebSocket broadcast
      const sourceCard = await db.getCardById(cardLink.source_card_id);
      const targetCard = await db.getCardById(cardLink.target_card_id);
      
      if (wsServer && sourceCard && targetCard) {
        wsServer.broadcastToBoardClients(sourceCard.board_id, 'card_link_deleted', { id: link_id });
        
        if (targetCard.board_id !== sourceCard.board_id) {
          wsServer.broadcastToBoardClients(targetCard.board_id, 'card_link_deleted', { id: link_id });
        }
      }

      return createSuccessResult(`✅ Successfully deleted card link (ID: ${link_id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetCardLinksTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_card_links',
  config: {
    title: 'Get Card Links',
    description: 'Get all links for a card (both incoming and outgoing)',
    inputSchema: CardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { card_id } = args;
      const links = await db.getCardLinks(card_id);

      return createSuccessResult(`Found ${links.length} links for card ${card_id}`, links);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetLinkedCardsTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_linked_cards',
  config: {
    title: 'Get Linked Cards',
    description: 'Get all cards linked to a specific card with link details',
    inputSchema: CardIdSchema.extend({
      link_type: z.enum(['blocks', 'relates_to', 'duplicate', 'parent_child']).optional(),
      direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
    }),
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { card_id, link_type, direction } = args;
      const linkedCards = await db.getLinkedCards(card_id, link_type, direction);

      const filterText = link_type ? ` with link type "${link_type}"` : '';
      const directionText = direction === 'both' ? '' : ` (${direction} links only)`;
      
      return createSuccessResult(
        `Found ${linkedCards.length} linked cards for card ${card_id}${filterText}${directionText}`,
        linkedCards
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerCheckCardBlockedTool = (db: KanbanDatabase): ToolModule => ({
  name: 'check_card_blocked',
  config: {
    title: 'Check Card Blocked',
    description: 'Check if a card is blocked by other cards and get the blocking cards',
    inputSchema: CardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { card_id } = args;
      const blockingCards = await db.getBlockingCards(card_id);

      if (blockingCards.length === 0) {
        return createSuccessResult(`Card ${card_id} is not blocked by any other cards`, { blocked: false, blocking_cards: [] });
      }

      return createSuccessResult(
        `Card ${card_id} is blocked by ${blockingCards.length} card(s)`,
        { blocked: true, blocking_cards: blockingCards }
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetCardDependenciesTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_card_dependencies',
  config: {
    title: 'Get Card Dependencies',
    description: 'Get a hierarchical view of card dependencies (parent-child relationships)',
    inputSchema: CardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { card_id } = args;
      const dependencies = await db.getCardDependencies(card_id);

      return createSuccessResult(
        `Retrieved dependency tree for card ${card_id}`,
        dependencies
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});