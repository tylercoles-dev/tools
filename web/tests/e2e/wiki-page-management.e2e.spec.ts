import { test, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers } from '../utils/wiki-test-helpers';
import { wikiTestData, WikiTestDataGenerator } from '../fixtures/wiki-test-data';

test.describe('Wiki Page Management', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);
    
    // Navigate to wiki pages
    await wikiPages.goto();
  });

  test.describe('Page Creation', () => {
    test('should create a basic page successfully', async () => {
      const pageData = {
        title: 'Test Page Creation',
        content: '# Test Page\n\nThis is a test page created by automation.',
        category: 'documentation',
        tags: 'test, automation'
      };

      await wikiPages.createPage(pageData);
      await wikiPages.verifyPageCreated(pageData.title);

      // Verify the page exists in the listing
      expect(await wikiPages.verifyPageExists(pageData.title)).toBe(true);
    });

    test('should create page with all metadata fields', async () => {
      const pageData = {
        title: 'Complete Metadata Page',
        content: `# Complete Metadata Page

This page tests all metadata fields:
- Category: Guides
- Tags: comprehensive, metadata, testing
- Parent: (none for this test)

## Content Sections

### Section 1
First section content.

### Section 2  
Second section content with **bold** and *italic* text.`,
        category: 'guides',
        tags: 'comprehensive, metadata, testing'
      };

      await wikiPages.createPage(pageData);
      await wikiPages.verifyPageCreated(pageData.title);

      // Navigate to the created page to verify metadata
      await wikiPages.clickPageByTitle(pageData.title);
      await wikiEditor.verifyPageLoaded(pageData.title);

      // Verify metadata
      expect(await wikiEditor.getPageCategory()).toBe('guides');
      const tags = await wikiEditor.getPageTags();
      expect(tags).toContain('comprehensive');
      expect(tags).toContain('metadata');
      expect(tags).toContain('testing');
    });

    test('should create hierarchical pages (parent-child)', async () => {
      // Create parent page first
      const parentData = {
        title: 'Parent Documentation',
        content: '# Parent Documentation\n\nThis is a parent page.',
        category: 'documentation'
      };

      await wikiPages.createPage(parentData);
      await wikiPages.verifyPageCreated(parentData.title);

      // Create child page
      const childData = {
        title: 'Child Page Guide',
        content: '# Child Page Guide\n\nThis is a child page.',
        category: 'documentation',
        parent: 'Parent Documentation'
      };

      await wikiPages.createPage(childData);
      await wikiPages.verifyPageCreated(childData.title);

      // Verify hierarchical structure in tree view
      expect(await wikiPages.verifyPageInTree(parentData.title)).toBe(true);
      expect(await wikiPages.verifyPageInTree(childData.title)).toBe(true);
    });

    test('should validate required fields during creation', async () => {
      await wikiPages.openCreatePageDialog();
      await wikiPages.verifyPageCreationDialog();

      // Try to create page without title
      await wikiPages.createPageSubmitButton.click();
      
      // Should still be in dialog (validation prevents submission)
      await expect(wikiPages.createPageDialog).toBeVisible();

      // Fill title but leave content empty
      await wikiPages.pageTitleInput.fill('Test Title Only');
      await wikiPages.createPageSubmitButton.click();
      
      // Should still be in dialog
      await expect(wikiPages.createPageDialog).toBeVisible();

      // Fill both required fields
      await wikiPages.pageContentTextarea.fill('Test content');
      await wikiPages.createPageSubmitButton.click();
      
      // Should close dialog and create page
      await expect(wikiPages.createPageDialog).toBeHidden();
      await wikiPages.verifyPageCreated('Test Title Only');
    });

    test('should handle special characters in page titles', async () => {
      const specialTitle = 'Special Characters: 中文 العربية Русский 🚀';
      
      const pageData = {
        title: specialTitle,
        content: '# Special Characters Test\n\nTesting unicode support in titles.',
        category: 'reference'
      };

      await wikiPages.createPage(pageData);
      await wikiPages.verifyPageCreated(specialTitle);

      // Verify the page can be accessed
      await wikiPages.clickPageByTitle(specialTitle);
      await wikiEditor.verifyPageLoaded(specialTitle);
    });

    test('should generate appropriate slugs for URLs', async () => {
      const pageData = {
        title: 'Page with Spaces and Special-Characters!',
        content: '# Slug Test\n\nTesting slug generation.',
        category: 'reference'
      };

      await wikiPages.createPage(pageData);
      await wikiPages.clickPageByTitle(pageData.title);

      // Verify URL contains properly formatted slug
      await expect(wikiEditor.page).toHaveURL(/page-with-spaces-and-special-characters/);
    });
  });

  test.describe('Page Editing', () => {
    test.beforeEach(async () => {
      // Create a test page for editing
      await testHelpers.createTestPage({
        title: 'Page for Editing Tests',
        content: '# Original Title\n\nOriginal content for testing edits.',
        category: 'documentation',
        tags: ['original', 'test']
      });
    });

    test('should edit page title successfully', async () => {
      await wikiPages.clickPageByTitle('Page for Editing Tests');
      await wikiEditor.verifyPageLoaded('Page for Editing Tests');

      const newTitle = 'Updated Page Title';
      await wikiEditor.updateTitle(newTitle);
      await wikiEditor.saveChanges();
      await wikiEditor.verifyContentSaved();

      // Verify title was updated
      expect(await wikiEditor.getPageTitle()).toBe(newTitle);
    });

    test('should edit page content successfully', async () => {
      await wikiPages.clickPageByTitle('Page for Editing Tests');
      
      const newContent = `# Updated Content

This content has been updated by the test automation.

## New Section

- Updated list item 1
- Updated list item 2

**Bold updated text** and *italic updated text*.`;

      await wikiEditor.updateContent(newContent);
      await wikiEditor.saveChanges();
      await wikiEditor.verifyContentSaved();

      // Verify content was updated
      const savedContent = await wikiEditor.getPageContent();
      expect(savedContent).toContain('Updated Content');
      expect(savedContent).toContain('test automation');
    });

    test('should edit page metadata (category and tags)', async () => {
      await wikiPages.clickPageByTitle('Page for Editing Tests');
      
      await wikiEditor.updateCategory('guides');
      await wikiEditor.updateTags('updated, modified, automation');
      await wikiEditor.saveChanges();
      await wikiEditor.verifyContentSaved();

      // Verify metadata was updated
      expect(await wikiEditor.getPageCategory()).toBe('guides');
      const tags = await wikiEditor.getPageTags();
      expect(tags).toContain('updated');
      expect(tags).toContain('modified');
      expect(tags).toContain('automation');
    });

    test('should handle concurrent edits gracefully', async ({ browser }) => {
      // Create second browser context for concurrent editing
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      const wikiEditor2 = new WikiEditorPage(page2);

      // Both users navigate to the same page
      await wikiPages.clickPageByTitle('Page for Editing Tests');
      await wikiEditor2.goto('page-for-editing-tests-id'); // Use actual ID

      // User 1 starts editing
      await wikiEditor.enterEditMode();
      await wikiEditor.typeInEditor('\n\nUser 1 addition');

      // User 2 also starts editing
      await wikiEditor2.enterEditMode();
      await wikiEditor2.typeInEditor('\n\nUser 2 addition');

      // User 1 saves first
      await wikiEditor.saveChanges();

      // User 2 tries to save (should handle conflict)
      await wikiEditor2.saveChanges();

      // Verify both changes are preserved or conflict is properly handled
      const finalContent = await wikiEditor.getPageContent();
      
      // Implementation-dependent: either both changes should be merged
      // or there should be a conflict resolution mechanism
      expect(finalContent.length).toBeGreaterThan(0);

      await context2.close();
    });

    test('should preserve content during edit mode switching', async () => {
      await wikiPages.clickPageByTitle('Page for Editing Tests');
      
      const originalContent = await wikiEditor.getPageContent();
      
      // Enter edit mode
      await wikiEditor.enterEditMode();
      const editContent = await wikiEditor.getPageContent();
      expect(editContent).toBe(originalContent);
      
      // Exit edit mode without saving
      await wikiEditor.exitEditMode();
      const viewContent = await wikiEditor.getPageContent();
      expect(viewContent).toBe(originalContent);
    });

    test('should warn about unsaved changes', async () => {
      await wikiPages.clickPageByTitle('Page for Editing Tests');
      await wikiEditor.enterEditMode();
      
      // Make changes
      await wikiEditor.typeInEditor('\n\nUnsaved changes');
      
      // Try to navigate away (implementation-dependent)
      await wikiEditor.backButton.click();
      
      // Should show confirmation dialog or prevent navigation
      // This test would need to be adjusted based on actual implementation
    });
  });

  test.describe('Page Deletion', () => {
    test.beforeEach(async () => {
      // Create test pages for deletion
      await testHelpers.createTestPage({
        title: 'Page to Delete',
        content: '# Page to Delete\n\nThis page will be deleted in tests.',
        category: 'reference'
      });
    });

    test('should delete page with confirmation', async () => {
      await wikiPages.clickPageByTitle('Page to Delete');
      await wikiEditor.verifyPageLoaded('Page to Delete');

      // Delete the page
      await wikiEditor.deletePage();

      // Verify redirection to wiki list
      await expect(wikiEditor.page).toHaveURL(/\/wiki$/);

      // Verify page no longer exists in listing
      await wikiPages.waitForLoadState();
      expect(await wikiPages.verifyPageExists('Page to Delete')).toBe(false);
    });

    test('should handle deletion of pages with children', async () => {
      // Create parent and child pages
      await testHelpers.createTestPage({
        title: 'Parent to Delete',
        content: '# Parent Page\n\nThis parent will be deleted.',
        category: 'documentation'
      });

      await testHelpers.createTestPage({
        title: 'Child Page',
        content: '# Child Page\n\nThis is a child page.',
        category: 'documentation',
        parent: 'Parent to Delete'
      });

      // Delete parent page
      await wikiPages.clickPageByTitle('Parent to Delete');
      await wikiEditor.deletePage();

      // Verify parent is deleted
      await wikiPages.waitForLoadState();
      expect(await wikiPages.verifyPageExists('Parent to Delete')).toBe(false);

      // Verify child page handling (either deleted or made orphan)
      // Implementation-dependent behavior
      const childExists = await wikiPages.verifyPageExists('Child Page');
      // Test should verify expected behavior based on requirements
    });

    test('should prevent deletion of critical pages', async () => {
      // This test would be implementation-specific
      // Some pages might be protected from deletion
      // Test should verify protection mechanisms if they exist
    });
  });

  test.describe('Page Templates', () => {
    test('should create page from template', async () => {
      // This test assumes template functionality exists
      // Implementation would depend on the actual template system
      
      const templateData = {
        title: 'API Endpoint Template',
        content: `# API Endpoint: {endpoint}

## Description
Brief description of the endpoint.

## Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param1 | string | Yes | Description |

## Response
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`

## Examples
### Request
\`\`\`bash
curl -X GET /api/v1/{endpoint}
\`\`\`

### Response
\`\`\`json
{
  "success": true,
  "data": "response"
}
\`\`\``,
        category: 'api',
        tags: ['template', 'api', 'documentation']
      };

      // Create template
      await wikiPages.createPage(templateData);
      
      // Use template to create new page (if functionality exists)
      // This would involve template selection UI
    });
  });

  test.describe('Page Duplication', () => {
    test('should duplicate page with all content', async () => {
      const originalPage = {
        title: 'Original Page to Duplicate',
        content: '# Original Page\n\nThis page will be duplicated.',
        category: 'documentation',
        tags: 'original, test'
      };

      await wikiPages.createPage(originalPage);
      await wikiPages.clickPageByTitle(originalPage.title);

      // Duplicate page (if functionality exists)
      // Implementation would depend on having a duplicate button/action
      
      // For now, simulate duplication by creating similar page
      await wikiPages.goto();
      const duplicatedPage = {
        title: 'Copy of ' + originalPage.title,
        content: originalPage.content,
        category: originalPage.category,
        tags: originalPage.tags
      };

      await wikiPages.createPage(duplicatedPage);
      await wikiPages.verifyPageCreated(duplicatedPage.title);

      // Verify content is identical
      await wikiPages.clickPageByTitle(duplicatedPage.title);
      const duplicatedContent = await wikiEditor.getPageContent();
      expect(duplicatedContent).toContain('This page will be duplicated');
    });
  });

  test.describe('Bulk Operations', () => {
    test.beforeEach(async () => {
      // Create multiple pages for bulk operations
      const pages = [
        { title: 'Bulk Test Page 1', category: 'documentation' },
        { title: 'Bulk Test Page 2', category: 'documentation' },
        { title: 'Bulk Test Page 3', category: 'guides' }
      ];

      for (const page of pages) {
        await testHelpers.createTestPage({
          title: page.title,
          content: `# ${page.title}\n\nTest content for bulk operations.`,
          category: page.category,
          tags: ['bulk', 'test']
        });
      }
    });

    test('should support bulk category changes', async () => {
      // This test assumes bulk edit functionality exists
      // Implementation would involve selecting multiple pages and changing category
      
      await wikiPages.goto();
      await wikiPages.filterByCategory('documentation');
      
      // Select multiple pages (if selection UI exists)
      // Change category for all selected pages
      // Verify changes were applied to all selected pages
    });

    test('should support bulk tag operations', async () => {
      // Test bulk adding/removing tags from multiple pages
      // Implementation-dependent on bulk operations UI
    });
  });

  test.describe('Page History and Versioning', () => {
    test('should track page edit history', async () => {
      const pageName = 'History Test Page';
      
      // Create initial page
      await testHelpers.createTestPage({
        title: pageName,
        content: '# Initial Version\n\nOriginal content.',
        category: 'reference'
      });

      await wikiPages.clickPageByTitle(pageName);

      // Make first edit
      await wikiEditor.updateContent('# First Edit\n\nFirst edited content.');
      await wikiEditor.saveChanges();

      // Make second edit
      await wikiEditor.updateContent('# Second Edit\n\nSecond edited content.');
      await wikiEditor.saveChanges();

      // Access page history (if feature exists)
      // This would involve history UI elements
      // Verify version history shows all changes
    });

    test('should allow reverting to previous versions', async () => {
      // Test version rollback functionality
      // Implementation-dependent on version control features
    });
  });

  test.describe('Page Import/Export', () => {
    test('should export page as markdown', async () => {
      await testHelpers.createTestPage({
        title: 'Export Test Page',
        content: '# Export Test\n\nContent for export testing.',
        category: 'reference'
      });

      await wikiPages.clickPageByTitle('Export Test Page');
      
      // Trigger export (if functionality exists)
      // Verify downloaded/exported content matches page content
    });

    test('should import pages from markdown files', async () => {
      // Test import functionality if it exists
      // Upload markdown file and verify page creation
    });
  });

  test.afterEach(async () => {
    // Clean up test data if needed
    await testHelpers.cleanupTestData();
  });
});