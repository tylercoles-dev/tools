/**
 * Kanban API Routes
 * 
 * REST API endpoints for Kanban board management.
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { KanbanService } from '@mcp-tools/core/kanban';

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.error('VALIDATION_ERROR', 'Request validation failed', errors.array(), 400);
  }
  next();
};

// GET /api/kanban/boards - List boards
router.get('/boards', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().isIn(['name', 'created_at', 'updated_at']),
  query('order').optional().isIn(['asc', 'desc']),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const kanbanService: KanbanService = req.app.locals.kanbanService;
  
  const boards = await kanbanService.getBoards();
  
  // Apply pagination
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const startIdx = (page - 1) * limit;
  const endIdx = startIdx + limit;
  const paginatedBoards = boards.slice(startIdx, endIdx);
  
  res.paginated(paginatedBoards, {
    page,
    limit,
    total: boards.length,
    hasNext: endIdx < boards.length,
    hasPrev: page > 1
  });
}));

// POST /api/kanban/boards - Create board
router.post('/boards', [
  body('name').notEmpty().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const kanbanService: KanbanService = req.app.locals.kanbanService;
  
  const board = await kanbanService.createBoard({
    name: req.body.name,
    description: req.body.description,
    color: req.body.color || '#6366f1'
  });
  
  res.status(201).success(board);
}));

// GET /api/kanban/boards/:id - Get board with columns and cards
router.get('/boards/:id', [
  param('id').notEmpty(),
  query('include_archived').optional().isBoolean().toBoolean(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const kanbanService: KanbanService = req.app.locals.kanbanService;
  
  try {
    const boardId = parseInt(req.params.id.replace('board_', '')) || parseInt(req.params.id);
    const board = await kanbanService.getBoard(boardId);
    
    if (!board) {
      return res.status(404).error('NOT_FOUND', 'Board not found');
    }
    
    res.success(board);
  } catch (error) {
    return res.status(404).error('NOT_FOUND', 'Board not found');
  }
}));

// POST /api/kanban/cards - Create card
router.post('/cards', [
  body('board_id').notEmpty(),
  body('column_id').notEmpty(),
  body('title').notEmpty().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assigned_to').optional().isString(),
  body('tags').optional().isArray(),
  body('due_date').optional().isISO8601(),
  body('position').optional().isInt({ min: 0 }),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const kanbanService: KanbanService = req.app.locals.kanbanService;
  
  try {
    const boardId = parseInt(req.body.board_id.replace('board_', '')) || parseInt(req.body.board_id);
    const columnId = parseInt(req.body.column_id.replace('col_', '')) || parseInt(req.body.column_id);
    
    const card = await kanbanService.createCard({
      board_id: boardId,
      column_position: columnId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority || 'medium',
      assigned_to: req.body.assigned_to,
      due_date: req.body.due_date,
      position: req.body.position || 0
    });
    
    res.status(201).success(card);
  } catch (error: any) {
    return res.error('CREATE_ERROR', 'Failed to create card', error.message);
  }
}));

// PUT /api/kanban/cards/:id - Update card
router.put('/cards/:id', [
  param('id').notEmpty(),
  body('title').optional().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assigned_to').optional().isString(),
  body('tags').optional().isArray(),
  body('due_date').optional().isISO8601(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const kanbanService: KanbanService = req.app.locals.kanbanService;
  
  try {
    const cardId = parseInt(req.params.id.replace('card_', '')) || parseInt(req.params.id);
    
    const updatedCard = await kanbanService.updateCard({
      card_id: cardId,
      ...req.body
    });
    
    if (!updatedCard) {
      return res.status(404).error('NOT_FOUND', 'Card not found');
    }
    
    res.success(updatedCard);
  } catch (error) {
    return res.status(404).error('NOT_FOUND', 'Card not found');
  }
}));

// PUT /api/kanban/cards/:id/move - Move card
router.put('/cards/:id/move', [
  param('id').notEmpty(),
  body('column_id').notEmpty(),
  body('position').isInt({ min: 0 }),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const kanbanService: KanbanService = req.app.locals.kanbanService;
  
  try {
    const cardId = parseInt(req.params.id.replace('card_', '')) || parseInt(req.params.id);
    const columnId = parseInt(req.body.column_id.replace('col_', '')) || parseInt(req.body.column_id);
    
    const movedCard = await kanbanService.moveCard({
      card_id: cardId,
      column_position: columnId,
      position: req.body.position
    });
    
    if (!movedCard) {
      return res.status(404).error('NOT_FOUND', 'Card not found');
    }
    
    res.success(movedCard);
  } catch (error) {
    return res.status(404).error('NOT_FOUND', 'Card not found');
  }
}));

// DELETE /api/kanban/cards/:id - Delete card
router.delete('/cards/:id', [
  param('id').notEmpty(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const kanbanService: KanbanService = req.app.locals.kanbanService;
  
  try {
    const cardId = parseInt(req.params.id.replace('card_', '')) || parseInt(req.params.id);
    
    const deleted = await kanbanService.deleteCard(cardId);
    
    if (!deleted) {
      return res.status(404).error('NOT_FOUND', 'Card not found');
    }
    
    res.status(204).send();
  } catch (error) {
    return res.status(404).error('NOT_FOUND', 'Card not found');
  }
}));

export default router;