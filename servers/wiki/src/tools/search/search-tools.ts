import { MCPServer } from '@tylercoles/mcp-server';
import { WikiService } from '../../services/WikiService.js';

export function registerSearchTools(server: MCPServer, wikiService: WikiService): void {
  // Search pages
  server.registerTool(
    'search_pages',
    {
      title: 'Search Pages',
      description: 'Search wiki pages by content, title, or metadata',
      argsSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query text',
          },
          category_id: {
            type: 'number',
            description: 'Filter by category ID',
          },
          tag_names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by tag names',
          },
          include_drafts: {
            type: 'boolean',
            description: 'Include unpublished draft pages in results',
            default: false,
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 50,
          },
          offset: {
            type: 'number',
            description: 'Number of results to skip (for pagination)',
            default: 0,
          },
        },
        required: ['query'],
      },
    },
    async (args: any) => {
      try {
        const searchResults = await wikiService.searchPages(args);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              total_results: searchResults.length,
              results: searchResults,
              generated_at: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error searching pages: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get wiki statistics
  server.registerTool(
    'get_wiki_stats',
    {
      title: 'Get Wiki Statistics',
      description: 'Get comprehensive statistics about the wiki',
      argsSchema: {
        type: 'object',
        properties: {},
      },
    },
    async (args: any) => {
      try {
        const stats = await wikiService.getStats();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ...stats,
              generated_at: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving statistics: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}