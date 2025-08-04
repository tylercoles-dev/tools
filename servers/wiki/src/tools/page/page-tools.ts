import { MCPServer } from '@tylercoles/mcp-server';
import { z } from 'zod';
import { WikiService } from '../../services/WikiService.js';

export function registerPageTools(server: MCPServer, wikiService: WikiService): void {
  // Get all pages
  server.registerTool(
    'get_pages',
    {
      title: 'Get Pages',
      description: 'Retrieve all wiki pages with optional filtering',
      argsSchema: z.object({
        published_only: z.boolean().optional().default(false).describe('Only return published pages'),
      }),
    },
    async (args: any) => {
      try {
        const { published_only = false } = args;
        const pages = await wikiService.getPages(published_only);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              pages,
              total: pages.length,
              generated_at: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving pages: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get page by ID
  server.registerTool(
    'get_page',
    {
      title: 'Get Page',
      description: 'Retrieve a specific wiki page by ID',
      argsSchema: z.object({
        page_id: z.number().describe('ID of the page to retrieve'),
      }),
    },
    async (args: any) => {
      try {
        const { page_id } = args;
        const page = await wikiService.getPage(page_id);
        
        if (!page) {
          return {
            content: [{
              type: 'text',
              text: `Page with ID ${page_id} not found`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(page, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving page: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get page by slug
  server.registerTool(
    'get_page_by_slug',
    {
      title: 'Get Page by Slug',
      description: 'Retrieve a specific wiki page by its slug',
      argsSchema: z.object({
        slug: z.string().describe('Slug of the page to retrieve'),
      }),
    },
    async (args: any) => {
      try {
        const { slug } = args;
        const page = await wikiService.getPageBySlug(slug);
        
        if (!page) {
          return {
            content: [{
              type: 'text',
              text: `Page with slug "${slug}" not found`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(page, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving page: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Create page
  server.registerTool(
    'create_page',
    {
      title: 'Create Page',
      description: 'Create a new wiki page',
      argsSchema: z.object({
        title: z.string().describe('Title of the page'),
        content: z.string().describe('Markdown content of the page'),
        summary: z.string().optional().describe('Optional summary/excerpt of the page'),
        category_ids: z.array(z.number()).optional().describe('Array of category IDs to assign to the page'),
        tag_names: z.array(z.string()).optional().describe('Array of tag names to assign to the page'),
        is_published: z.boolean().optional().default(true).describe('Whether the page should be published'),
        parent_id: z.number().optional().describe('ID of parent page for hierarchical organization'),
        created_by: z.string().optional().describe('Username or identifier of the page creator'),
      }),
    },
    async (args: any) => {
      try {
        const page = await wikiService.createPage(args);
        
        return {
          content: [{
            type: 'text',
            text: `Successfully created page "${page.title}" with ID ${page.id}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating page: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Update page
  server.registerTool(
    'update_page',
    {
      title: 'Update Page',
      description: 'Update an existing wiki page',
      argsSchema: z.object({
        page_id: z.number().describe('ID of the page to update'),
        title: z.string().optional().describe('New title of the page'),
        content: z.string().optional().describe('New markdown content of the page'),
        summary: z.string().optional().describe('New summary/excerpt of the page'),
        category_ids: z.array(z.number()).optional().describe('Array of category IDs to assign to the page'),
        tag_names: z.array(z.string()).optional().describe('Array of tag names to assign to the page'),
        is_published: z.boolean().optional().describe('Whether the page should be published'),
        parent_id: z.number().optional().describe('ID of parent page for hierarchical organization'),
        updated_by: z.string().optional().describe('Username or identifier of the person updating the page'),
        change_reason: z.string().optional().describe('Reason for the change (for version history)'),
      }),
    },
    async (args: any) => {
      try {
        const { page_id, ...updateData } = args;
        const page = await wikiService.updatePage(page_id, updateData);
        
        return {
          content: [{
            type: 'text',
            text: `Successfully updated page "${page.title}" (ID: ${page.id})`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error updating page: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Delete page
  server.registerTool(
    'delete_page',
    {
      title: 'Delete Page',
      description: 'Delete a wiki page',
      argsSchema: z.object({
        page_id: z.number().describe('ID of the page to delete'),
      }),
    },
    async (args: any) => {
      try {
        const { page_id } = args;
        await wikiService.deletePage(page_id);
        
        return {
          content: [{
            type: 'text',
            text: `Successfully deleted page with ID ${page_id}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error deleting page: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get navigation tree
  server.registerTool(
    'get_navigation',
    {
      title: 'Get Navigation Tree',
      description: 'Get hierarchical navigation tree of all pages',
      argsSchema: z.object({}),
    },
    async (args: any) => {
      try {
        const navigation = await wikiService.getNavigationTree();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              navigation,
              generated_at: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving navigation: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}