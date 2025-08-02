/**
 * Test data fixtures for consistent testing across all test suites
 */

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'admin';
}

export interface TestBoard {
  name: string;
  description: string;
  columns: string[];
  cards?: TestCard[];
}

export interface TestCard {
  title: string;
  description: string;
  tags?: string[];
  assignee?: string;
  dueDate?: string;
}

export interface TestWikiPage {
  title: string;
  slug: string;
  content: string;
  tags?: string[];
  category?: string;
}

export interface TestMemoryItem {
  title: string;
  content: string;
  type: 'note' | 'thought' | 'connection';
  relatedItems?: string[];
}

/**
 * User fixtures for different test scenarios
 */
export const testUsers: Record<string, TestUser> = {
  validUser: {
    email: 'test@mcptools.dev',
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User',
    role: 'user'
  },
  
  adminUser: {
    email: 'admin@mcptools.dev',
    password: 'adminpassword123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
    firstName: 'Invalid',
    lastName: 'User'
  },
  
  newUser: {
    email: `newuser+${Date.now()}@mcptools.dev`,
    password: 'newuserpassword123',
    firstName: 'New',
    lastName: 'User'
  }
};

/**
 * Authentication test scenarios and edge cases
 */
export const authTestData = {
  // Valid login scenarios
  validLogins: [
    {
      email: 'test@mcptools.dev',
      password: 'testpassword123',
      description: 'Standard valid user'
    },
    {
      email: 'admin@mcptools.dev', 
      password: 'adminpassword123',
      description: 'Admin user'
    }
  ],

  // Invalid login scenarios
  invalidLogins: [
    {
      email: 'nonexistent@test.com',
      password: 'anypassword',
      description: 'Non-existent email',
      expectedError: 'Invalid credentials'
    },
    {
      email: 'test@mcptools.dev',
      password: 'wrongpassword',
      description: 'Wrong password',
      expectedError: 'Invalid credentials'
    },
    {
      email: '',
      password: 'testpassword123',
      description: 'Empty email',
      expectedError: 'Email is required'
    },
    {
      email: 'test@mcptools.dev',
      password: '',
      description: 'Empty password',
      expectedError: 'Password is required'
    },
    {
      email: 'invalid-email',
      password: 'testpassword123',
      description: 'Invalid email format',
      expectedError: 'Please enter a valid email'
    }
  ],

  // Email format validation test cases
  emailValidationCases: [
    { email: 'valid@test.com', valid: true },
    { email: 'user.name@domain.com', valid: true },
    { email: 'user+tag@domain.co.uk', valid: true },
    { email: 'invalid-email', valid: false },
    { email: '@domain.com', valid: false },
    { email: 'user@', valid: false },
    { email: 'user@domain', valid: false },
    { email: '', valid: false },
    { email: 'user space@domain.com', valid: false }
  ],

  // Password validation test cases
  passwordValidationCases: [
    { password: 'validpass123', valid: true, strength: 'strong' },
    { password: 'weakpass', valid: false, strength: 'weak' },
    { password: '123456', valid: false, strength: 'weak' },
    { password: '', valid: false, strength: 'none' },
    { password: 'a', valid: false, strength: 'weak' },
    { password: 'verylongpasswordwithoutdigits', valid: true, strength: 'medium' },
    { password: 'ComplexP@ss123!', valid: true, strength: 'strong' }
  ],

  // Valid signup scenarios
  validSignups: [
    {
      name: 'John Doe',
      email: `john.doe+${Date.now()}@test.com`,
      password: 'securepassword123',
      confirmPassword: 'securepassword123',
      acceptTerms: true,
      description: 'Standard valid signup'
    },
    {
      name: 'Jane Smith-Wilson',
      email: `jane.smith+${Date.now()}@test.com`,
      password: 'AnotherSecure123!',
      confirmPassword: 'AnotherSecure123!',
      acceptTerms: true,
      description: 'Hyphenated name signup'
    }
  ],

  // Invalid signup scenarios
  invalidSignups: [
    {
      name: '',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: true,
      description: 'Empty name',
      expectedError: 'Name is required'
    },
    {
      name: 'Test User',
      email: '',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: true,
      description: 'Empty email',
      expectedError: 'Email is required'
    },
    {
      name: 'Test User',
      email: 'invalid-email',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: true,
      description: 'Invalid email format',
      expectedError: 'Please enter a valid email'
    },
    {
      name: 'Test User',
      email: 'test@example.com',
      password: '',
      confirmPassword: '',
      acceptTerms: true,
      description: 'Empty passwords',
      expectedError: 'Password is required'
    },
    {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different123',
      acceptTerms: true,
      description: 'Password mismatch',
      expectedError: 'Passwords do not match'
    },
    {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: false,
      description: 'Terms not accepted',
      expectedError: 'You must accept the terms'
    },
    {
      name: 'Test User',
      email: 'test@mcptools.dev', // Existing user email
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: true,
      description: 'Email already exists',
      expectedError: 'Email already registered'
    }
  ],

  // Security test cases
  securityTestCases: {
    xssAttempts: [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">'
    ],
    sqlInjectionAttempts: [
      "'; DROP TABLE users; --",
      "admin'--",
      "admin' OR '1'='1",
      "'; INSERT INTO users VALUES ('hacker','pass'); --"
    ],
    specialCharacters: [
      'Test™User®',
      '用户测试',
      'Tëst Üsér',
      'Test\nUser',
      'Test\tUser'
    ]
  },

  // Performance test cases
  performanceTestCases: {
    longInputs: {
      veryLongEmail: 'a'.repeat(100) + '@test.com',
      veryLongName: 'Test ' + 'User '.repeat(50),
      veryLongPassword: 'password' + '123'.repeat(100)
    },
    rapidSubmissions: {
      intervalMs: 100,
      attempts: 10
    }
  },

  // Browser compatibility test cases  
  browserTestCases: {
    autofillScenarios: [
      {
        email: 'saved@browser.com',
        password: 'savedpassword123',
        description: 'Browser autofill test'
      }
    ],
    keyboardShortcuts: [
      { key: 'Tab', description: 'Tab navigation' },
      { key: 'Enter', description: 'Enter to submit' },
      { key: 'Escape', description: 'Escape to cancel' }
    ]
  }
};

/**
 * Kanban board fixtures
 */
export const testBoards: Record<string, TestBoard> = {
  simpleBoard: {
    name: 'Simple Test Board',
    description: 'A basic board for testing core functionality',
    columns: ['To Do', 'In Progress', 'Done']
  },
  
  complexBoard: {
    name: 'Complex Project Board',
    description: 'A comprehensive board with multiple columns and features',
    columns: ['Backlog', 'Planning', 'Development', 'Testing', 'Review', 'Deployed'],
    cards: [
      {
        title: 'Setup project structure',
        description: 'Initialize the project with proper folder structure and dependencies',
        tags: ['setup', 'infrastructure']
      },
      {
        title: 'Implement user authentication',
        description: 'Add login and registration functionality',
        tags: ['auth', 'security'],
        dueDate: '2024-12-31'
      }
    ]
  },
  
  emptyBoard: {
    name: 'Empty Test Board',
    description: 'Board with no initial columns for testing creation flow',
    columns: []
  }
};

/**
 * Card fixtures
 */
export const testCards: Record<string, TestCard> = {
  basicCard: {
    title: 'Basic Test Card',
    description: 'A simple card for basic functionality testing'
  },
  
  detailedCard: {
    title: 'Detailed Test Card',
    description: 'A comprehensive card with all properties filled',
    tags: ['urgent', 'frontend', 'bug-fix'],
    assignee: 'test@mcptools.dev',
    dueDate: '2024-12-31'
  },
  
  longContentCard: {
    title: 'Card with Long Content',
    description: `This is a test card with a very long description that should test text wrapping and display behavior. 
    
    It includes multiple paragraphs and should help verify that the UI can handle longer content gracefully.
    
    ### Key Points:
    - Test text wrapping
    - Verify UI responsiveness
    - Check scrolling behavior
    - Ensure readability
    
    This content should help identify any layout issues with longer text content.`
  }
};

/**
 * Wiki page fixtures
 */
export const testWikiPages: Record<string, TestWikiPage> = {
  basicPage: {
    title: 'Basic Test Page',
    slug: 'basic-test-page',
    content: '# Basic Test Page\n\nThis is a simple test page for basic functionality.',
    tags: ['test', 'basic']
  },
  
  markdownPage: {
    title: 'Markdown Features Test',
    slug: 'markdown-features-test',
    content: `# Markdown Features Test

This page tests various markdown features:

## Headers
### Level 3 Header
#### Level 4 Header

## Text Formatting
**Bold text** and *italic text* and ***bold italic***

## Lists
### Unordered List
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item

## Code
Inline \`code\` and code blocks:

\`\`\`javascript
function testFunction() {
  console.log('This is a test');
  return true;
}
\`\`\`

## Links and References
- [External link](https://example.com)
- [[Internal wiki link]]

## Tables
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data 1   | Value 1  |
| Row 2    | Data 2   | Value 2  |

## Blockquotes
> This is a blockquote
> It can span multiple lines

## Horizontal Rule
---

## Task Lists
- [x] Completed task
- [ ] Incomplete task
- [ ] Another incomplete task`,
    tags: ['markdown', 'formatting', 'test']
  },
  
  hierarchicalPage: {
    title: 'Parent Page',
    slug: 'parent-page',
    content: '# Parent Page\n\nThis is a parent page for testing hierarchical structure.',
    tags: ['hierarchy', 'parent']
  }
};

/**
 * Memory system fixtures
 */
export const testMemoryItems: Record<string, TestMemoryItem> = {
  basicNote: {
    title: 'Basic Test Note',
    content: 'This is a simple note for testing memory functionality.',
    type: 'note'
  },
  
  thoughtConnection: {
    title: 'Connected Thought',
    content: 'This thought relates to other items in the system.',
    type: 'thought',
    relatedItems: ['basic-note', 'project-idea']
  },
  
  projectIdea: {
    title: 'Project Idea',
    content: 'An innovative project idea that connects multiple concepts.',
    type: 'connection',
    relatedItems: ['thought-connection']
  }
};

/**
 * API response fixtures for mocking
 */
export const apiFixtures = {
  successResponse: {
    success: true,
    message: 'Operation completed successfully'
  },
  
  errorResponse: {
    success: false,
    error: 'Something went wrong',
    message: 'An error occurred while processing your request'
  },
  
  validationErrorResponse: {
    success: false,
    error: 'Validation failed',
    errors: {
      email: ['Email is required'],
      password: ['Password must be at least 8 characters']
    }
  },
  
  paginatedResponse: {
    success: true,
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    }
  }
};

/**
 * Generate dynamic test data with unique identifiers
 */
export class TestDataGenerator {
  private static getTimestamp(): number {
    return Date.now();
  }
  
  private static getRandomId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
  
  static generateUser(overrides: Partial<TestUser> = {}): TestUser {
    const id = this.getRandomId();
    return {
      email: `testuser+${id}@mcptools.dev`,
      password: 'testpassword123',
      firstName: `Test${id}`,
      lastName: 'User',
      role: 'user',
      ...overrides
    };
  }
  
  static generateBoard(overrides: Partial<TestBoard> = {}): TestBoard {
    const id = this.getRandomId();
    return {
      name: `Test Board ${id}`,
      description: `Generated test board for ${new Date().toISOString()}`,
      columns: ['To Do', 'In Progress', 'Done'],
      ...overrides
    };
  }
  
  static generateCard(overrides: Partial<TestCard> = {}): TestCard {
    const id = this.getRandomId();
    return {
      title: `Test Card ${id}`,
      description: `Generated test card created at ${new Date().toISOString()}`,
      ...overrides
    };
  }
  
  static generateWikiPage(overrides: Partial<TestWikiPage> = {}): TestWikiPage {
    const id = this.getRandomId();
    return {
      title: `Test Page ${id}`,
      slug: `test-page-${id}`,
      content: `# Test Page ${id}\n\nGenerated test content created at ${new Date().toISOString()}`,
      tags: ['test', 'generated'],
      ...overrides
    };
  }
  
  static generateMemoryItem(overrides: Partial<TestMemoryItem> = {}): TestMemoryItem {
    const id = this.getRandomId();
    return {
      title: `Test Memory ${id}`,
      content: `Generated test memory item created at ${new Date().toISOString()}`,
      type: 'note',
      ...overrides
    };
  }
}

/**
 * Test environment configuration
 */
export const testConfig = {
  // Timeouts
  shortTimeout: 5000,
  mediumTimeout: 15000,
  longTimeout: 30000,
  
  // Retry configuration
  retries: {
    ci: 2,
    local: 0
  },
  
  // Test data limits
  maxTestItems: 10,
  cleanupBatchSize: 5,
  
  // Feature flags for conditional testing
  features: {
    realTimeUpdates: true,
    visualTesting: process.env.VISUAL_TESTS === 'true',
    a11yTesting: process.env.A11Y_TESTS === 'true',
    performanceTesting: process.env.PERF_TESTS === 'true'
  }
};