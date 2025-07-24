import { MCPServer } from '@tylercoles/mcp-server';
import { WikiService } from '../../services/WikiService.js';

export function registerCategoryTools(server: MCPServer, wikiService: WikiService): void {
  // Get all categories
  server.registerTool(
    'get_categories',
    {
      title: 'Get Categories',
      description: 'Retrieve all wiki categories',
      argsSchema: {
        type: 'object',
        properties: {},
      },
    },
    async (args: any) => {
      try {
        const categories = await wikiService.getCategories();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              categories,
              total: categories.length,
              generated_at: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving categories: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Create category
  server.registerTool(
    'create_category',
    {
      title: 'Create Category',
      description: 'Create a new wiki category',
      argsSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the category',
          },
          description: {
            type: 'string',
            description: 'Description of the category',
          },
          color: {
            type: 'string',
            description: 'Color code for the category (hex format, e.g., #ff0000)',
            pattern: '^#[0-9A-Fa-f]{6}$',
          },
        },
        required: ['name'],
      },
    },
    async (args: any) => {
      try {
        const { name, description, color } = args;
        const category = await wikiService.createCategory(name, description, color);
        
        return {
          content: [{
            type: 'text',
            text: `Successfully created category "${category.name}" with ID ${category.id}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating category: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}