/**
 * Wiki Tools Unit Tests
 * 
 * Comprehensive test suite for Wiki MCP tools
 */

import { registerPageTools } from './page/page-tools.js';
import type { MCPServer } from '@tylercoles/mcp-server';
import type { WikiService } from '../services/WikiService.js';

// Mock the MCP server
const mockMCPServer = {
  registerTool: jest.fn(),
} as jest.Mocked<MCPServer>;

// Mock the WikiService
const mockWikiService = {
  getPages: jest.fn(),
  getPage: jest.fn(),
  getPageBySlug: jest.fn(),
  createPage: jest.fn(),
  updatePage: jest.fn(),
  deletePage: jest.fn(),
  getNavigationTree: jest.fn(),
} as jest.Mocked<WikiService>;

describe('Wiki Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Tools Registration', () => {
    it('should register all page tools', () => {
      registerPageTools(mockMCPServer, mockWikiService);

      expect(mockMCPServer.registerTool).toHaveBeenCalledTimes(7);
      
      // Check that all expected tools are registered
      const registeredTools = mockMCPServer.registerTool.mock.calls.map(call => call[0]);
      expect(registeredTools).toContain('get_pages');
      expect(registeredTools).toContain('get_page');
      expect(registeredTools).toContain('get_page_by_slug');
      expect(registeredTools).toContain('create_page');
      expect(registeredTools).toContain('update_page');
      expect(registeredTools).toContain('delete_page');
      expect(registeredTools).toContain('get_navigation');
    });
  });

  describe('get_pages tool', () => {
    let getPagesTool: any;

    beforeEach(() => {
      registerPageTools(mockMCPServer, mockWikiService);
      // Get the get_pages tool handler
      const getPagesCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'get_pages');
      getPagesTool = getPagesCall?.[2];
    });

    it('should retrieve all pages successfully', async () => {
      const mockPages = [
        { id: 1, title: 'Page 1', slug: 'page-1', is_published: true },
        { id: 2, title: 'Page 2', slug: 'page-2', is_published: false }
      ];

      mockWikiService.getPages.mockResolvedValue(mockPages);

      const result = await getPagesTool({ published_only: false });

      expect(mockWikiService.getPages).toHaveBeenCalledWith(false);
      expect(result.content[0].text).toContain('"total": 2');
      expect(result.content[0].text).toContain('Page 1');
      expect(result.content[0].text).toContain('Page 2');
    });

    it('should retrieve only published pages when requested', async () => {
      const mockPages = [
        { id: 1, title: 'Published Page', slug: 'published', is_published: true }
      ];

      mockWikiService.getPages.mockResolvedValue(mockPages);

      const result = await getPagesTool({ published_only: true });

      expect(mockWikiService.getPages).toHaveBeenCalledWith(true);
      expect(result.content[0].text).toContain('"total": 1');
      expect(result.content[0].text).toContain('Published Page');
    });

    it('should handle empty page list', async () => {
      mockWikiService.getPages.mockResolvedValue([]);

      const result = await getPagesTool({});

      expect(result.content[0].text).toContain('"total": 0');
      expect(result.content[0].text).toContain('"pages": []');
    });

    it('should handle service errors', async () => {
      mockWikiService.getPages.mockRejectedValue(new Error('Database error'));

      const result = await getPagesTool({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving pages: Database error');
    });
  });

  describe('get_page tool', () => {
    let getPageTool: any;

    beforeEach(() => {
      registerPageTools(mockMCPServer, mockWikiService);
      const getPageCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'get_page');
      getPageTool = getPageCall?.[2];
    });

    it('should retrieve page by ID successfully', async () => {
      const mockPage = {
        id: 1,
        title: 'Test Page',
        slug: 'test-page',
        content: 'Page content',
        is_published: true
      };

      mockWikiService.getPage.mockResolvedValue(mockPage);

      const result = await getPageTool({ page_id: 1 });

      expect(mockWikiService.getPage).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Test Page');
      expect(result.content[0].text).toContain('Page content');
      expect(result.isError).toBeUndefined();
    });

    it('should handle page not found', async () => {
      mockWikiService.getPage.mockResolvedValue(null);

      const result = await getPageTool({ page_id: 999 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Page with ID 999 not found');
    });

    it('should handle service errors', async () => {
      mockWikiService.getPage.mockRejectedValue(new Error('Database error'));

      const result = await getPageTool({ page_id: 1 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving page: Database error');
    });
  });

  describe('get_page_by_slug tool', () => {
    let getPageBySlugTool: any;

    beforeEach(() => {
      registerPageTools(mockMCPServer, mockWikiService);
      const getPageBySlugCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'get_page_by_slug');
      getPageBySlugTool = getPageBySlugCall?.[2];
    });

    it('should retrieve page by slug successfully', async () => {
      const mockPage = {
        id: 1,
        title: 'Test Page',
        slug: 'test-page',
        content: 'Page content'
      };

      mockWikiService.getPageBySlug.mockResolvedValue(mockPage);

      const result = await getPageBySlugTool({ slug: 'test-page' });

      expect(mockWikiService.getPageBySlug).toHaveBeenCalledWith('test-page');
      expect(result.content[0].text).toContain('Test Page');
      expect(result.isError).toBeUndefined();
    });

    it('should handle page not found', async () => {
      mockWikiService.getPageBySlug.mockResolvedValue(null);

      const result = await getPageBySlugTool({ slug: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Page with slug "nonexistent" not found');
    });

    it('should handle service errors', async () => {
      mockWikiService.getPageBySlug.mockRejectedValue(new Error('Database error'));

      const result = await getPageBySlugTool({ slug: 'test-page' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving page: Database error');
    });
  });

  describe('create_page tool', () => {
    let createPageTool: any;

    beforeEach(() => {
      registerPageTools(mockMCPServer, mockWikiService);
      const createPageCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'create_page');
      createPageTool = createPageCall?.[2];
    });

    it('should create page successfully', async () => {
      const pageData = {
        title: 'New Page',
        content: 'Page content',
        summary: 'Page summary',
        category_ids: [1, 2],
        tag_names: ['tag1', 'tag2'],
        is_published: true,
        created_by: 'user1'
      };

      const mockCreatedPage = {
        id: 1,
        ...pageData,
        slug: 'new-page'
      };

      mockWikiService.createPage.mockResolvedValue(mockCreatedPage);

      const result = await createPageTool(pageData);

      expect(mockWikiService.createPage).toHaveBeenCalledWith(pageData);
      expect(result.content[0].text).toContain('Successfully created page "New Page" with ID 1');
      expect(result.isError).toBeUndefined();
    });

    it('should create page with minimal data', async () => {
      const pageData = {
        title: 'Minimal Page',
        content: 'Basic content'
      };

      const mockCreatedPage = {
        id: 2,
        ...pageData,
        slug: 'minimal-page'
      };

      mockWikiService.createPage.mockResolvedValue(mockCreatedPage);

      const result = await createPageTool(pageData);

      expect(mockWikiService.createPage).toHaveBeenCalledWith(pageData);
      expect(result.content[0].text).toContain('Successfully created page "Minimal Page" with ID 2');
    });

    it('should handle service errors', async () => {
      const pageData = {
        title: 'New Page',
        content: 'Page content'
      };

      mockWikiService.createPage.mockRejectedValue(new Error('Validation error'));

      const result = await createPageTool(pageData);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating page: Validation error');
    });
  });

  describe('update_page tool', () => {
    let updatePageTool: any;

    beforeEach(() => {
      registerPageTools(mockMCPServer, mockWikiService);
      const updatePageCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'update_page');
      updatePageTool = updatePageCall?.[2];
    });

    it('should update page successfully', async () => {
      const updateData = {
        page_id: 1,
        title: 'Updated Page',
        content: 'Updated content',
        is_published: false,
        updated_by: 'user2',
        change_reason: 'Fixed typos'
      };

      const mockUpdatedPage = {
        id: 1,
        title: 'Updated Page',
        content: 'Updated content',
        is_published: false
      };

      mockWikiService.updatePage.mockResolvedValue(mockUpdatedPage);

      const result = await updatePageTool(updateData);

      expect(mockWikiService.updatePage).toHaveBeenCalledWith(1, {
        title: 'Updated Page',
        content: 'Updated content',
        is_published: false,
        updated_by: 'user2',
        change_reason: 'Fixed typos'
      });
      expect(result.content[0].text).toContain('Successfully updated page "Updated Page" (ID: 1)');
      expect(result.isError).toBeUndefined();
    });

    it('should update page with partial data', async () => {
      const updateData = {
        page_id: 1,
        title: 'New Title Only'
      };

      const mockUpdatedPage = {
        id: 1,
        title: 'New Title Only'
      };

      mockWikiService.updatePage.mockResolvedValue(mockUpdatedPage);

      const result = await updatePageTool(updateData);

      expect(mockWikiService.updatePage).toHaveBeenCalledWith(1, {
        title: 'New Title Only'
      });
      expect(result.content[0].text).toContain('Successfully updated page "New Title Only" (ID: 1)');
    });

    it('should handle service errors', async () => {
      const updateData = {
        page_id: 999,
        title: 'Updated Page'
      };

      mockWikiService.updatePage.mockRejectedValue(new Error('Page not found'));

      const result = await updatePageTool(updateData);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error updating page: Page not found');
    });
  });

  describe('delete_page tool', () => {
    let deletePageTool: any;

    beforeEach(() => {
      registerPageTools(mockMCPServer, mockWikiService);
      const deletePageCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'delete_page');
      deletePageTool = deletePageCall?.[2];
    });

    it('should delete page successfully', async () => {
      mockWikiService.deletePage.mockResolvedValue(undefined);

      const result = await deletePageTool({ page_id: 1 });

      expect(mockWikiService.deletePage).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Successfully deleted page with ID 1');
      expect(result.isError).toBeUndefined();
    });

    it('should handle service errors', async () => {
      mockWikiService.deletePage.mockRejectedValue(new Error('Page not found'));

      const result = await deletePageTool({ page_id: 999 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error deleting page: Page not found');
    });
  });

  describe('get_navigation tool', () => {
    let getNavigationTool: any;

    beforeEach(() => {
      registerPageTools(mockMCPServer, mockWikiService);
      const getNavigationCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'get_navigation');
      getNavigationTool = getNavigationCall?.[2];
    });

    it('should retrieve navigation tree successfully', async () => {
      const mockNavigation = [
        {
          id: 1,
          title: 'Root Page',
          slug: 'root',
          children: [
            {
              id: 2,
              title: 'Child Page',
              slug: 'child',
              children: []
            }
          ]
        }
      ];

      mockWikiService.getNavigationTree.mockResolvedValue(mockNavigation);

      const result = await getNavigationTool({});

      expect(mockWikiService.getNavigationTree).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Root Page');
      expect(result.content[0].text).toContain('Child Page');
      expect(result.content[0].text).toContain('"navigation":');
      expect(result.isError).toBeUndefined();
    });

    it('should handle empty navigation', async () => {
      mockWikiService.getNavigationTree.mockResolvedValue([]);

      const result = await getNavigationTool({});

      expect(result.content[0].text).toContain('"navigation": []');
    });

    it('should handle service errors', async () => {
      mockWikiService.getNavigationTree.mockRejectedValue(new Error('Database error'));

      const result = await getNavigationTool({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving navigation: Database error');
    });
  });

  describe('Tool Configuration', () => {
    it('should have proper configuration for get_pages tool', () => {
      registerPageTools(mockMCPServer, mockWikiService);
      
      const getPagesCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'get_pages');
      const config = getPagesCall?.[1];

      expect(config.title).toBe('Get Pages');
      expect(config.description).toContain('Retrieve all wiki pages');
      expect(config.argsSchema.properties.published_only).toBeDefined();
    });

    it('should have proper configuration for create_page tool', () => {
      registerPageTools(mockMCPServer, mockWikiService);
      
      const createPageCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'create_page');
      const config = createPageCall?.[1];

      expect(config.title).toBe('Create Page');
      expect(config.description).toContain('Create a new wiki page');
      expect(config.argsSchema.required).toEqual(['title', 'content']);
      expect(config.argsSchema.properties.title).toBeDefined();
      expect(config.argsSchema.properties.content).toBeDefined();
      expect(config.argsSchema.properties.category_ids).toBeDefined();
      expect(config.argsSchema.properties.tag_names).toBeDefined();
    });

    it('should have proper configuration for update_page tool', () => {
      registerPageTools(mockMCPServer, mockWikiService);
      
      const updatePageCall = mockMCPServer.registerTool.mock.calls.find(call => call[0] === 'update_page');
      const config = updatePageCall?.[1];

      expect(config.title).toBe('Update Page');
      expect(config.description).toContain('Update an existing wiki page');
      expect(config.argsSchema.required).toEqual(['page_id']);
      expect(config.argsSchema.properties.page_id).toBeDefined();
      expect(config.argsSchema.properties.change_reason).toBeDefined();
    });
  });
});