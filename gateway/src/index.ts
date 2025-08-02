#!/usr/bin/env node

/**
 * MCP Tools API Gateway
 * 
 * Express.js REST API gateway that provides unified HTTP access to all MCP servers
 * (Kanban, Memory, Wiki, Calendar, Monitoring) in the MCP Tools ecosystem.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import route handlers
import kanbanRoutes from './routes/kanban.routes.js';
import memoryRoutes from './routes/memory.routes.js';
import wikiRoutes from './routes/wiki.routes.js';
import scraperRoutes from './routes/scraper.routes.js';
import healthRoutes from './routes/health.routes.js';
import qualityRoutes from './routes/quality.routes.js';
import { createAnalyticsRoutes } from './routes/analytics.routes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/auth.js';
import { responseFormatter } from './middleware/responseFormatter.js';
import { createAnalyticsMiddleware, createErrorTrackingMiddleware } from './middleware/analytics.middleware.js';

// Import services from core library
import { KanbanService, KanbanDatabase } from '@mcp-tools/core/kanban';
import { MemoryService, MemoryDatabaseManager, VectorEngine } from '@mcp-tools/core/memory';
import { ScraperService, ScraperDatabaseManager, ScrapingEngine } from '@mcp-tools/core/scraper';
import { AnalyticsService } from './services/AnalyticsService.js';
import { setupWebSocket } from './websocket/index.js';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Load environment variables
dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  port: parseInt(process.env.PORT || '8193'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  database: {
    kanban: {
      type: 'sqlite' as const,
      filename: process.env.KANBAN_DB_FILE || path.join(process.cwd(), 'kanban-test.db')
    },
    memory: {
      type: 'sqlite' as const,
      filename: process.env.MEMORY_DB_FILE || path.join(process.cwd(), 'memory-test.db')
    },
    scraper: {
      type: 'sqlite' as const,
      filename: process.env.SCRAPER_DB_FILE || path.join(process.cwd(), 'scraper-test.db')
    },
    postgres: process.env.DATABASE_URL || 'postgresql://mcp_user:mcp_password@localhost:5432/mcp_tools',
    redis: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222'
  }
};

async function createApp() {
  const app = express();
  
  // Trust proxy for rate limiting and security headers
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  
  // CORS configuration
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  
  // Compression middleware
  app.use(compression());
  
  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Request logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }
  app.use(requestLogger);
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests from this IP, please try again later.'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
  
  // Response formatting middleware
  app.use(responseFormatter);
  
  // Initialize core services
  console.log('🔧 Initializing services...');
  console.log('Kanban DB path:', config.database.kanban.filename);
  console.log('Memory DB path:', config.database.memory.filename);
  console.log('Scraper DB path:', config.database.scraper.filename);
  
  // Initialize PostgreSQL and Redis for analytics
  console.log('🔄 Connecting to PostgreSQL...');
  const pgPool = new Pool({
    connectionString: config.database.postgres,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  console.log('🔄 Connecting to Redis...');
  const redis = new Redis(config.database.redis, {
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  });
  
  // Initialize databases
  const kanbanDatabase = new KanbanDatabase(config.database.kanban);
  console.log('✅ KanbanDatabase created');
  
  const memoryDatabase = new MemoryDatabaseManager(config.database.memory);
  console.log('✅ MemoryDatabase created');
  
  const scraperDatabase = new ScraperDatabaseManager(config.database.scraper);
  console.log('✅ ScraperDatabase created');
  
  console.log('🔄 Initializing kanban database...');
  await kanbanDatabase.initialize();
  console.log('✅ KanbanDatabase initialized');
  
  console.log('🔄 Initializing memory database...');
  await memoryDatabase.initialize();
  console.log('✅ MemoryDatabase initialized');
  
  console.log('🔄 Initializing scraper database...');
  await scraperDatabase.initialize();
  console.log('✅ ScraperDatabase initialized');
  
  // Initialize vector engine
  const vectorEngine = new VectorEngine();
  console.log('✅ VectorEngine created');
  
  // Initialize scraping engine
  const scrapingEngine = new ScrapingEngine();
  console.log('✅ ScrapingEngine created');
  
  // Initialize services
  const kanbanService = new KanbanService(kanbanDatabase);
  console.log('✅ KanbanService created');
  
  const memoryService = new MemoryService(memoryDatabase, vectorEngine);
  console.log('✅ MemoryService created');
  
  const scraperService = new ScraperService(scraperDatabase, scrapingEngine);
  console.log('✅ ScraperService created');
  
  // Initialize analytics service
  const analyticsService = new AnalyticsService(pgPool, redis);
  console.log('✅ AnalyticsService created');
  
  // Store services in app locals for access in routes
  app.locals.kanbanService = kanbanService;
  app.locals.memoryService = memoryService;
  app.locals.scraperService = scraperService;
  app.locals.analyticsService = analyticsService;
  app.locals.pgPool = pgPool;
  app.locals.redis = redis;
  
  // API Documentation (before auth middleware)
  try {
    const swaggerDocument = YAML.load(path.join(__dirname, '../../docs/openapi.yaml'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customSiteTitle: 'MCP Tools API Documentation'
    }));
  } catch (error) {
    console.warn('Could not load OpenAPI documentation:', error);
  }
  
  // Health check (before auth)
  app.use('/health', healthRoutes);
  
  // Analytics middleware (before auth to track all requests)
  app.use('/api', createAnalyticsMiddleware(analyticsService));
  
  // Authentication middleware for protected routes
  app.use('/api', authMiddleware);
  
  // API Routes
  app.use('/api/v1/kanban', kanbanRoutes);
  app.use('/api/v1/memory', memoryRoutes);
  app.use('/api/v1/wiki', wikiRoutes);
  app.use('/api/v1/scraper', scraperRoutes);
  app.use('/api/v1/quality', qualityRoutes);
  app.use('/api/v1/analytics', createAnalyticsRoutes(analyticsService));
  
  // Root endpoint
  app.get('/', (req, res) => {
    res.success({
      message: 'MCP Tools API Gateway',
      version: '1.0.0',
      documentation: '/api/docs',
      health: '/health'
    });
  });
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).error('NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
  });
  
  // Error tracking middleware (before error handler)
  app.use(createErrorTrackingMiddleware(analyticsService));
  
  // Error handling middleware (must be last)
  app.use(errorHandler);
  
  return app;
}

async function startServer() {
  try {
    console.log('🚀 Starting MCP Tools API Gateway...');
    console.log('📋 Configuration:', JSON.stringify(config, null, 2));
    
    // Create Express app
    console.log('📦 Creating Express app...');
    const app = await createApp();
    console.log('✅ Express app created');
    
    // Create HTTP server
    const server = createServer(app);
    
    // Setup WebSocket server
    const io = new SocketIOServer(server, {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST']
      }
    });
    
    setupWebSocket(io, app.locals.kanbanService, app.locals.analyticsService);
    
    // Start server
    server.listen(config.port, () => {
      console.log(`✅ API Gateway running on port ${config.port}`);
      console.log(`📚 API Documentation: http://localhost:${config.port}/api/docs`);
      console.log(`🔍 Health Check: http://localhost:${config.port}/health`);
      console.log(`🌐 CORS Origin: ${config.corsOrigin}`);
    });
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Close service connections
        if (app.locals.kanbanService) {
          await app.locals.kanbanService.shutdown();
        }
        if (app.locals.memoryService) {
          await app.locals.memoryService.shutdown();
        }
        if (app.locals.scraperService) {
          await scrapingEngine.close();
        }
        
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
const currentFilePath = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFilePath;

if (isMainModule) {
  console.log('✅ Starting server...');
  startServer().catch(error => {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  });
}

export { createApp };