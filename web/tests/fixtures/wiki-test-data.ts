/**
 * Comprehensive Wiki test data fixtures for all test scenarios
 */

export interface TestWikiPage {
  title: string;
  slug: string;
  content: string;
  tags?: string[];
  category?: string;
  parent?: string;
  author?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestWikiComment {
  content: string;
  author: string;
  parentId?: string;
  mentions?: string[];
}

export interface TestWikiCategory {
  name: string;
  description: string;
  color?: string;
}

/**
 * Basic Wiki page fixtures for fundamental testing
 */
export const basicWikiPages: Record<string, TestWikiPage> = {
  welcomePage: {
    title: 'Welcome to the Wiki',
    slug: 'welcome-to-the-wiki',
    content: `# Welcome to the Wiki

This is your knowledge base where you can document everything important for your team.

## Getting Started

1. Create new pages using the "New Page" button
2. Organize pages with categories and tags
3. Link pages together using [[Page Name]] syntax
4. Use markdown for rich formatting

## Features

- Rich markdown editor with live preview
- Hierarchical page organization
- Full-text search across all content
- Collaborative editing with real-time updates
- Comments and discussions on pages
- File attachments and media embedding

Start building your knowledge base today!`,
    tags: ['welcome', 'getting-started'],
    category: 'documentation',
    isPublished: true
  },

  quickStart: {
    title: 'Quick Start Guide',
    slug: 'quick-start-guide',
    content: `# Quick Start Guide

Get up and running with the Wiki in minutes.

## Creating Your First Page

1. Click the "New Page" button in the header
2. Enter a descriptive title
3. Choose a category (optional)
4. Add relevant tags
5. Write your content using markdown
6. Click "Create Page"

## Organizing Content

### Categories
Use categories to group related pages:
- **Documentation** - User guides and references
- **Guides** - Step-by-step tutorials
- **API** - Technical documentation
- **Tutorials** - Learning materials
- **Reference** - Quick lookups

### Tags
Tags provide flexible organization:
- Use specific tags like \`setup\`, \`configuration\`, \`troubleshooting\`
- Keep tags consistent across similar pages
- Use multiple tags to improve discoverability

## Linking Pages

Create connections between pages using wiki links:
- [[Welcome to the Wiki]] - Links to another page
- [[Page Title|Display Text]] - Custom link text
- Broken links show in red and suggest creating new pages`,
    tags: ['guide', 'tutorial', 'basics'],
    category: 'guides',
    isPublished: true
  },

  emptyPage: {
    title: 'Empty Test Page',
    slug: 'empty-test-page', 
    content: '',
    tags: [],
    category: '',
    isPublished: false
  }
};

/**
 * Advanced markdown content for testing rich formatting
 */
export const markdownTestPages: Record<string, TestWikiPage> = {
  comprehensiveMarkdown: {
    title: 'Comprehensive Markdown Test',
    slug: 'comprehensive-markdown-test',
    content: `# Comprehensive Markdown Test

This page tests all supported markdown features for UI consistency.

## Text Formatting

**Bold text** and *italic text* and ***bold italic text***

~~Strikethrough text~~ and \`inline code\`

Superscript: x^2^ and subscript: H~2~O (if supported)

## Headers

# H1 Header
## H2 Header  
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header

## Lists

### Unordered Lists
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
    - Deep nested item 2.2.1
- Item 3

### Ordered Lists
1. First item
2. Second item
   1. Nested first
   2. Nested second
3. Third item

### Task Lists
- [x] Completed task
- [x] Another completed task
- [ ] Incomplete task
- [ ] Another incomplete task

## Code Blocks

Inline \`code\` and code blocks:

\`\`\`javascript
function testFunction() {
  console.log('This is a JavaScript test');
  const data = {
    name: 'test',
    value: 42,
    active: true
  };
  return data;
}

// Test different syntax highlighting
const arrow = () => 'ES6 arrow function';
\`\`\`

\`\`\`python
def test_function():
    """This is a Python test"""
    data = {
        'name': 'test',
        'value': 42,
        'active': True
    }
    print(f"Data: {data}")
    return data

# Test different Python features
class TestClass:
    def __init__(self, name):
        self.name = name
\`\`\`

\`\`\`sql
-- SQL syntax test
SELECT 
    users.id,
    users.name,
    COUNT(posts.id) as post_count
FROM users
LEFT JOIN posts ON users.id = posts.user_id
WHERE users.active = true
GROUP BY users.id, users.name
ORDER BY post_count DESC
LIMIT 10;
\`\`\`

\`\`\`json
{
  "name": "Test JSON",
  "version": "1.0.0",
  "features": [
    "syntax highlighting",
    "code blocks",
    "multiple languages"
  ],
  "active": true,
  "count": 42
}
\`\`\`

## Links and References

### External Links
- [Google](https://google.com)
- [GitHub](https://github.com)
- [Documentation](https://docs.example.com/guide)

### Wiki Links (Internal)
- [[Welcome to the Wiki]]
- [[Quick Start Guide]]
- [[Non-existent Page]] (should show as broken link)
- [[API Reference]] (test auto-completion)

### Reference Links
[Link to Google][google-ref]
[Link to GitHub][github-ref]

[google-ref]: https://google.com "Google Search"
[github-ref]: https://github.com "GitHub Platform"

## Images and Media

![Alt text for image](https://via.placeholder.com/400x200.png?text=Test+Image)

![Local image](./images/test-image.png "Local test image")

## Tables

### Simple Table
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data 1   | Value 1  |
| Row 2    | Data 2   | Value 2  |
| Row 3    | Data 3   | Value 3  |

### Aligned Table
| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
| Text         | Text           | Text          |
| More         | Content        | Here          |

### Complex Table
| Feature | Status | Priority | Assignee | Due Date |
|---------|--------|----------|----------|----------|
| **User Auth** | ✅ Complete | High | @john | 2024-01-15 |
| **API Docs** | 🚧 In Progress | Medium | @jane | 2024-01-20 |
| **Testing** | ⏳ Pending | High | @bob | 2024-01-25 |

## Blockquotes

> This is a simple blockquote
> It can span multiple lines

> ### Blockquote with Header
> This blockquote contains a header and multiple paragraphs.
>
> It demonstrates complex blockquote formatting.
> 
> > Nested blockquotes are also supported
> > When needed for complex content

## Horizontal Rules

Content above the rule

---

Content below the rule

***

Another rule style

## Mathematical Expressions (if supported)

Inline math: $E = mc^2$

Block math:
$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$

$$
f(x) = \\int_{-\\infty}^{\\infty} \\hat f(\\xi) e^{2 \\pi i \\xi x} d\\xi
$$

## Special Characters and Entities

Copyright © 2024, Trademark ™, Registered ®

Arrows: ← ↑ → ↓ ↔ ↕

Mathematical: ± × ÷ ≤ ≥ ≠ ≈ ∞

Currency: $ € £ ¥ ¢

## Footnotes (if supported)

This is a sentence with a footnote[^1].

This is another sentence with a footnote[^note].

[^1]: This is the first footnote.
[^note]: This is a named footnote with more content.

## Definition Lists (if supported)

Term 1
: Definition for term 1

Term 2
: Definition for term 2
: Another definition for term 2

## Admonitions/Alerts (if supported)

:::info
This is an info admonition
:::

:::warning
This is a warning admonition
:::

:::danger
This is a danger admonition
:::

:::tip
This is a tip admonition
:::

## HTML in Markdown (if allowed)

<details>
<summary>Click to expand</summary>

This content is hidden by default and can be expanded.

- Item 1
- Item 2
- Item 3

</details>

<div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
This is a custom styled div block.
</div>

## Complex Nested Content

1. **First level list item**
   
   This item contains a paragraph of text explaining the first point.
   
   \`\`\`javascript
   // Code block within list item
   const example = 'nested code';
   \`\`\`
   
   - Nested unordered item
   - Another nested item
   
2. **Second level list item**
   
   > Blockquote within list item
   > With multiple lines
   
   | Column A | Column B |
   |----------|----------|
   | Data 1   | Data 2   |
   
3. **Third level list item**
   
   ![Image within list](https://via.placeholder.com/200x100.png?text=Nested+Image)

---

This comprehensive test covers most markdown features and edge cases.`,
    tags: ['markdown', 'testing', 'formatting', 'comprehensive'],
    category: 'reference',
    isPublished: true
  },

  wikiLinksTest: {
    title: 'Wiki Links Test Page',
    slug: 'wiki-links-test-page',
    content: `# Wiki Links Test Page

This page tests various wiki linking scenarios:

## Basic Wiki Links
- [[Welcome to the Wiki]] - Link to existing page
- [[Quick Start Guide]] - Another existing page
- [[Non-existent Page]] - Broken link (should be red)
- [[Future Page]] - Another broken link

## Wiki Links with Custom Text
- [[Welcome to the Wiki|Welcome Page]] - Custom display text
- [[Quick Start Guide|Getting Started]] - Another custom text
- [[API Documentation|API Docs]] - Link with custom text

## Nested Wiki Links in Lists
1. Getting Started
   - [[Welcome to the Wiki]]
   - [[Quick Start Guide]]
2. Advanced Topics
   - [[Advanced Configuration]]
   - [[Troubleshooting Guide]]
3. Reference
   - [[API Reference]]
   - [[Command Line Interface]]

## Wiki Links in Tables
| Topic | Link | Status |
|-------|------|--------|
| Welcome | [[Welcome to the Wiki]] | ✅ |
| Guide | [[Quick Start Guide]] | ✅ |
| API | [[API Documentation]] | ❌ |

## Wiki Links in Blockquotes
> For more information, see [[Welcome to the Wiki]] and 
> [[Quick Start Guide]] for basic usage instructions.

## Mixed Link Types
- External: [Google](https://google.com)
- Wiki: [[Welcome to the Wiki]]
- Reference: [GitHub][gh]
- Wiki with text: [[Quick Start Guide|Guide]]

[gh]: https://github.com

This tests wiki link parsing in various contexts.`,
    tags: ['wiki-links', 'testing', 'navigation'],
    category: 'reference',
    isPublished: true
  },

  performanceTestPage: {
    title: 'Large Document Performance Test',
    slug: 'large-document-performance-test',
    content: `# Large Document Performance Test

${'This is a very long document designed to test the performance of the markdown editor and renderer with large amounts of content. '.repeat(50)}

## Section 1: Repeated Content

${'### Subsection\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\n'.repeat(20)}

## Section 2: Large Code Blocks

\`\`\`javascript
${'// This is a large code block to test syntax highlighting performance\n'.repeat(100)}
function largeFunction() {
${'  console.log("Line " + i);\n'.repeat(50)}
}
\`\`\`

## Section 3: Many Lists

${Array.from({length: 50}, (_, i) => `### List ${i + 1}\n\n${Array.from({length: 10}, (_, j) => `- Item ${j + 1}`).join('\n')}\n\n`).join('')}

## Section 4: Large Tables

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
|----------|----------|----------|----------|----------|
${Array.from({length: 100}, (_, i) => `| Row ${i + 1} | Data ${i + 1} | Value ${i + 1} | Info ${i + 1} | Notes ${i + 1} |`).join('\n')}

## Section 5: Many Wiki Links

${Array.from({length: 50}, (_, i) => `- [[Test Page ${i + 1}]]`).join('\n')}

## Section 6: Complex Nested Structure

${Array.from({length: 20}, (_, i) => `
### Section ${i + 1}

${Array.from({length: 5}, (_, j) => `
#### Subsection ${i + 1}.${j + 1}

Content for subsection ${i + 1}.${j + 1} with **bold** and *italic* text.

\`\`\`javascript
function example${i}_${j}() {
  return "test data";
}
\`\`\`

1. First item
2. Second item
3. Third item

> Blockquote in section ${i + 1}.${j + 1}

`).join('')}
`).join('')}

---

End of large document. Total estimated lines: ~2000+`,
    tags: ['performance', 'large-content', 'testing'],
    category: 'reference',
    isPublished: true
  }
};

/**
 * Hierarchical page structure for testing organization
 */
export const hierarchicalWikiPages: Record<string, TestWikiPage> = {
  rootApiDocs: {
    title: 'API Documentation',
    slug: 'api-documentation',
    content: `# API Documentation

Complete reference for the MCP Tools API.

## Overview

The MCP Tools API provides RESTful endpoints for managing:
- Kanban boards and cards
- Wiki pages and content
- Memory items and connections
- User authentication and authorization

## Getting Started

1. [[Authentication|API Authentication]] - How to authenticate API requests
2. [[Rate Limits|API Rate Limits]] - Understanding rate limiting
3. [[Error Handling|API Error Handling]] - Error response formats

## Core Resources

### Kanban API
- [[Boards API]] - Board management endpoints
- [[Cards API]] - Card operations and workflows
- [[Comments API]] - Card comments and discussions

### Wiki API  
- [[Pages API]] - Page CRUD operations
- [[Search API]] - Full-text search endpoints
- [[Categories API]] - Category management

### Memory API
- [[Memory API]] - Memory storage and retrieval
- [[Connections API]] - Relationship management
- [[Embeddings API]] - Vector search capabilities

## SDKs and Libraries

- [[JavaScript SDK]] - Official JS/TS SDK
- [[Python SDK]] - Official Python SDK
- [[REST Examples]] - cURL and HTTP examples`,
    tags: ['api', 'documentation', 'reference'],
    category: 'api',
    isPublished: true
  },

  authenticationDocs: {
    title: 'API Authentication',
    slug: 'api-authentication',
    content: `# API Authentication

Learn how to authenticate with the MCP Tools API.

## Authentication Methods

### API Keys
The primary authentication method uses API keys in the Authorization header:

\`\`\`http
GET /api/v1/boards
Authorization: Bearer your-api-key-here
Content-Type: application/json
\`\`\`

### JWT Tokens
For web applications, use JWT tokens:

\`\`\`http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
\`\`\`

Response:
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
\`\`\`

## Managing API Keys

1. Log into the dashboard
2. Navigate to Settings > API Keys
3. Click "Generate New Key"
4. Copy and store securely

## Security Best Practices

- Never commit API keys to version control
- Use environment variables for key storage
- Rotate keys regularly
- Use different keys for different environments
- Monitor API key usage in the dashboard

For more details, see [[Rate Limits|API Rate Limits]] and [[Error Handling|API Error Handling]].`,
    tags: ['authentication', 'security', 'api'],
    category: 'api',
    parent: 'api-documentation',
    isPublished: true
  },

  boardsApi: {
    title: 'Boards API',
    slug: 'boards-api', 
    content: `# Boards API

Manage Kanban boards through the API.

## Endpoints

### List Boards
\`GET /api/v1/boards\`

Query parameters:
- \`page\` - Page number (default: 1)
- \`limit\` - Items per page (default: 10, max: 100)
- \`search\` - Search query
- \`sortBy\` - Sort field (name, createdAt, updatedAt)
- \`sortOrder\` - Sort direction (asc, desc)

### Get Board
\`GET /api/v1/boards/:id\`

### Create Board
\`POST /api/v1/boards\`

Request body:
\`\`\`json
{
  "name": "Project Board",
  "description": "Main project tracking board",
  "columns": [
    {"name": "To Do", "order": 0},
    {"name": "In Progress", "order": 1},
    {"name": "Done", "order": 2}
  ]
}
\`\`\`

### Update Board
\`PUT /api/v1/boards/:id\`

### Delete Board
\`DELETE /api/v1/boards/:id\`

## Response Format

\`\`\`json
{
  "success": true,
  "data": {
    "id": "board-123",
    "name": "Project Board",
    "description": "Main project tracking board",
    "columns": [...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

## Error Handling

See [[Error Handling|API Error Handling]] for error response formats.

## Related Endpoints

- [[Cards API]] - Managing cards within boards
- [[Comments API]] - Card comments and discussions`,
    tags: ['boards', 'kanban', 'api'],
    category: 'api',
    parent: 'api-documentation',
    isPublished: true
  },

  pagesApi: {
    title: 'Pages API',
    slug: 'pages-api',
    content: `# Pages API

Manage Wiki pages through the API.

## Endpoints

### List Pages
\`GET /api/v1/wiki/pages\`

Query parameters:
- \`page\` - Page number
- \`limit\` - Items per page
- \`search\` - Full-text search
- \`category\` - Filter by category
- \`tags\` - Filter by tags (comma-separated)
- \`parent\` - Filter by parent page ID

### Get Page
\`GET /api/v1/wiki/pages/:id\`
\`GET /api/v1/wiki/pages/by-slug/:slug\`

### Create Page
\`POST /api/v1/wiki/pages\`

Request body:
\`\`\`json
{
  "title": "New Page",
  "content": "# New Page\\n\\nPage content in markdown",
  "slug": "new-page",
  "category": "documentation",
  "tags": ["new", "example"],
  "parent": "parent-page-id",
  "isPublished": true
}
\`\`\`

### Update Page
\`PUT /api/v1/wiki/pages/:id\`

### Delete Page
\`DELETE /api/v1/wiki/pages/:id\`

## Page Hierarchy

Pages support parent-child relationships:

\`\`\`json
{
  "id": "page-123",
  "title": "Parent Page",
  "children": [
    {
      "id": "page-124",
      "title": "Child Page 1",
      "parent": "page-123"
    },
    {
      "id": "page-125", 
      "title": "Child Page 2",
      "parent": "page-123"
    }
  ]
}
\`\`\`

## Full-Text Search

Search across page content:

\`GET /api/v1/wiki/search?q=query&category=docs&tags=api\`

## Related APIs

- [[Search API]] - Advanced search capabilities
- [[Categories API]] - Category management
- [[Comments API]] - Page comments`,
    tags: ['pages', 'wiki', 'api'],
    category: 'api',
    parent: 'api-documentation',
    isPublished: true
  }
};

/**
 * Test data for different content types and edge cases
 */
export const edgeCaseWikiPages: Record<string, TestWikiPage> = {
  specialCharacters: {
    title: 'Special Characters Test: 中文 العربية Русский 🚀',
    slug: 'special-characters-test',
    content: `# Special Characters and Unicode Test

## Different Languages

### Chinese (中文)
你好世界！这是一个测试页面。

### Arabic (العربية)
مرحبا بالعالم! هذه صفحة اختبار.

### Russian (Русский)
Привет мир! Это тестовая страница.

### Japanese (日本語)
こんにちは世界！これはテストページです。

### Korean (한국어)
안녕하세요 세계! 이것은 테스트 페이지입니다.

## Emojis and Symbols

### Common Emojis
🚀 🎉 💡 ✨ 🔥 🌟 ⭐ 🎯 📚 💻 🛠️ ⚡

### Status Indicators  
✅ ❌ ⚠️ ℹ️ 🚧 ⏳ 🔄 📝 🔍 📊

### Mathematical Symbols
∑ ∏ ∫ ∞ ≈ ≠ ≤ ≥ ± × ÷ √ π α β γ δ

### Currency
$ € £ ¥ ¢ ₹ ₿ ₽

## Special Cases

### Long Words
Antidisestablishmentarianism
Pseudopseudohypoparathyroidism
Pneumonoultramicroscopicsilicovolcanoconiosisaverylongwordthatcouldbreaklayout

### URLs with Special Characters
- https://example.com/path?query=test&param=中文
- mailto:test@example.com?subject=测试邮件
- [[Page with Spaces and 中文]]

### Code with Unicode
\`\`\`javascript
const 变量 = "Unicode variable names";
const функция = () => "Function with Cyrillic name";
const 関数 = "Japanese function";
console.log(变量, функция(), 关数);
\`\`\`

This tests Unicode handling across the application.`,
    tags: ['unicode', 'special-characters', 'testing', 'i18n'],
    category: 'reference',
    isPublished: true
  },

  maliciousContent: {
    title: 'Security Test Page',
    slug: 'security-test-page',
    content: `# Security Test Page

This page tests security handling of potentially malicious content.

## XSS Prevention Tests

### Script Tags (should be escaped)
\`<script>alert('XSS')</script>\`

### Event Handlers (should be escaped)
\`<img src="x" onerror="alert('XSS')">\`

### JavaScript URLs (should be escaped)
\`<a href="javascript:alert('XSS')">Click me</a>\`

### Data URLs (should be handled safely)
\`<img src="data:text/html,<script>alert('XSS')</script>">\`

## HTML Injection Tests

### Malicious HTML
\`<iframe src="javascript:alert('XSS')"></iframe>\`
\`<object data="javascript:alert('XSS')"></object>\`
\`<embed src="javascript:alert('XSS')">\`

### Form Injection
\`<form action="http://evil.com"><input type="submit" value="Click me"></form>\`

## Wiki Link Injection

### Malicious Wiki Links
- \`[[<script>alert('XSS')</script>]]\`
- \`[[javascript:alert('XSS')|Click me]]\`
- \`[[normal-page|<img src=x onerror=alert('XSS')>]]\`

## SQL Injection Attempts (in search)
These should be safely handled by the search system:
- \`'; DROP TABLE pages; --\`
- \`' OR '1'='1\`
- \`'; INSERT INTO pages VALUES ('evil'); --\`

## Special Markdown Edge Cases

### Deeply Nested Content
${'> '.repeat(100)}Very deeply nested blockquote

### Very Long Lines
${'This is a very long line that should not break the layout or cause performance issues. '.repeat(100)}

### Malformed Markdown
\`\`\`
Unclosed code block without closing markers

**Unclosed bold formatting

[Malformed link](

![Broken image]broken
\`\`\`

All content should be properly sanitized and escaped.`,
    tags: ['security', 'xss', 'testing', 'sanitization'],
    category: 'reference',
    isPublished: false
  },

  brokenLinks: {
    title: 'Broken Links Test Page',
    slug: 'broken-links-test-page',
    content: `# Broken Links Test Page

This page intentionally contains broken links for testing link validation.

## Broken Wiki Links
- [[This Page Does Not Exist]]
- [[Another Missing Page]]
- [[Future Documentation]]
- [[Deleted Page Reference]]

## Broken External Links
- [Broken HTTP Link](http://this-domain-does-not-exist-12345.com)
- [Invalid URL](not-a-valid-url)
- [Empty Link]()

## Mixed Valid and Invalid Links
- [[Welcome to the Wiki]] - Valid wiki link
- [[Broken Wiki Link]] - Invalid wiki link
- [Google](https://google.com) - Valid external link
- [Broken External](http://broken-link-test.invalid) - Invalid external

## Links in Different Contexts

### In Lists
1. [[Valid Page Link]]
2. [[Invalid Page Link]]
3. [Valid External](https://example.com)
4. [Invalid External](http://invalid.test)

### In Tables
| Type | Link | Status |
|------|------|--------|
| Wiki | [[Valid Link]] | ✅ |
| Wiki | [[Invalid Link]] | ❌ |
| External | [Valid](https://example.com) | ✅ |
| External | [Invalid](http://invalid.test) | ❌ |

### In Blockquotes
> This blockquote contains [[Invalid Link]] and
> [[Another Invalid Link]] for testing purposes.

This helps test link validation and broken link detection.`,
    tags: ['links', 'validation', 'testing', 'broken'],
    category: 'reference',
    isPublished: true
  }
};

/**
 * Test data for search functionality
 */
export const searchTestPages: Record<string, TestWikiPage> = {
  searchablePage1: {
    title: 'Database Configuration Guide',
    slug: 'database-configuration-guide',
    content: `# Database Configuration Guide

Learn how to configure your database for optimal performance.

## PostgreSQL Configuration

PostgreSQL is the recommended database for production environments.

### Connection Settings
\`\`\`
host=localhost
port=5432
database=mcptools
username=app_user
password=secure_password
\`\`\`

### Performance Tuning
- Increase \`shared_buffers\` to 25% of RAM
- Set \`effective_cache_size\` to 75% of RAM
- Configure \`work_mem\` based on concurrent connections

## MySQL Configuration

MySQL is supported as an alternative database option.

### Connection Settings
\`\`\`
host=localhost
port=3306
database=mcptools
username=app_user
password=secure_password
\`\`\`

## SQLite Configuration

SQLite is perfect for development and small deployments.

### File Location
\`\`\`
database_path=./data/mcptools.db
\`\`\`

For more information, see [[Database Migration Guide]].`,
    tags: ['database', 'configuration', 'postgresql', 'mysql', 'sqlite'],
    category: 'guides',
    isPublished: true
  },

  searchablePage2: {
    title: 'API Security Best Practices',
    slug: 'api-security-best-practices',
    content: `# API Security Best Practices

Essential security practices for API development and deployment.

## Authentication Security

### Use Strong Authentication
- Implement JWT tokens with short expiration
- Use API keys for service-to-service communication
- Never expose credentials in client-side code

### Rate Limiting
Configure rate limits to prevent abuse:
\`\`\`yaml
rate_limits:
  requests_per_minute: 100
  burst_limit: 20
\`\`\`

## Data Protection

### Input Validation
- Validate all input parameters
- Use parameterized queries to prevent SQL injection
- Sanitize user-generated content

### Output Security
- Never expose sensitive data in responses
- Use proper error messages that don't leak information
- Implement CORS policies correctly

## Monitoring and Logging

Track security events:
- Failed authentication attempts
- Unusual access patterns
- API usage spikes

For database security, see [[Database Configuration Guide]].`,
    tags: ['api', 'security', 'authentication', 'best-practices'],
    category: 'guides',
    isPublished: true
  },

  searchablePage3: {
    title: 'Development Environment Setup',
    slug: 'development-environment-setup',
    content: `# Development Environment Setup

Set up your local development environment.

## Prerequisites

### Required Software
- Node.js 18+ with npm
- PostgreSQL 14+ (or MySQL 8+/SQLite)
- Git for version control
- Docker (optional, for containerized development)

### Optional Tools
- Redis for caching
- NATS for message queuing

## Installation Steps

### 1. Clone Repository
\`\`\`bash
git clone https://github.com/company/mcptools.git
cd mcptools
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
cd web && npm install
cd ../gateway && npm install
\`\`\`

### 3. Database Setup
See [[Database Configuration Guide]] for detailed instructions.

### 4. Environment Configuration
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

### 5. Start Development Servers
\`\`\`bash
npm run dev
\`\`\`

For API security setup, see [[API Security Best Practices]].`,
    tags: ['development', 'setup', 'environment', 'installation'],
    category: 'guides',
    isPublished: true
  }
};

/**
 * Test comments for wiki pages
 */
export const testWikiComments: Record<string, TestWikiComment[]> = {
  welcomePage: [
    {
      content: 'Great introduction to the wiki! This will help new users get started.',
      author: 'alice@example.com'
    },
    {
      content: 'Should we add a section about advanced features?',
      author: 'bob@example.com'
    },
    {
      content: '@alice@example.com I agree! Maybe we can add that after the basic tutorial.',
      author: 'charlie@example.com',
      mentions: ['alice@example.com']
    }
  ],
  
  quickStart: [
    {
      content: 'This guide is very helpful. One suggestion: add more screenshots.',
      author: 'dave@example.com'
    },
    {
      content: 'Good point @dave@example.com. I can work on adding visual guides.',
      author: 'eve@example.com',
      mentions: ['dave@example.com']
    }
  ]
};

/**
 * Test categories for organization
 */
export const testWikiCategories: Record<string, TestWikiCategory> = {
  documentation: {
    name: 'Documentation',
    description: 'User guides and documentation',
    color: 'blue'
  },
  
  guides: {
    name: 'Guides',
    description: 'Step-by-step tutorials and guides',
    color: 'green'
  },
  
  api: {
    name: 'API',
    description: 'API documentation and references',
    color: 'purple'
  },
  
  tutorials: {
    name: 'Tutorials',
    description: 'Learning materials and tutorials',
    color: 'orange'
  },
  
  reference: {
    name: 'Reference',
    description: 'Quick reference materials',
    color: 'gray'
  }
};

/**
 * Test data generator for dynamic content
 */
export class WikiTestDataGenerator {
  static generatePage(overrides: Partial<TestWikiPage> = {}): TestWikiPage {
    const id = Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();
    
    return {
      title: `Generated Test Page ${id}`,
      slug: `generated-test-page-${id}`,
      content: `# Generated Test Page ${id}

This is a dynamically generated test page created at ${timestamp}.

## Content Sections

### Section 1
Lorem ipsum dolor sit amet, consectetur adipiscing elit.

### Section 2  
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Links
- [[Welcome to the Wiki]]
- [[Quick Start Guide]]

Generated for testing purposes.`,
      tags: ['generated', 'test', `id-${id}`],
      category: 'reference',
      isPublished: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides
    };
  }

  static generateLargeContent(sections: number = 50, wordsPerSection: number = 100): string {
    const lorem = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
    
    let content = '# Large Generated Document\n\n';
    
    for (let i = 1; i <= sections; i++) {
      content += `## Section ${i}\n\n`;
      
      const words = [];
      for (let j = 0; j < wordsPerSection; j++) {
        words.push(lorem[j % lorem.length]);
      }
      
      content += words.join(' ') + '\n\n';
      
      if (i % 10 === 0) {
        content += `### Subsection ${i}\n\n`;
        content += '```javascript\n';
        content += `// Code block in section ${i}\n`;
        content += `function section${i}() {\n`;
        content += `  return "Section ${i} content";\n`;
        content += '}\n```\n\n';
      }
    }
    
    return content;
  }

  static generateComment(overrides: Partial<TestWikiComment> = {}): TestWikiComment {
    const authors = ['alice@test.com', 'bob@test.com', 'charlie@test.com', 'dave@test.com'];
    const comments = [
      'Great content! Very helpful.',
      'This section could use more examples.',
      'Thanks for the detailed explanation.',
      'I have a question about this part.',
      'Maybe we should update this section?'
    ];
    
    return {
      content: comments[Math.floor(Math.random() * comments.length)],
      author: authors[Math.floor(Math.random() * authors.length)],
      ...overrides
    };
  }
}

/**
 * Complete test dataset combining all fixtures
 */
export const wikiTestData = {
  pages: {
    ...basicWikiPages,
    ...markdownTestPages,
    ...hierarchicalWikiPages,
    ...edgeCaseWikiPages,
    ...searchTestPages
  },
  comments: testWikiComments,
  categories: testWikiCategories,
  generator: WikiTestDataGenerator
};

/**
 * Test configuration for wiki tests
 */
export const wikiTestConfig = {
  // Performance test thresholds
  performance: {
    pageLoadTimeout: 5000,
    editorResponseTimeout: 1000,
    searchResponseTimeout: 2000,
    largeDocumentTimeout: 10000
  },
  
  // Search test parameters
  search: {
    minQueryLength: 3,
    maxResults: 50,
    expectedResultsForBasicQuery: 5
  },
  
  // Editor test settings
  editor: {
    typingDelay: 50,
    previewUpdateTimeout: 500,
    autoSaveInterval: 5000
  },
  
  // Collaboration test settings
  collaboration: {
    maxConcurrentUsers: 5,
    conflictResolutionTimeout: 3000,
    realtimeUpdateTimeout: 1000
  }
};