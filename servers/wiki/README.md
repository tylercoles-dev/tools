# Wiki MCP Server

A comprehensive wiki server implementation using the Model Context Protocol (MCP). This server provides a full-featured wiki system with markdown support, hierarchical organization, tagging, search, and version history.

## Features

### Core Wiki Functionality
- **Pages**: Create, read, update, and delete wiki pages with markdown content
- **Hierarchical Organization**: Parent-child page relationships for structured content
- **Categories**: Organize pages into categories with custom colors
- **Tags**: Flexible tagging system for cross-cutting concerns
- **Full-Text Search**: SQLite FTS5 or PostgreSQL full-text search
- **Comments**: Discussion system for pages
- **Version History**: Track changes with reasons and authorship

### Markdown Processing
- **GitHub Flavored Markdown**: Full GFM support with extensions
- **Internal Linking**: Wiki-style `[[Page Name]]` links
- **Table of Contents**: Automatic TOC generation from headings
- **Frontmatter**: YAML frontmatter support for metadata
- **Syntax Highlighting**: Code block highlighting support
- **Auto-excerpts**: Automatic summary generation

### Database Support
- **SQLite**: Default, with FTS5 full-text search
- **PostgreSQL**: Full support with tsvector search ⚠️ (implementation pending)
- **MySQL**: Basic support ⚠️ (implementation pending)

### MCP Integration
- **Tools**: Complete CRUD operations for all entities
- **Resources**: URI-based access to wiki data
- **Prompts**: Workflow helpers for common tasks

## Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Initialize database
npm run db:migrate

# Start the server
npm start
```

## Configuration

Configure the server using environment variables:

```bash
# Server configuration
PORT=3003
HOST=localhost

# Database configuration
DB_TYPE=sqlite                    # sqlite, postgres, mysql
DB_FILE=./wiki.db                # SQLite file path
DATABASE_URL=                    # Connection string for PostgreSQL/MySQL

# PostgreSQL/MySQL specific
DB_HOST=localhost
DB_PORT=5432
DB_USER=wiki
DB_PASSWORD=password
DB_NAME=wiki
```

## Usage

### MCP Tools

#### Page Management
- `get_pages` - List all pages with optional filtering
- `get_page` - Get specific page by ID
- `get_page_by_slug` - Get page by URL slug
- `create_page` - Create new page with markdown content
- `update_page` - Update existing page
- `delete_page` - Delete page (only if no children)
- `get_navigation` - Get hierarchical navigation tree

#### Categories & Tags
- `get_categories` - List all categories
- `create_category` - Create new category
- `get_tags` - List all tags
- `create_tag` - Create new tag

#### Comments
- `get_page_comments` - Get comments for a page
- `add_comment` - Add comment to page
- `delete_comment` - Delete comment

#### Search & Analytics
- `search_pages` - Full-text search with filtering
- `get_wiki_stats` - Wiki statistics and analytics

### MCP Resources

Access wiki data via URI resources:

- `wiki://pages` - All pages list
- `wiki://page/{id}` - Detailed page data
- `wiki://slug/{slug}` - Page by URL slug
- `wiki://categories` - All categories
- `wiki://tags` - All tags
- `wiki://stats` - Statistics
- `wiki://search/{query}` - Search results

### MCP Prompts

Workflow helpers:

- `create_knowledge_base` - Set up structured knowledge base
- `wiki_maintenance` - Generate maintenance reports

## API Examples

### Creating a Page

```typescript
// Using MCP tools
await server.callTool('create_page', {
  title: 'Getting Started',
  content: `# Getting Started

This is the main getting started guide.

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

\`\`\`bash
npm install
\`\`\`

See [[Configuration]] for setup details.
`,
  summary: 'Main getting started guide for new users',
  tag_names: ['guide', 'beginner'],
  is_published: true,
  created_by: 'admin'
});
```

### Searching Pages

```typescript
// Search with filters
await server.callTool('search_pages', {
  query: 'getting started',
  tag_names: ['guide'],
  include_drafts: false,
  limit: 10
});
```

### Creating Navigation Structure

```typescript
// Create parent page
const parent = await server.callTool('create_page', {
  title: 'User Guide',
  content: '# User Guide\n\nComprehensive user documentation.',
  is_published: true
});

// Create child page
await server.callTool('create_page', {
  title: 'Installation',
  content: '# Installation\n\nHow to install the software.',
  parent_id: parent.id,
  is_published: true
});
```

## Database Schema

The wiki uses a normalized relational schema:

- **pages**: Main page content and metadata
- **categories**: Page categorization
- **page_categories**: Many-to-many relationship
- **tags**: Flexible tagging system
- **page_tags**: Many-to-many relationship
- **page_links**: Internal link tracking
- **attachments**: File attachments (planned)
- **page_history**: Version control
- **comments**: Discussion system
- **pages_fts**: Full-text search index

## Development

### Project Structure

```
src/
├── database/           # Database layer
│   ├── index.ts       # Main database class
│   ├── schema.sql     # SQLite schema
│   └── schema.postgres.sql
├── services/          # Business logic
│   └── WikiService.ts
├── tools/             # MCP tools
│   ├── page/
│   ├── category/
│   ├── tag/
│   ├── comment/
│   └── search/
├── types/             # TypeScript types
├── utils/             # Utilities
│   └── markdown.ts    # Markdown processing
└── index.ts           # Server entry point
```

### Building and Testing

```bash
# Development mode
npm run dev

# Type checking
npm run typecheck

# Clean build
npm run clean && npm run build
```

## Roadmap

### Planned Features
- [ ] File attachments
- [ ] Page templates
- [ ] Advanced link analysis
- [ ] Page statistics (views, links)
- [ ] Export functionality (PDF, etc.)
- [ ] Bulk operations
- [ ] Page locking/editing conflicts
- [ ] Advanced search facets
- [ ] Integration with external systems

### Database Improvements
- [ ] PostgreSQL full implementation
- [ ] MySQL full implementation
- [ ] Database migrations system
- [ ] Performance optimizations
- [ ] Backup/restore utilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.