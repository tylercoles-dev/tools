/**
 * Kanban page objects index
 * Exports all Kanban-related page objects and helpers
 */

export { KanbanBoardsPage, BoardCard } from './kanban-boards-page';
export { KanbanBoardPage, KanbanColumn, KanbanCard } from './kanban-board-page';

// Re-export commonly used types and utilities
export type { TestKanbanBoard, TestKanbanCard, TestKanbanColumn } from '../../fixtures/kanban-test-data';
export type { DragDropResult } from '../../utils/kanban-test-helpers';