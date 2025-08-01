# Wiki Test Suite Documentation

This document provides comprehensive information about the Wiki functionality test suite for the MCP Tools web client.

## Overview

The Wiki test suite provides comprehensive test coverage for all Wiki functionality including page management, markdown editing, search, organization, and collaborative features. The tests are organized into multiple categories for different testing purposes.

## Test Structure

### Test Categories

#### 1. **End-to-End Tests** (`tests/e2e/`)
Complete user workflows testing full Wiki functionality:

- **`wiki-page-management.e2e.spec.ts`** - Page CRUD operations, hierarchy, templates
- **`wiki-markdown-editor.e2e.spec.ts`** - Comprehensive markdown editor testing  
- **`wiki-linking-system.e2e.spec.ts`** - Wiki links, auto-completion, broken links
- **`wiki-search-discovery.e2e.spec.ts`** - Search, filters, suggestions, analytics
- **`wiki-page-organization.e2e.spec.ts`** - Hierarchy, categories, tags, breadcrumbs

#### 2. **Visual Regression Tests** (`tests/visual/`)
Screenshot-based testing for UI consistency:

- **`wiki-visual-regression.visual.spec.ts`** - Complete visual testing suite

#### 3. **Smoke Tests** (`tests/smoke/`)
Fast, essential tests for critical functionality:

- **`wiki-smoke.smoke.spec.ts`** - Core functionality validation

#### 4. **Regression Tests** (`tests/regression/`)  
Tests protecting against previously fixed bugs:

- **`wiki-regression.regression.spec.ts`** - Bug prevention test suite

#### 5. **Accessibility Tests** (`tests/accessibility/`)
WCAG compliance and screen reader support:

- **`wiki-accessibility.a11y.spec.ts`** - Comprehensive accessibility testing

### Supporting Files

#### Test Data (`tests/fixtures/`)
- **`wiki-test-data.ts`** - Comprehensive test data fixtures and generators

#### Page Objects (`tests/pages/wiki/`)
- **`wiki-pages-page.ts`** - Page Object for Wiki listing page
- **`wiki-editor-page.ts`** - Page Object for Wiki editor/viewer
- **`index.ts`** - Exports for all Wiki page objects

#### Test Utilities (`tests/utils/`)
- **`wiki-test-helpers.ts`** - Helper functions and utilities for Wiki testing

## Test Coverage

### Core Functionality Tested

#### Page Management
- ✅ Page creation with validation
- ✅ Page editing (title, content, metadata)
- ✅ Page deletion with confirmation
- ✅ Hierarchical page structures
- ✅ Page templates and duplication
- ✅ Bulk operations
- ✅ Page history and versioning
- ✅ Import/export functionality

#### Markdown Editor
- ✅ Basic editor functionality (edit/view modes)
- ✅ Live preview synchronization
- ✅ Comprehensive markdown rendering
- ✅ GitHub Flavored Markdown support
- ✅ Editor toolbar and shortcuts
- ✅ Content validation and error handling
- ✅ Performance with large documents
- ✅ Auto-save functionality

#### Wiki Linking System
- ✅ Basic wiki link creation `[[PageName]]`
- ✅ Custom display text `[[PageName|Display]]`
- ✅ Wiki link navigation
- ✅ Broken link detection and handling
- ✅ Auto-completion suggestions
- ✅ Case sensitivity handling
- ✅ Special characters in links
- ✅ Performance with many links

#### Search and Discovery
- ✅ Basic text search
- ✅ Advanced search features
- ✅ Search filters (category, tags)
- ✅ Search performance optimization
- ✅ Result ranking and relevance
- ✅ Search suggestions and auto-complete
- ✅ Search history tracking
- ✅ Tag-based search
- ✅ Search analytics
- ✅ Error handling

#### Page Organization
- ✅ Hierarchical page structure
- ✅ Category management
- ✅ Tag system
- ✅ Breadcrumb navigation
- ✅ Table of contents generation
- ✅ Page collections and grouping

#### Visual and UX
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark mode support
- ✅ Loading states and error handling
- ✅ Visual consistency across components
- ✅ Cross-browser compatibility

#### Accessibility
- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ High contrast mode
- ✅ Focus management
- ✅ ARIA landmarks and labels

### Test Data Coverage

The test suite includes comprehensive test data:

- **Basic pages** - Simple content for fundamental testing
- **Markdown samples** - Complex formatting and edge cases
- **Hierarchical structures** - Parent-child relationships
- **Search content** - Optimized for search testing
- **Edge cases** - Special characters, large content, malicious input
- **Performance data** - Large documents and datasets

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Test Execution

#### Run All Wiki Tests
```bash
# All Wiki tests
npx playwright test tests/e2e/wiki* tests/visual/wiki* tests/smoke/wiki* tests/regression/wiki* tests/accessibility/wiki*

# Or using tags
npx playwright test --grep "wiki"
```

#### Run by Category
```bash
# E2E tests only
npx playwright test tests/e2e/wiki*

# Visual tests only  
npx playwright test tests/visual/wiki*

# Smoke tests only
npx playwright test tests/smoke/wiki* --grep "@smoke"

# Regression tests only
npx playwright test tests/regression/wiki* --grep "@regression"

# Accessibility tests only
npx playwright test tests/accessibility/wiki* --grep "@a11y"
```

#### Run Specific Test Files
```bash
# Page management tests
npx playwright test tests/e2e/wiki-page-management.e2e.spec.ts

# Markdown editor tests
npx playwright test tests/e2e/wiki-markdown-editor.e2e.spec.ts

# Search functionality tests
npx playwright test tests/e2e/wiki-search-discovery.e2e.spec.ts
```

#### Run with Different Browsers
```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only  
npx playwright test --project=firefox

# Mobile testing
npx playwright test --project="Mobile Chrome"
```

### Test Configuration

#### Environment Variables
```bash
# Base URL for testing
BASE_URL=http://localhost:3000

# Enable specific test types
VISUAL_TESTS=true
A11Y_TESTS=true  
PERF_TESTS=true
```

#### Playwright Configuration
The tests use the main `playwright.config.ts` with Wiki-specific settings:

- **Timeouts**: Adjusted for Wiki content loading
- **Screenshots**: Captured on failure for debugging
- **Trace**: Collected for test analysis
- **Parallel execution**: Optimized for Wiki test performance

## Test Data Management

### Test Data Creation
```typescript
// Using the test data generator
import { WikiTestDataGenerator } from '../fixtures/wiki-test-data';

const testPage = WikiTestDataGenerator.generatePage({
  title: 'Custom Test Page',
  category: 'testing'
});
```

### Test Helpers
```typescript
// Using test helpers
import { createWikiTestHelpers } from '../utils/wiki-test-helpers';

const testHelpers = createWikiTestHelpers(page);
await testHelpers.createTestPage(pageData);
await testHelpers.testMarkdownRendering(markdownTests);
```

### Cleanup
All tests include proper cleanup to maintain test isolation:

```typescript
test.afterEach(async () => {
  await testHelpers.cleanupTestData();
});
```

## Debugging Tests

### Debug Mode
```bash
# Run tests in debug mode
npx playwright test --debug

# Run specific test in debug mode
npx playwright test tests/e2e/wiki-page-management.e2e.spec.ts --debug
```

### Screenshots and Videos
```bash
# Force screenshots on all tests
npx playwright test --screenshot=on

# Generate test report with artifacts
npx playwright show-report
```

### Trace Viewer
```bash
# Open trace viewer
npx playwright show-trace test-results/trace.zip
```

## Performance Considerations

### Test Performance
- **Parallel execution** enabled for faster test runs
- **Test isolation** maintained while minimizing setup/teardown
- **Smart test data** reused where possible
- **Optimized selectors** for reliable element identification

### Performance Testing
The suite includes performance benchmarks:

- Page load times < 5 seconds
- Search response times < 2 seconds  
- Editor responsiveness < 1 second
- Large document handling < 10 seconds

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Wiki Tests
  run: |
    npx playwright test tests/e2e/wiki* tests/smoke/wiki*
    
- name: Run Visual Tests  
  run: |
    npx playwright test tests/visual/wiki*
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: wiki-test-results
    path: test-results/
```

### Test Reporting
- **HTML reports** with interactive results
- **JUnit XML** for CI integration
- **JSON results** for custom processing
- **Visual diff reports** for UI changes

## Maintenance Guidelines

### Adding New Tests
1. **Identify test category** (E2E, smoke, regression, etc.)
2. **Use existing page objects** and helpers
3. **Follow naming conventions**
4. **Include proper cleanup**
5. **Add appropriate test tags**

### Updating Test Data
1. **Update fixtures** in `wiki-test-data.ts`
2. **Regenerate test data** if schema changes
3. **Update helper functions** as needed
4. **Verify test compatibility**

### Page Object Updates
1. **Update selectors** when UI changes
2. **Add new methods** for new functionality
3. **Maintain backward compatibility** where possible
4. **Update documentation**

## Troubleshooting

### Common Issues

#### Test Timeouts
```typescript
// Increase timeout for slow operations
test.setTimeout(60000);

// Or use custom waits
await page.waitForLoadState('networkidle');
```

#### Element Not Found
```typescript
// Use more robust selectors
const element = page.locator('[data-testid="wiki-page-title"]')
  .or(page.locator('h1'))
  .or(page.locator('.page-title'));
```

#### Flaky Tests
```typescript
// Add proper waits
await expect(element).toBeVisible();
await page.waitForTimeout(500);

// Use retries for unstable operations
test.describe.configure({ retries: 2 });
```

### Getting Help

1. **Check test logs** in CI/CD output
2. **Review screenshots** and traces
3. **Run tests locally** with debug mode
4. **Check browser console** for errors
5. **Verify test data** setup

## Future Enhancements

### Planned Additions
- **Collaborative editing tests** - Multi-user scenarios
- **Comments system tests** - Discussion functionality  
- **Media upload tests** - File attachments and images
- **Performance monitoring** - Automated performance regression detection
- **Cross-tool integration** - Wiki links to Kanban/Memory tools

### Test Automation Improvements
- **Auto-generated test data** - Dynamic content based on app schema
- **Visual AI testing** - Automated visual regression detection
- **Accessibility monitoring** - Continuous WCAG compliance checking
- **Load testing integration** - Performance testing at scale

## Contributing

When contributing to the Wiki test suite:

1. **Follow existing patterns** and conventions
2. **Add comprehensive test coverage** for new features
3. **Include appropriate test categories** (E2E, smoke, etc.)
4. **Update documentation** as needed
5. **Ensure tests are reliable** and maintainable

For questions or issues with the test suite, please refer to the main project documentation or open an issue in the repository.