/**
 * Wiki API Routes
 * 
 * REST API endpoints for Wiki page management.
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { MCPClientService } from '../services/MCPClientService.js';

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.error('VALIDATION_ERROR', 'Request validation failed', errors.array(), 400);
  }
  next();
};

// GET /api/wiki/pages - List wiki pages
router.get('/pages', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('category_id').optional().isString(),
  query('tags').optional().isArray(),
  query('search').optional().isString(),
  query('sort').optional().isIn(['title', 'created_at', 'updated_at']),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const mcpService: MCPClientService = req.app.locals.mcpService;
  
  const result = await mcpService.callTool('wiki', {
    name: 'get_pages',
    arguments: {
      limit: req.query.limit || 20,
      categoryId: req.query.category_id,
      tags: req.query.tags,
      search: req.query.search
    }
  });
  
  if (result.isError) {
    return res.error('MCP_ERROR', 'Failed to retrieve wiki pages', result.content);
  }
  
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  
  res.paginated([], {
    page,
    limit,
    total: 0,
    hasNext: false,
    hasPrev: false
  });
}));

// POST /api/wiki/pages - Create wiki page
router.post('/pages', [
  body('title').notEmpty().isLength({ min: 1, max: 255 }),
  body('content').notEmpty().isString(),
  body('category_id').optional().isString(),
  body('tags').optional().isArray(),
  body('published').optional().isBoolean(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const mcpService: MCPClientService = req.app.locals.mcpService;
  
  const result = await mcpService.callTool('wiki', {
    name: 'create_page',
    arguments: {
      title: req.body.title,
      content: req.body.content,
      categoryId: req.body.category_id,
      tags: req.body.tags || [],
      published: req.body.published !== false,
      authorId: req.user?.id
    }
  });
  
  if (result.isError) {
    return res.error('MCP_ERROR', 'Failed to create wiki page', result.content);
  }
  
  // Generate slug from title
  const slug = req.body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  res.status(201).success({
    id: 'page_' + Date.now(),
    title: req.body.title,
    slug,
    summary: req.body.content.substring(0, 200) + '...',
    category: req.body.category_id ? {
      id: req.body.category_id,
      name: 'Category Name',
      slug: 'category-slug'
    } : null,
    tags: (req.body.tags || []).map((tag: string, index: number) => ({
      id: 'tag_' + index,
      name: tag,
      color: '#3b82f6'
    })),
    author_id: req.user?.id,
    published: req.body.published !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  });
}));

// GET /api/wiki/pages/:id - Get wiki page
router.get('/pages/:id', [
  param('id').notEmpty(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const mcpService: MCPClientService = req.app.locals.mcpService;
  
  const result = await mcpService.callTool('wiki', {
    name: 'get_page',
    arguments: {
      pageId: req.params.id.replace('page_', '')
    }
  });
  
  if (result.isError) {
    return res.status(404).error('NOT_FOUND', 'Wiki page not found');
  }
  
  res.success({
    id: req.params.id,
    title: 'Sample Page',
    slug: 'sample-page',
    content: '# Sample Page\n\nThis is a sample wiki page.',
    html_content: '<h1>Sample Page</h1><p>This is a sample wiki page.</p>',
    summary: 'This is a sample wiki page.',
    category: null,
    tags: [],
    author_id: req.user?.id,
    published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    table_of_contents: [
      {
        level: 1,
        title: 'Sample Page',
        anchor: 'sample-page'
      }
    ]
  });
}));

// PUT /api/wiki/pages/:id - Update wiki page
router.put('/pages/:id', [
  param('id').notEmpty(),
  body('title').optional().isLength({ min: 1, max: 255 }),
  body('content').optional().isString(),
  body('category_id').optional().isString(),
  body('tags').optional().isArray(),
  body('published').optional().isBoolean(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const mcpService: MCPClientService = req.app.locals.mcpService;
  
  const result = await mcpService.callTool('wiki', {
    name: 'update_page',
    arguments: {
      pageId: req.params.id.replace('page_', ''),
      ...req.body
    }
  });
  
  if (result.isError) {
    return res.status(404).error('NOT_FOUND', 'Wiki page not found');
  }
  
  res.success({
    id: req.params.id,
    ...req.body,
    updated_at: new Date().toISOString(),
    version: 2
  });
}));

// DELETE /api/wiki/pages/:id - Delete wiki page
router.delete('/pages/:id', [
  param('id').notEmpty(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const mcpService: MCPClientService = req.app.locals.mcpService;
  
  const result = await mcpService.callTool('wiki', {
    name: 'delete_page',
    arguments: {
      pageId: req.params.id.replace('page_', '')
    }
  });
  
  if (result.isError) {
    return res.status(404).error('NOT_FOUND', 'Wiki page not found');
  }
  
  res.status(204).send();
}));

// GET /api/wiki/pages/:id/history - Get page version history
router.get('/pages/:id/history', [
  param('id').notEmpty(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const mcpService: MCPClientService = req.app.locals.mcpService;
  
  // This would require a specific MCP tool for version history
  // For now, return empty history
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  
  res.paginated([], {
    page,
    limit,
    total: 0,
    hasNext: false,
    hasPrev: false
  });
}));

// GET /api/wiki/categories - List categories
router.get('/categories', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const mcpService: MCPClientService = req.app.locals.mcpService;
  
  const result = await mcpService.callTool('wiki', {
    name: 'get_categories',
    arguments: {}
  });
  
  if (result.isError) {
    return res.error('MCP_ERROR', 'Failed to retrieve categories', result.content);
  }
  
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  
  res.paginated([], {
    page,
    limit,
    total: 0,
    hasNext: false,
    hasPrev: false
  });
}));

// POST /api/wiki/categories - Create category
router.post('/categories', [
  body('name').notEmpty().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const mcpService: MCPClientService = req.app.locals.mcpService;
  
  const result = await mcpService.callTool('wiki', {
    name: 'create_category',
    arguments: {
      name: req.body.name,
      description: req.body.description,
      color: req.body.color || '#64748b'
    }
  });
  
  if (result.isError) {
    return res.error('MCP_ERROR', 'Failed to create category', result.content);
  }
  
  const slug = req.body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  res.status(201).success({
    id: 'cat_' + Date.now(),
    name: req.body.name,
    slug,
    description: req.body.description,
    color: req.body.color || '#64748b',
    page_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}));

export default router;