import { WikiDatabase, Page, NewPage, PageUpdate, Category, Tag, Comment, NewComment } from '../database/index.js';
import { MarkdownProcessor, ParsedMarkdown } from '../utils/markdown.js';
import { 
  CreatePageRequest, 
  UpdatePageRequest, 
  SearchRequest, 
  SearchResult, 
  NavigationTree,
  WikiStats 
} from '../types/index.js';

export class WikiService {
  private markdownProcessor: MarkdownProcessor;

  constructor(private db: WikiDatabase) {
    this.markdownProcessor = new MarkdownProcessor();
  }

  // Page operations
  async createPage(request: CreatePageRequest): Promise<Page> {
    const { title, content, summary, category_ids, tag_names, is_published, parent_id, created_by } = request;

    // Generate slug from title
    const slug = this.markdownProcessor.generateSlug(title);
    
    // Check if slug already exists
    const existingPage = await this.db.getPageBySlug(slug);
    if (existingPage) {
      throw new Error(`A page with slug "${slug}" already exists`);
    }

    // Parse markdown content
    const parsed = this.markdownProcessor.parse(content);
    const finalSummary = summary || parsed.excerpt || '';

    // Create the page
    const newPage: NewPage = {
      title,
      slug,
      content,
      summary: finalSummary,
      is_published: is_published ?? true,
      parent_id: parent_id || null,
      created_by: created_by || null,
      updated_by: created_by || null,
    };

    const page = await this.db.createPage(newPage);

    // Handle categories
    if (category_ids && category_ids.length > 0) {
      await this.assignCategoriesToPage(page.id!, category_ids);
    }

    // Handle tags
    if (tag_names && tag_names.length > 0) {
      await this.assignTagsToPage(page.id!, tag_names);
    }

    // Process internal links
    await this.processPageLinks(page.id!, parsed.links);

    return page;
  }

  async updatePage(pageId: number, request: UpdatePageRequest): Promise<Page> {
    const { title, content, summary, category_ids, tag_names, is_published, parent_id, updated_by, change_reason } = request;

    // Get existing page
    const existingPage = await this.db.getPageById(pageId);
    if (!existingPage) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    // Create history entry before updating
    if (content !== undefined || title !== undefined) {
      await this.createPageHistory(pageId, existingPage, updated_by, change_reason);
    }

    const updates: PageUpdate = {
      updated_by: updated_by || null,
    };

    // Handle title change (regenerate slug if needed)
    if (title !== undefined && title !== existingPage.title) {
      const newSlug = this.markdownProcessor.generateSlug(title);
      const existingWithSlug = await this.db.getPageBySlug(newSlug);
      
      if (existingWithSlug && existingWithSlug.id !== pageId) {
        throw new Error(`A page with slug "${newSlug}" already exists`);
      }
      
      updates.title = title;
      updates.slug = newSlug;
    }

    // Handle content change
    if (content !== undefined) {
      const parsed = this.markdownProcessor.parse(content);
      updates.content = content;
      
      // Update summary if not explicitly provided
      if (summary === undefined && !existingPage.summary) {
        updates.summary = parsed.excerpt || '';
      }
      
      // Process internal links
      await this.processPageLinks(pageId, parsed.links);
    }

    if (summary !== undefined) {
      updates.summary = summary;
    }

    if (is_published !== undefined) {
      updates.is_published = is_published;
    }

    if (parent_id !== undefined) {
      updates.parent_id = parent_id;
    }

    // Update the page
    const updatedPage = await this.db.updatePage(pageId, updates);

    // Handle category changes
    if (category_ids !== undefined) {
      await this.assignCategoriesToPage(pageId, category_ids);
    }

    // Handle tag changes
    if (tag_names !== undefined) {
      await this.assignTagsToPage(pageId, tag_names);
    }

    return updatedPage;
  }

  async deletePage(pageId: number): Promise<void> {
    const page = await this.db.getPageById(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    // Check if page has children
    const children = await this.db.getPagesByParent(pageId);
    if (children.length > 0) {
      throw new Error('Cannot delete page with child pages. Move or delete child pages first.');
    }

    await this.db.deletePage(pageId);
  }

  async getPage(pageId: number): Promise<Page | null> {
    const page = await this.db.getPageById(pageId);
    if (!page) return null;

    // Enhance with related data
    const [categories, tags] = await Promise.all([
      this.db.getPageCategories(pageId),
      this.db.getPageTags(pageId),
    ]);

    return {
      ...page,
      categories,
      tags,
    };
  }

  async getPageBySlug(slug: string): Promise<Page | null> {
    const page = await this.db.getPageBySlug(slug);
    if (!page) return null;

    return this.getPage(page.id!);
  }

  async getPages(published_only = false): Promise<Page[]> {
    const pages = await this.db.getPages();
    return published_only ? pages.filter(p => p.is_published) : pages;
  }

  // Search operations
  async searchPages(request: SearchRequest): Promise<SearchResult[]> {
    const { query, category_id, tag_names, include_drafts = false, limit = 50 } = request;

    let pages = await this.db.searchPages(query, limit);

    // Filter by publication status
    if (!include_drafts) {
      pages = pages.filter(page => page.is_published);
    }

    // Filter by category
    if (category_id) {
      const categoryPages = new Set();
      for (const page of pages) {
        const categories = await this.db.getPageCategories(page.id!);
        if (categories.some(cat => cat.id === category_id)) {
          categoryPages.add(page.id);
        }
      }
      pages = pages.filter(page => categoryPages.has(page.id));
    }

    // Filter by tags
    if (tag_names && tag_names.length > 0) {
      const tagPages = new Set();
      for (const page of pages) {
        const tags = await this.db.getPageTags(page.id!);
        const pageTagNames = tags.map(tag => tag.name);
        if (tag_names.some(tagName => pageTagNames.includes(tagName))) {
          tagPages.add(page.id);
        }
      }
      pages = pages.filter(page => tagPages.has(page.id));
    }

    // Convert to search results
    return pages.map(page => ({
      page,
      excerpt: page.summary || undefined,
      score: 1.0, // TODO: Implement proper scoring
    }));
  }

  // Navigation operations
  async getNavigationTree(): Promise<NavigationTree[]> {
    const rootPages = await this.db.getPagesByParent(null);
    
    const buildTree = async (pages: Page[], level = 0): Promise<NavigationTree[]> => {
      const tree: NavigationTree[] = [];
      
      for (const page of pages) {
        const children = await this.db.getPagesByParent(page.id!);
        const childTree = await buildTree(children, level + 1);
        
        tree.push({
          page,
          children: childTree,
          level,
        });
      }
      
      return tree;
    };

    return buildTree(rootPages);
  }

  // Category operations
  async createCategory(name: string, description?: string, color?: string): Promise<Category> {
    return await this.db.createCategory({ name, description, color });
  }

  async getCategories(): Promise<Category[]> {
    return await this.db.getCategories();
  }

  // Tag operations
  async createTag(name: string, color?: string): Promise<Tag> {
    return await this.db.createTag({ name, color });
  }

  async getTags(): Promise<Tag[]> {
    return await this.db.getTags();
  }

  // Comment operations
  async addComment(pageId: number, content: string, author?: string, parentId?: number): Promise<Comment> {
    const page = await this.db.getPageById(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    const newComment: NewComment = {
      page_id: pageId,
      content,
      author: author || null,
      parent_id: parentId || null,
    };

    return await this.db.createComment(newComment);
  }

  async getPageComments(pageId: number): Promise<Comment[]> {
    return await this.db.getPageComments(pageId);
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.db.deleteComment(commentId);
  }

  // Statistics
  async getStats(): Promise<WikiStats> {
    const baseStats = await this.db.getStats();
    
    // TODO: Add recent activity and popular pages
    return {
      ...baseStats,
      recent_activity: [],
      popular_pages: [],
    };
  }

  // Private helper methods
  private async assignCategoriesToPage(pageId: number, categoryIds: number[]): Promise<void> {
    // Remove existing categories
    // TODO: Implement removal of existing categories
    
    // Add new categories
    for (const categoryId of categoryIds) {
      // TODO: Implement category assignment
    }
  }

  private async assignTagsToPage(pageId: number, tagNames: string[]): Promise<void> {
    // Remove existing tags
    // TODO: Implement removal of existing tags
    
    // Create or get tags and assign them
    for (const tagName of tagNames) {
      const tag = await this.db.getOrCreateTag(tagName);
      await this.db.addPageTag(pageId, tag.id!);
    }
  }

  private async processPageLinks(pageId: number, links: string[]): Promise<void> {
    // TODO: Process internal links and create link relationships
    // This would involve:
    // 1. Parsing wiki-style links [[PageName]]
    // 2. Finding target pages by slug
    // 3. Creating entries in page_links table
  }

  private async createPageHistory(pageId: number, page: Page, changedBy?: string, reason?: string): Promise<void> {
    // TODO: Implement page history creation
  }
}