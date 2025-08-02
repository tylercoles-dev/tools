/**
 * Unit Tests for Card Links MCP Tools
 * Tests all 7 card linking tools with comprehensive scenarios
 */

import { KanbanService } from '@mcp-tools/core/kanban';
import { 
  registerCreateCardLinkTool,
  registerUpdateCardLinkTool,
  registerDeleteCardLinkTool,
  registerGetCardLinksTool,
  registerGetLinkedCardsTool,
  registerCheckCardBlockedTool,
  registerGetCardDependenciesTool
} from '../../../servers/kanban/src/tools/card-link/card-link-tools';

describe('Card Links MCP Tools', () => {
  let mockKanbanService: jest.Mocked<KanbanService>;
  let mockWsServer: any;
  let mockDb: any;

  beforeEach(() => {
    mockKanbanService = {
      createCardLink: jest.fn(),
      updateCardLink: jest.fn(),
      deleteCardLink: jest.fn(),
      getCardLinks: jest.fn(),
      getLinkedCards: jest.fn(),
      checkCardBlocked: jest.fn(),
      getCardDependencies: jest.fn(),
    } as any;

    mockWsServer = {
      broadcast: jest.fn(),
      broadcastToBoard: jest.fn(),
    };

    mockDb = {
      createCardLink: jest.fn(),
      updateCardLink: jest.fn(),
      deleteCardLink: jest.fn(),
      getCardLinkById: jest.fn(),
      getCardLink: jest.fn(),
      getCardLinks: jest.fn(),
      getLinkedCards: jest.fn(),
      getBlockingCards: jest.fn(),
      getCardDependencies: jest.fn(),
      getCardById: jest.fn(),
    };
  });

  describe('Create Card Link Tool', () => {
    it('should create blocking relationship successfully', async () => {
      const sourceCard = { id: 1, board_id: 1, title: 'Frontend Implementation' };
      const targetCard = { id: 2, board_id: 1, title: 'API Development' };
      
      const mockLink = {
        id: 1,
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks',
        description: 'Frontend depends on API completion',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDb.getCardById
        .mockResolvedValueOnce(sourceCard)
        .mockResolvedValueOnce(targetCard);
      mockDb.getCardLink.mockResolvedValue(null); // No existing link
      mockDb.createCardLink.mockResolvedValue(mockLink);
      const tool = registerCreateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks',
        description: 'Frontend depends on API completion'
      });

      expect(mockDb.createCardLink).toHaveBeenCalledWith({
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks',
        description: 'Frontend depends on API completion'
      });
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'cardLinkCreated', mockLink);
      expect(result).toEqual({
        success: true,
        data: mockLink
      });
    });

    it('should create all supported link types', async () => {
      const card1 = { id: 1, board_id: 1 };
      const card2 = { id: 2, board_id: 1 };
      const linkTypes = ['blocks', 'relates_to', 'duplicate', 'parent_child'];

      mockDb.getCardById
        .mockResolvedValue(card1)
        .mockResolvedValue(card2);
      mockDb.getCardLink.mockResolvedValue(null);

      const tool = registerCreateCardLinkTool(mockDb, mockWsServer);

      for (const linkType of linkTypes) {
        const mockLink = { 
          id: Math.random(), 
          source_card_id: 1, 
          target_card_id: 2, 
          link_type: linkType 
        };
        mockDb.createCardLink.mockResolvedValue(mockLink);

        const result = await tool.handler({
          source_card_id: 1,
          target_card_id: 2,
          link_type: linkType as any
        });

        expect(result.success).toBe(true);
      }
    });

    it('should prevent self-linking', async () => {
      const tool = registerCreateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        source_card_id: 1,
        target_card_id: 1,
        link_type: 'blocks'
      });

      expect(result).toEqual({
        success: false,
        error: 'Cannot link card to itself'
      });
    });

    it('should handle cards on different boards', async () => {
      const card1 = { id: 1, board_id: 1 };
      const card2 = { id: 2, board_id: 2 }; // Different board

      mockDb.getCardById
        .mockResolvedValueOnce(card1)
        .mockResolvedValueOnce(card2);
      const tool = registerCreateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks'
      });

      expect(result).toEqual({
        success: false,
        error: 'Cards must be on the same board'
      });
    });

    it('should prevent duplicate links', async () => {
      const card1 = { id: 1, board_id: 1 };
      const card2 = { id: 2, board_id: 1 };
      const existingLink = { 
        id: 1, 
        source_card_id: 1, 
        target_card_id: 2, 
        link_type: 'blocks' 
      };

      mockDb.getCardById
        .mockResolvedValueOnce(card1)
        .mockResolvedValueOnce(card2);
      mockDb.getCardLink.mockResolvedValue(existingLink);
      const tool = registerCreateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks'
      });

      expect(result).toEqual({
        success: false,
        error: 'Link already exists between these cards'
      });
    });

    it('should handle source card not found', async () => {
      mockDb.getCardById.mockResolvedValueOnce(null);
      const tool = registerCreateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        source_card_id: 999,
        target_card_id: 2,
        link_type: 'blocks'
      });

      expect(result).toEqual({
        success: false,
        error: 'Source card not found'
      });
    });

    it('should handle target card not found', async () => {
      const card1 = { id: 1, board_id: 1 };
      mockDb.getCardById
        .mockResolvedValueOnce(card1)
        .mockResolvedValueOnce(null);
      const tool = registerCreateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        source_card_id: 1,
        target_card_id: 999,
        link_type: 'blocks'
      });

      expect(result).toEqual({
        success: false,
        error: 'Target card not found'
      });
    });
  });

  describe('Update Card Link Tool', () => {
    it('should update link description successfully', async () => {
      const originalLink = {
        id: 1,
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks',
        description: 'Original description'
      };

      const updatedLink = {
        ...originalLink,
        description: 'Updated description',
        updated_at: new Date().toISOString()
      };

      const sourceCard = { id: 1, board_id: 1 };
      mockDb.getCardLinkById.mockResolvedValue(originalLink);
      mockDb.getCardById.mockResolvedValue(sourceCard);
      mockDb.updateCardLink.mockResolvedValue(updatedLink);
      const tool = registerUpdateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        link_id: 1,
        description: 'Updated description'
      });

      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'cardLinkUpdated', updatedLink);
    });

    it('should update link type', async () => {
      const originalLink = {
        id: 1,
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'relates_to'
      };

      const sourceCard = { id: 1, board_id: 1 };
      mockDb.getCardLinkById.mockResolvedValue(originalLink);
      mockDb.getCardById.mockResolvedValue(sourceCard);
      mockDb.updateCardLink.mockResolvedValue({ ...originalLink, link_type: 'blocks' });
      const tool = registerUpdateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        link_id: 1,
        link_type: 'blocks'
      });

      expect(result.success).toBe(true);
    });

    it('should handle link not found', async () => {
      mockDb.getCardLinkById.mockResolvedValue(null);
      const tool = registerUpdateCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({
        link_id: 999,
        description: 'Updated description'
      });

      expect(result).toEqual({
        success: false,
        error: 'Card link not found'
      });
    });
  });

  describe('Delete Card Link Tool', () => {
    it('should delete link successfully', async () => {
      const link = {
        id: 1,
        source_card_id: 1,
        target_card_id: 2
      };
      const sourceCard = { id: 1, board_id: 1 };

      mockDb.getCardLinkById.mockResolvedValue(link);
      mockDb.getCardById.mockResolvedValue(sourceCard);
      mockDb.deleteCardLink.mockResolvedValue(true);
      const tool = registerDeleteCardLinkTool(mockDb, mockWsServer);

      const result = await tool.handler({ link_id: 1 });

      expect(mockDb.deleteCardLink).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'cardLinkDeleted', { 
        link_id: 1, 
        source_card_id: 1, 
        target_card_id: 2 
      });
    });
  });

  describe('Get Card Links Tool', () => {
    it('should return all links for a card', async () => {
      const mockLinks = [
        {
          id: 1,
          source_card_id: 1,
          target_card_id: 2,
          link_type: 'blocks',
          target_card_title: 'API Development',
          direction: 'outgoing'
        },
        {
          id: 2,
          source_card_id: 3,
          target_card_id: 1,
          link_type: 'relates_to',
          source_card_title: 'Database Design',
          direction: 'incoming'
        }
      ];

      mockDb.getCardLinks.mockResolvedValue(mockLinks);
      const tool = registerGetCardLinksTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: mockLinks
      });
    });

    it('should filter links by type', async () => {
      const blockingLinks = [
        { id: 1, link_type: 'blocks', target_card_title: 'API Development' }
      ];

      mockDb.getCardLinks.mockResolvedValue(blockingLinks);
      const tool = registerGetCardLinksTool(mockDb);

      const result = await tool.handler({
        card_id: 1,
        link_type: 'blocks'
      });

      expect(mockDb.getCardLinks).toHaveBeenCalledWith(1, 'blocks');
      expect(result.success).toBe(true);
    });

    it('should return empty array for card with no links', async () => {
      mockDb.getCardLinks.mockResolvedValue([]);
      const tool = registerGetCardLinksTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: []
      });
    });
  });

  describe('Get Linked Cards Tool', () => {
    it('should return linked cards with relationship info', async () => {
      const mockLinkedCards = [
        {
          card_id: 2,
          title: 'API Development',
          status: 'in_progress',
          link_type: 'blocks',
          link_direction: 'outgoing',
          link_description: 'Frontend depends on API'
        },
        {
          card_id: 3,
          title: 'Database Design',
          status: 'completed',
          link_type: 'relates_to',
          link_direction: 'incoming',
          link_description: null
        }
      ];

      mockDb.getLinkedCards.mockResolvedValue(mockLinkedCards);
      const tool = registerGetLinkedCardsTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: mockLinkedCards
      });
    });

    it('should include board information for cross-board links', async () => {
      const crossBoardLinks = [
        {
          card_id: 5,
          title: 'External API Integration',
          board_id: 2,
          board_title: 'Integration Project',
          link_type: 'relates_to'
        }
      ];

      mockDb.getLinkedCards.mockResolvedValue(crossBoardLinks);
      const tool = registerGetLinkedCardsTool(mockDb);

      const result = await tool.handler({
        card_id: 1,
        include_cross_board: true
      });

      expect(result.success).toBe(true);
      expect(result.data[0]).toHaveProperty('board_title');
    });
  });

  describe('Check Card Blocked Tool', () => {
    it('should identify blocking cards', async () => {
      const blockingInfo = {
        is_blocked: true,
        blocking_cards: [
          {
            card_id: 2,
            title: 'API Development',
            status: 'in_progress',
            link_description: 'Frontend depends on API completion'
          },
          {
            card_id: 3,
            title: 'Database Migration',
            status: 'todo',
            link_description: 'Data structure needed'
          }
        ],
        blocking_count: 2,
        can_start: false,
        blocking_reasons: [
          'Waiting for API Development to complete',
          'Database Migration must be finished first'
        ]
      };

      mockDb.getBlockingCards.mockResolvedValue(blockingInfo);
      const tool = registerCheckCardBlockedTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: blockingInfo
      });
    });

    it('should handle card not blocked', async () => {
      const notBlockedInfo = {
        is_blocked: false,
        blocking_cards: [],
        blocking_count: 0,
        can_start: true,
        blocking_reasons: []
      };

      mockDb.getBlockingCards.mockResolvedValue(notBlockedInfo);
      const tool = registerCheckCardBlockedTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result.success).toBe(true);
      expect(result.data.is_blocked).toBe(false);
      expect(result.data.can_start).toBe(true);
    });

    it('should consider completed cards as non-blocking', async () => {
      const partiallyBlockedInfo = {
        is_blocked: true,
        blocking_cards: [
          {
            card_id: 2,
            title: 'API Development',
            status: 'completed', // This shouldn't block
          },
          {
            card_id: 3,
            title: 'Database Migration',
            status: 'in_progress', // This still blocks
          }
        ],
        blocking_count: 1, // Only one actually blocking
        can_start: false
      };

      mockDb.getBlockingCards.mockResolvedValue(partiallyBlockedInfo);
      const tool = registerCheckCardBlockedTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result.success).toBe(true);
      expect(result.data.blocking_count).toBe(1);
    });
  });

  describe('Get Card Dependencies Tool', () => {
    it('should return comprehensive dependency analysis', async () => {
      const dependencyData = {
        card_id: 1,
        dependencies: {
          direct_dependencies: [
            {
              card_id: 2,
              title: 'API Development',
              link_type: 'blocks',
              status: 'in_progress',
              priority: 'high'
            }
          ],
          indirect_dependencies: [
            {
              card_id: 3,
              title: 'Database Setup',
              link_type: 'blocks',
              status: 'todo',
              dependency_path: [2, 3] // API depends on Database
            }
          ],
          dependent_cards: [
            {
              card_id: 4,
              title: 'Frontend Testing',
              link_type: 'blocks',
              status: 'todo'
            }
          ]
        },
        dependency_chain_length: 3,
        critical_path: [1, 2, 3],
        estimated_completion_order: [3, 2, 1, 4],
        risk_analysis: {
          high_risk_dependencies: 1,
          blocked_by_incomplete: 2,
          circular_dependencies: []
        }
      };

      mockDb.getCardDependencies.mockResolvedValue(dependencyData);
      const tool = registerGetCardDependenciesTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: dependencyData
      });
    });

    it('should detect circular dependencies', async () => {
      const circularDependencyData = {
        card_id: 1,
        dependencies: {
          direct_dependencies: [{ card_id: 2, title: 'Card B' }],
          indirect_dependencies: [],
          dependent_cards: [{ card_id: 3, title: 'Card C' }]
        },
        risk_analysis: {
          circular_dependencies: [
            {
              cycle: [1, 2, 1],
              description: 'Card A blocks Card B, but Card B also blocks Card A'
            }
          ]
        }
      };

      mockDb.getCardDependencies.mockResolvedValue(circularDependencyData);
      const tool = registerGetCardDependenciesTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result.success).toBe(true);
      expect(result.data.risk_analysis.circular_dependencies).toHaveLength(1);
    });

    it('should include timing analysis', async () => {
      const timingData = {
        card_id: 1,
        dependencies: { direct_dependencies: [], indirect_dependencies: [], dependent_cards: [] },
        timing_analysis: {
          earliest_start_date: '2024-06-01',
          latest_start_date: '2024-06-05',
          estimated_completion_date: '2024-06-15',
          slack_time_days: 4,
          is_on_critical_path: true
        }
      };

      mockDb.getCardDependencies.mockResolvedValue(timingData);
      const tool = registerGetCardDependenciesTool(mockDb);

      const result = await tool.handler({
        card_id: 1,
        include_timing: true
      });

      expect(result.success).toBe(true);
      expect(result.data.timing_analysis).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete dependency workflow', async () => {
      const card1 = { id: 1, board_id: 1, title: 'Frontend' };
      const card2 = { id: 2, board_id: 1, title: 'API' };
      const card3 = { id: 3, board_id: 1, title: 'Database' };

      // Create dependency chain: Database -> API -> Frontend
      const createTool = registerCreateCardLinkTool(mockDb, mockWsServer);
      
      // API depends on Database
      mockDb.getCardById
        .mockResolvedValueOnce(card2)
        .mockResolvedValueOnce(card3);
      mockDb.getCardLink.mockResolvedValue(null);
      mockDb.createCardLink.mockResolvedValue({
        id: 1,
        source_card_id: 2,
        target_card_id: 3,
        link_type: 'blocks'
      });

      const link1Result = await createTool.handler({
        source_card_id: 2,
        target_card_id: 3,
        link_type: 'blocks'
      });
      expect(link1Result.success).toBe(true);

      // Frontend depends on API
      mockDb.getCardById
        .mockResolvedValueOnce(card1)
        .mockResolvedValueOnce(card2);
      mockDb.createCardLink.mockResolvedValue({
        id: 2,
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks'
      });

      const link2Result = await createTool.handler({
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks'
      });
      expect(link2Result.success).toBe(true);

      // Check if Frontend is blocked
      const checkTool = registerCheckCardBlockedTool(mockDb);
      mockDb.getBlockingCards.mockResolvedValue({
        is_blocked: true,
        blocking_cards: [{ card_id: 2, title: 'API', status: 'in_progress' }],
        blocking_count: 1,
        can_start: false
      });

      const blockedResult = await checkTool.handler({ card_id: 1 });
      expect(blockedResult.success).toBe(true);
      expect(blockedResult.data.is_blocked).toBe(true);

      // Get full dependency analysis
      const dependencyTool = registerGetCardDependenciesTool(mockDb);
      mockDb.getCardDependencies.mockResolvedValue({
        card_id: 1,
        dependencies: {
          direct_dependencies: [{ card_id: 2, title: 'API' }],
          indirect_dependencies: [{ card_id: 3, title: 'Database' }]
        },
        dependency_chain_length: 3,
        critical_path: [3, 2, 1]
      });

      const dependencyResult = await dependencyTool.handler({ card_id: 1 });
      expect(dependencyResult.success).toBe(true);
      expect(dependencyResult.data.dependency_chain_length).toBe(3);
    });

    it('should handle link type changes and their implications', async () => {
      // Create a 'relates_to' link
      const createTool = registerCreateCardLinkTool(mockDb, mockWsServer);
      const card1 = { id: 1, board_id: 1 };
      const card2 = { id: 2, board_id: 1 };
      
      mockDb.getCardById
        .mockResolvedValueOnce(card1)
        .mockResolvedValueOnce(card2);
      mockDb.getCardLink.mockResolvedValue(null);
      mockDb.createCardLink.mockResolvedValue({
        id: 1,
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'relates_to'
      });

      const createResult = await createTool.handler({
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'relates_to'
      });
      expect(createResult.success).toBe(true);

      // Update to blocking relationship
      const updateTool = registerUpdateCardLinkTool(mockDb, mockWsServer);
      mockDb.getCardLinkById.mockResolvedValue({
        id: 1,
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'relates_to'
      });
      mockDb.getCardById.mockResolvedValue(card1);
      mockDb.updateCardLink.mockResolvedValue({
        id: 1,
        source_card_id: 1,
        target_card_id: 2,
        link_type: 'blocks'
      });

      const updateResult = await updateTool.handler({
        link_id: 1,
        link_type: 'blocks'
      });
      expect(updateResult.success).toBe(true);

      // Verify blocking status changed
      const checkTool = registerCheckCardBlockedTool(mockDb);
      mockDb.getBlockingCards.mockResolvedValue({
        is_blocked: true,
        blocking_cards: [{ card_id: 2, title: 'Card 2', status: 'todo' }],
        blocking_count: 1,
        can_start: false
      });

      const checkResult = await checkTool.handler({ card_id: 1 });
      expect(checkResult.success).toBe(true);
      expect(checkResult.data.is_blocked).toBe(true);
    });
  });
});