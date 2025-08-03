/**
 * Sample seed data for MCP Tools ecosystem
 * Contains demo/example data for development and testing environments
 */

import { Kysely } from 'kysely';
import { logger } from '../utils/logger.js';
import type { SeedData } from './types.js';

/**
 * Sample boards seed
 */
export const sampleBoardsSeed: SeedData = {
  id: 'sample_boards',
  name: 'Sample Kanban Boards',
  description: 'Insert sample kanban boards for demonstration',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding sample boards...');
    
    // Insert sample boards
    await db.insertInto('boards')
      .values([
        {
          id: 1,
          name: 'Sample Project',
          description: 'A sample kanban board to get started',
          color: '#6366f1'
        },
        {
          id: 2,
          name: 'Personal Tasks',
          description: 'Personal task management board',
          color: '#10b981'
        },
        {
          id: 3,
          name: 'Team Development',
          description: 'Development team collaboration board',
          color: '#8b5cf6'
        }
      ])
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    logger.info('Sample boards seeded successfully');
  }
};

/**
 * Sample columns seed
 */
export const sampleColumnsSeed: SeedData = {
  id: 'sample_columns',
  name: 'Sample Kanban Columns',
  description: 'Insert sample kanban columns for demonstration boards',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding sample columns...');
    
    // Insert sample columns
    await db.insertInto('columns')
      .values([
        // Sample Project board columns
        { id: 1, board_id: 1, name: 'To Do', position: 0, color: '#ef4444' },
        { id: 2, board_id: 1, name: 'In Progress', position: 1, color: '#f59e0b' },
        { id: 3, board_id: 1, name: 'Review', position: 2, color: '#3b82f6' },
        { id: 4, board_id: 1, name: 'Done', position: 3, color: '#10b981' },
        
        // Personal Tasks board columns
        { id: 5, board_id: 2, name: 'Backlog', position: 0, color: '#6b7280' },
        { id: 6, board_id: 2, name: 'Active', position: 1, color: '#8b5cf6' },
        { id: 7, board_id: 2, name: 'Completed', position: 2, color: '#10b981' },
        
        // Team Development board columns
        { id: 8, board_id: 3, name: 'Backlog', position: 0, color: '#6b7280' },
        { id: 9, board_id: 3, name: 'Sprint Ready', position: 1, color: '#3b82f6' },
        { id: 10, board_id: 3, name: 'In Progress', position: 2, color: '#f59e0b' },
        { id: 11, board_id: 3, name: 'Testing', position: 3, color: '#8b5cf6' },
        { id: 12, board_id: 3, name: 'Done', position: 4, color: '#10b981' }
      ])
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    logger.info('Sample columns seeded successfully');
  }
};

/**
 * Sample tags seed
 */
export const sampleTagsSeed: SeedData = {
  id: 'sample_tags',
  name: 'Sample Tags',
  description: 'Insert sample tags for demonstration',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding sample tags...');
    
    // Insert sample kanban tags (starting from ID 4 to avoid conflicts with essential tags)
    await db.insertInto('tags')
      .values([
        { id: 4, name: 'urgent', color: '#ef4444' },
        { id: 5, name: 'feature', color: '#3b82f6' },
        { id: 6, name: 'bug', color: '#f59e0b' },
        { id: 7, name: 'enhancement', color: '#10b981' },
        { id: 8, name: 'documentation', color: '#8b5cf6' },
        { id: 9, name: 'frontend', color: '#06b6d4' },
        { id: 10, name: 'backend', color: '#84cc16' },
        { id: 11, name: 'testing', color: '#f97316' }
      ])
      .onConflict((oc) => oc.column('name').doNothing())
      .execute();

    logger.info('Sample tags seeded successfully');
  }
};

/**
 * Sample cards seed
 */
export const sampleCardsSeed: SeedData = {
  id: 'sample_cards',
  name: 'Sample Cards',
  description: 'Insert sample cards for demonstration boards',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding sample cards...');
    
    // Insert sample cards
    await db.insertInto('cards')
      .values([
        // Sample Project board cards
        {
          id: 1,
          board_id: 1,
          column_id: 1,
          title: 'Setup project structure',
          description: 'Initialize the kanban board project with proper folder structure and configuration files',
          position: 0,
          priority: 'high',
          assigned_to: 'Developer',
          estimated_hours: 4
        },
        {
          id: 2,
          board_id: 1,
          column_id: 1,
          title: 'Design database schema',
          description: 'Create comprehensive database schema for boards, columns, cards, and all related entities',
          position: 1,
          priority: 'high',
          assigned_to: 'Developer',
          estimated_hours: 8
        },
        {
          id: 3,
          board_id: 1,
          column_id: 2,
          title: 'Implement MCP server',
          description: 'Build the MCP server with tools and resources for kanban management',
          position: 0,
          priority: 'high',
          assigned_to: 'Developer',
          estimated_hours: 16,
          actual_hours: 12
        },
        {
          id: 4,
          board_id: 1,
          column_id: 3,
          title: 'Add unit tests',
          description: 'Comprehensive unit test coverage for all MCP tools and database operations',
          position: 0,
          priority: 'medium',
          assigned_to: 'QA Engineer',
          estimated_hours: 12
        },
        
        // Personal Tasks board cards
        {
          id: 5,
          board_id: 2,
          column_id: 5,
          title: 'Plan weekend trip',
          description: 'Research destinations and book accommodations for the upcoming weekend getaway',
          position: 0,
          priority: 'low',
          assigned_to: 'Personal'
        },
        {
          id: 6,
          board_id: 2,
          column_id: 6,
          title: 'Complete tax filing',
          description: 'Gather all necessary documents and complete annual tax return',
          position: 0,
          priority: 'urgent',
          assigned_to: 'Personal',
          due_date: '2024-04-15'
        },
        
        // Team Development board cards
        {
          id: 7,
          board_id: 3,
          column_id: 8,
          title: 'User authentication system',
          description: 'Implement secure user authentication with JWT tokens and session management',
          position: 0,
          priority: 'high',
          assigned_to: 'Backend Team',
          estimated_hours: 24
        },
        {
          id: 8,
          board_id: 3,
          column_id: 9,
          title: 'Real-time notifications',
          description: 'Add WebSocket-based real-time notifications for card updates and mentions',
          position: 0,
          priority: 'medium',
          assigned_to: 'Full-stack Team',
          estimated_hours: 16
        },
        {
          id: 9,
          board_id: 3,
          column_id: 10,
          title: 'Mobile responsive design',
          description: 'Ensure the kanban board interface works perfectly on mobile devices',
          position: 0,
          priority: 'medium',
          assigned_to: 'Frontend Team',
          estimated_hours: 20,
          actual_hours: 15
        }
      ])
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    logger.info('Sample cards seeded successfully');
  }
};

/**
 * Sample card tags seed
 */
export const sampleCardTagsSeed: SeedData = {
  id: 'sample_card_tags',
  name: 'Sample Card Tags',
  description: 'Insert sample card-tag associations for demonstration',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding sample card tags...');
    
    // Insert sample card-tag associations
    await db.insertInto('card_tags')
      .values([
        // Sample Project cards
        { card_id: 1, tag_id: 5 }, // Setup project structure -> feature
        { card_id: 2, tag_id: 5 }, // Design database schema -> feature
        { card_id: 2, tag_id: 10 }, // Design database schema -> backend
        { card_id: 3, tag_id: 5 }, // Implement MCP server -> feature
        { card_id: 3, tag_id: 10 }, // Implement MCP server -> backend
        { card_id: 4, tag_id: 11 }, // Add unit tests -> testing
        
        // Personal Tasks cards
        { card_id: 6, tag_id: 4 }, // Complete tax filing -> urgent
        
        // Team Development cards
        { card_id: 7, tag_id: 5 }, // User authentication -> feature
        { card_id: 7, tag_id: 10 }, // User authentication -> backend
        { card_id: 8, tag_id: 5 }, // Real-time notifications -> feature
        { card_id: 8, tag_id: 9 }, // Real-time notifications -> frontend
        { card_id: 8, tag_id: 10 }, // Real-time notifications -> backend
        { card_id: 9, tag_id: 7 }, // Mobile responsive design -> enhancement
        { card_id: 9, tag_id: 9 } // Mobile responsive design -> frontend
      ])
      .onConflict((oc) => oc.doNothing())
      .execute();

    logger.info('Sample card tags seeded successfully');
  }
};

/**
 * Sample wiki pages seed
 */
export const sampleWikiPagesSeed: SeedData = {
  id: 'sample_wiki_pages',
  name: 'Sample Wiki Pages',
  description: 'Insert sample wiki pages for demonstration',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding sample wiki pages...');
    
    // Insert sample wiki pages
    await db.insertInto('pages')
      .values([
        {
          id: 1,
          title: 'Welcome to MCP Tools',
          slug: 'welcome',
          content: `# Welcome to MCP Tools

This is your comprehensive workspace for project management, documentation, and knowledge sharing.

## Getting Started

1. **Kanban Boards**: Organize your projects with flexible kanban boards
2. **Wiki Pages**: Document your knowledge and processes
3. **Memory System**: Leverage AI-powered memory for intelligent assistance

## Features

- Real-time collaboration
- Advanced search capabilities
- Customizable workflows
- Integration with AI tools

Happy organizing!`,
          summary: 'Introduction and overview of MCP Tools features',
          created_by: 'System',
          updated_by: 'System',
          is_published: true,
          sort_order: 0
        },
        {
          id: 2,
          title: 'Kanban Board Guide',
          slug: 'kanban-guide',
          content: `# Kanban Board User Guide

Learn how to effectively use kanban boards for project management.

## Creating Boards

1. Click "New Board" button
2. Enter board name and description
3. Choose a color theme
4. Add initial columns

## Managing Cards

- **Create**: Click "+" in any column
- **Edit**: Click on card title or description
- **Move**: Drag and drop between columns
- **Assign**: Use the assignment dropdown
- **Tag**: Add relevant tags for organization

## Best Practices

- Keep card titles concise but descriptive
- Use tags consistently across your team
- Regular board reviews and updates
- Archive completed cards periodically`,
          summary: 'Complete guide for using kanban boards effectively',
          created_by: 'System',
          updated_by: 'System',
          is_published: true,
          parent_id: 1,
          sort_order: 1
        },
        {
          id: 3,
          title: 'API Documentation',
          slug: 'api-docs',
          content: `# API Documentation

Complete reference for the MCP Tools REST API.

## Authentication

All API requests require authentication using JWT tokens:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
     https://api.mcp-tools.com/api/boards
\`\`\`

## Endpoints

### Boards
- \`GET /api/boards\` - List all boards
- \`POST /api/boards\` - Create new board
- \`GET /api/boards/:id\` - Get specific board
- \`PUT /api/boards/:id\` - Update board
- \`DELETE /api/boards/:id\` - Delete board

### Cards
- \`GET /api/boards/:id/cards\` - List board cards
- \`POST /api/boards/:id/cards\` - Create new card
- \`PUT /api/cards/:id\` - Update card
- \`DELETE /api/cards/:id\` - Delete card

## Rate Limiting

API requests are limited to 1000 requests per hour per user.`,
          summary: 'Technical documentation for REST API endpoints',
          created_by: 'System',
          updated_by: 'System',
          is_published: true,
          sort_order: 2
        }
      ])
      .onConflict((oc) => oc.column('slug').doNothing())
      .execute();

    logger.info('Sample wiki pages seeded successfully');
  }
};

/**
 * Sample wiki categories seed
 */
export const sampleWikiCategoriesSeed: SeedData = {
  id: 'sample_wiki_categories',
  name: 'Sample Wiki Categories',
  description: 'Insert sample wiki categories and page associations',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding sample wiki categories...');
    
    // Insert sample categories (starting from ID 4 to avoid conflicts)
    await db.insertInto('categories')
      .values([
        {
          id: 4,
          name: 'Guides',
          description: 'User guides and tutorials',
          color: '#8b5cf6'
        },
        {
          id: 5,
          name: 'API',
          description: 'API documentation and references',
          color: '#06b6d4'
        }
      ])
      .onConflict((oc) => oc.column('name').doNothing())
      .execute();

    // Associate pages with categories
    await db.insertInto('page_categories')
      .values([
        { page_id: 1, category_id: 3 }, // Welcome -> Help
        { page_id: 2, category_id: 4 }, // Kanban Guide -> Guides
        { page_id: 3, category_id: 5 }, // API Documentation -> API
        { page_id: 3, category_id: 2 }  // API Documentation -> System
      ])
      .onConflict((oc) => oc.doNothing())
      .execute();

    logger.info('Sample wiki categories seeded successfully');
  }
};

/**
 * Sample memories seed
 */
export const sampleMemoriesSeed: SeedData = {
  id: 'sample_memories',
  name: 'Sample Memories',
  description: 'Insert sample memory entries for demonstration',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding sample memories...');
    
    // Insert sample memories
    await db.insertInto('memories')
      .values([
        {
          id: 'mem_project_setup',
          content: 'Project setup requires careful planning of folder structure, database schema, and deployment configuration. Key considerations include scalability, maintainability, and team collaboration workflows.',
          content_hash: 'hash_project_setup_001',
          context: JSON.stringify({
            project: 'mcp-tools',
            topic: 'project-setup',
            user: 'system'
          }),
          importance: 8,
          status: 'active',
          access_count: 5,
          created_by: 'system'
        },
        {
          id: 'mem_kanban_workflow',
          content: 'Effective kanban workflow involves clear column definitions, consistent card management practices, and regular board reviews. Teams should establish WIP limits and ensure smooth card progression.',
          content_hash: 'hash_kanban_workflow_001',
          context: JSON.stringify({
            project: 'mcp-tools',
            topic: 'kanban-workflow',
            user: 'system'
          }),
          importance: 7,
          status: 'active',
          access_count: 12,
          created_by: 'system'
        },
        {
          id: 'mem_api_design',
          content: 'RESTful API design principles: use proper HTTP methods, meaningful URLs, consistent response formats, appropriate status codes, and comprehensive error handling. Security and rate limiting are essential.',
          content_hash: 'hash_api_design_001',
          context: JSON.stringify({
            project: 'mcp-tools',
            topic: 'api-design',
            user: 'system'
          }),
          importance: 9,
          status: 'active',
          access_count: 8,
          created_by: 'system'
        }
      ])
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    logger.info('Sample memories seeded successfully');
  }
};

/**
 * All sample seeds in execution order
 */
export const sampleSeeds: SeedData[] = [
  sampleBoardsSeed,
  sampleColumnsSeed,
  sampleTagsSeed,
  sampleCardsSeed,
  sampleCardTagsSeed,
  sampleWikiPagesSeed,
  sampleWikiCategoriesSeed,
  sampleMemoriesSeed
];