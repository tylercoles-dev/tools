/**
 * Centralized exports for all Page Objects
 * Import all page objects from this single file
 */

// Base page
export { BasePage } from './base-page';

// Authentication pages
export { LoginPage } from './auth/login-page';
export { SignupPage } from './auth/signup-page';

// Main application pages
export { DashboardPage } from './dashboard-page';

// Kanban pages
export * from './kanban';

// Wiki pages
export * from './wiki';

// TODO: Add these page objects as they are created
// export { MemoryPage } from './memory/memory-page';
// export { MemoryDetailPage } from './memory/memory-detail-page';