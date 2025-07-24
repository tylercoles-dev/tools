/**
 * Scraper API Routes
 * 
 * REST API endpoints for web scraping functionality.
 */

import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ScraperService } from '@mcp-tools/core/scraper';

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.error('VALIDATION_ERROR', 'Request validation failed', errors.array(), 400);
  }
  next();
};

// POST /api/scraper/scrape - Scrape a URL
router.post('/scrape', [
  body('url').isURL(),
  body('options').optional().isObject(),
  body('options.waitForSelector').optional().isString(),
  body('options.timeout').optional().isInt({ min: 1000, max: 60000 }),
  body('options.removeAds').optional().isBoolean(),
  body('options.removeImages').optional().isBoolean(),
  body('options.extractMetadata').optional().isBoolean(),
  validateRequest
], asyncHandler(async (req: any, res: any) => {
  const scraperService: ScraperService = req.app.locals.scraperService;
  
  try {
    const result = await scraperService.scrapeUrl({
      url: req.body.url,
      options: req.body.options || {}
    });
    
    res.success(result);
  } catch (error: any) {
    return res.error('SCRAPE_ERROR', 'Failed to scrape URL', error.message);
  }
}));

// GET /api/scraper/health - Check scraper service health
router.get('/health', asyncHandler(async (req: any, res: any) => {
  const scraperService: ScraperService = req.app.locals.scraperService;
  
  try {
    const health = await scraperService.getHealth();
    res.success(health);
  } catch (error: any) {
    return res.error('HEALTH_ERROR', 'Failed to get scraper health', error.message);
  }
}));

export default router;