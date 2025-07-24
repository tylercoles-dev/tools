import { MCPServer } from '@tylercoles/mcp-server';
import { WikiService } from '../../services/WikiService.js';

export function registerTagTools(server: MCPServer, wikiService: WikiService): void {
  // Get all tags
  server.registerTool(
    'get_tags',
    {
      title: 'Get Tags',
      description: 'Retrieve all wiki tags',
      argsSchema: {
        type: 'object',
        properties: {},
      },
    },
    async (args: any) => {
      try {
        const tags = await wikiService.getTags();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              tags,
              total: tags.length,
              generated_at: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving tags: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Create tag
  server.registerTool(
    'create_tag',
    {
      title: 'Create Tag',
      description: 'Create a new wiki tag',
      argsSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the tag',
          },
          color: {
            type: 'string',
            description: 'Color code for the tag (hex format, e.g., #ff0000)',
            pattern: '^#[0-9A-Fa-f]{6}$',
          },
        },
        required: ['name'],
      },
    },
    async (args: any) => {
      try {
        const { name, color } = args;
        const tag = await wikiService.createTag(name, color);
        
        return {
          content: [{
            type: 'text',
            text: `Successfully created tag "${tag.name}" with ID ${tag.id}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating tag: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}