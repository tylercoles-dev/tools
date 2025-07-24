import { MCPServer } from '@tylercoles/mcp-server';
import { WikiDatabase } from '../database/index.js';
import { WikiService } from '../services/WikiService.js';

// Import tool implementations
import { registerPageTools } from './page/page-tools.js';
import { registerCategoryTools } from './category/category-tools.js';
import { registerTagTools } from './tag/tag-tools.js';
import { registerSearchTools } from './search/search-tools.js';
import { registerCommentTools } from './comment/comment-tools.js';

export function registerTools(server: MCPServer, db: WikiDatabase): void {
  const wikiService = new WikiService(db);

  // Register all tool categories
  registerPageTools(server, wikiService);
  registerCategoryTools(server, wikiService);
  registerTagTools(server, wikiService);
  registerSearchTools(server, wikiService);
  registerCommentTools(server, wikiService);
}