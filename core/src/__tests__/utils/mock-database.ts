/**
 * Database Mocking Utilities
 * 
 * Provides comprehensive mocking for Kysely database operations
 */

import type { KanbanDatabase } from '../../services/kanban/database.js';

export interface MockQueryResult<T = any> {
  execute: jest.Mock<Promise<T[]>>;
  executeTakeFirst: jest.Mock<Promise<T | undefined>>;
  executeTakeFirstOrThrow: jest.Mock<Promise<T>>;
  returningAll: jest.Mock<any>;
  where: jest.Mock<any>;
  innerJoin: jest.Mock<any>;
  leftJoin: jest.Mock<any>;
  selectAll: jest.Mock<any>;
  select: jest.Mock<any>;
  orderBy: jest.Mock<any>;
  groupBy: jest.Mock<any>;
  insertInto: jest.Mock<any>;
  updateTable: jest.Mock<any>;
  deleteFrom: jest.Mock<any>;
  values: jest.Mock<any>;
  set: jest.Mock<any>;
}

export interface MockDeleteResult {
  numDeletedRows: bigint;
}

/**
 * Creates a chainable mock query builder that supports all Kysely operations
 */
export function createMockQueryBuilder<T = any>(result?: T | T[]): MockQueryResult<T> {
  const mockQuery: MockQueryResult<T> = {
    execute: jest.fn(),
    executeTakeFirst: jest.fn(),
    executeTakeFirstOrThrow: jest.fn(),
    returningAll: jest.fn(),
    where: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    selectAll: jest.fn(),
    select: jest.fn(),
    orderBy: jest.fn(),
    groupBy: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
    deleteFrom: jest.fn(),
    values: jest.fn(),
    set: jest.fn(),
  };

  // Make all methods chainable
  Object.keys(mockQuery).forEach(key => {
    if (key === 'execute') {
      mockQuery[key].mockResolvedValue(Array.isArray(result) ? result : []);
    } else if (key === 'executeTakeFirst') {
      mockQuery[key].mockResolvedValue(Array.isArray(result) ? result[0] : result);
    } else if (key === 'executeTakeFirstOrThrow') {
      if (result === undefined || (Array.isArray(result) && result.length === 0)) {
        mockQuery[key].mockRejectedValue(new Error('No result found'));
      } else {
        mockQuery[key].mockResolvedValue(Array.isArray(result) ? result[0] : result);
      }
    } else {
      mockQuery[key].mockReturnValue(mockQuery);
    }
  });

  return mockQuery;
}

/**
 * Creates a mock KanbanDatabase with all necessary methods
 */
export function createMockKanbanDatabase(): jest.Mocked<KanbanDatabase> {
  const mockKysely = {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
    deleteFrom: jest.fn(),
  };

  return {
    kysely: mockKysely as any,
    close: jest.fn(),
  } as jest.Mocked<KanbanDatabase>;
}

/**
 * Sample test data for Kanban entities
 */
export const mockTestData = {
  board: {
    id: 1,
    name: 'Test Board',
    description: 'Test board description',
    color: '#6366f1',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  
  column: {
    id: 1,
    board_id: 1,
    name: 'To Do',
    position: 0,
    color: '#ef4444',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  
  card: {
    id: 1,
    board_id: 1,
    column_id: 1,
    title: 'Test Card',
    description: 'Test card description',
    position: 0,
    priority: 'medium' as const,
    assigned_to: null,
    due_date: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  
  tag: {
    id: 1,
    name: 'Test Tag',
    color: '#64748b',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  
  comment: {
    id: 1,
    card_id: 1,
    content: 'Test comment',
    author: 'test-user',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  
  defaultColumns: [
    { name: 'To Do', position: 0, color: '#ef4444' },
    { name: 'In Progress', position: 1, color: '#f59e0b' },
    { name: 'Review', position: 2, color: '#3b82f6' },
    { name: 'Done', position: 3, color: '#10b981' }
  ],
};

/**
 * Helper to create mock delete result
 */
export function createMockDeleteResult(deletedRows: number = 1): MockDeleteResult {
  return {
    numDeletedRows: BigInt(deletedRows)
  };
}

/**
 * Helper to setup common database mock expectations
 */
export function setupDatabaseMocks(mockDb: jest.Mocked<KanbanDatabase>) {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup default chain returns
  mockDb.kysely.selectFrom.mockReturnValue(createMockQueryBuilder());
  mockDb.kysely.insertInto.mockReturnValue(createMockQueryBuilder());
  mockDb.kysely.updateTable.mockReturnValue(createMockQueryBuilder());
  mockDb.kysely.deleteFrom.mockReturnValue(createMockQueryBuilder());
  
  return mockDb;
}