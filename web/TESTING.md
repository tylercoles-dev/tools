# Frontend Unit Testing Guide

This document describes the comprehensive unit testing setup for the MCP Tools web client.

## Testing Infrastructure

The web client uses a modern testing stack:

- **Jest** - Test runner and framework
- **React Testing Library** - Component testing utilities
- **user-event** - User interaction simulation
- **axios-mock-adapter** - HTTP request mocking
- **Next.js Jest integration** - Proper Next.js environment setup

## Test Coverage

### Custom Hooks (Highest Priority - 100% Coverage)

#### `use-api.ts` Hook
- **Query Keys**: All query key generation functions
- **Health Hooks**: API health check functionality
- **Authentication**: Login, signup, logout with error handling
- **Kanban Operations**: Board and card CRUD operations with cache invalidation
- **Memory Operations**: Memory CRUD and search functionality
- **Wiki Operations**: Page CRUD operations
- **Toast Integration**: Success and error notifications
- **React Query Integration**: Proper cache management and optimistic updates

#### `use-analytics.ts` Hook
- **Event Tracking**: Individual and batch event tracking
- **Performance Tracking**: API call performance monitoring
- **Convenience Methods**: Page views, feature usage, user actions, error tracking
- **Dashboard Data**: Analytics dashboard metrics fetching
- **Time Series Data**: Historical analytics data with query parameters
- **Productivity Insights**: AI-powered insights generation and management
- **Interaction Tracking**: Click, form submission, and search tracking
- **Session Management**: Consistent session ID generation

#### `use-realtime.ts` Hook
- **WebSocket Connection**: Connection establishment and management
- **Real-time Updates**: Entity-specific update handling (kanban, memory, wiki, user)
- **Message Deduplication**: Prevents duplicate message processing
- **Cache Invalidation**: Proper React Query cache updates
- **Toast Notifications**: Real-time update notifications
- **Entity-Specific Hooks**: Specialized hooks for different entity types
- **Presence Management**: User online/offline status tracking

### API Client (95% Coverage)

#### `api-client.ts`
- **Authentication Interceptors**: Token management and refresh logic
- **Request/Response Handling**: Proper error handling and retries
- **Health Endpoints**: Basic and detailed health checks
- **Authentication Flow**: Login, signup, logout with token storage
- **CRUD Operations**: Full API coverage for kanban, memory, and wiki
- **MCP Integration**: Tool calls and resource management
- **Error Scenarios**: Network errors, timeouts, server errors
- **Edge Cases**: SSR compatibility, malformed tokens, missing localStorage

### UI Components (80% Coverage)

#### `Button` Component
- **Variants**: All button variants (default, destructive, outline, secondary, ghost, link)
- **Sizes**: All size variants (default, sm, lg, icon)
- **Styling**: Custom className merging and Tailwind conflicts
- **AsChild Prop**: Polymorphic component behavior with Radix Slot
- **Interactions**: Click, keyboard, and focus events
- **Accessibility**: ARIA attributes, focus management, screen reader support
- **Form Integration**: Form attributes and submission handling

#### `Input` Component
- **Input Types**: Text, password, email, number, search, tel, url, date, file
- **Styling**: Base styles, focus states, disabled states, file input styles
- **Interactions**: User input, controlled/uncontrolled modes, validation
- **Accessibility**: ARIA attributes, label association, keyboard navigation
- **Edge Cases**: Long values, special characters, form integration

#### `LoadingSpinner` Component
- **Size Variants**: sm, md, lg with proper class application
- **Styling**: Custom className merging, animation classes
- **Accessibility**: Proper ARIA roles and labels for screen readers
- **Integration**: Usage in buttons, forms, overlays
- **Performance**: Efficient rendering and multiple spinner handling

### Utility Functions (100% Coverage)

#### `utils.ts`
- **Class Name Merging**: clsx and tailwind-merge integration
- **Conditional Classes**: Boolean and array handling
- **Tailwind Conflicts**: Proper class conflict resolution
- **Edge Cases**: Empty inputs, duplicates, nested structures

## Test Utilities

### `test-utils.tsx`
- **Provider Wrapper**: QueryClient and other context providers
- **Custom Render Functions**: Components and hooks with providers
- **Mock Utilities**: WebSocket, API responses, toast functions
- **Test Helpers**: Async operation waiting, cleanup functions

### `setup.ts`
- **Global Mocks**: localStorage, crypto, window objects
- **Polyfills**: IntersectionObserver, ResizeObserver, Canvas
- **Jest Configuration**: Test environment setup and cleanup

## Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit:watch

# Run tests with coverage report
npm run test:unit:coverage

# Run tests for CI/CD
npm run test:unit:ci
```

## Coverage Goals

- **Hooks**: 100% coverage (critical business logic)
- **API Client**: >95% coverage (core functionality)
- **UI Components**: >80% coverage (user-facing components)
- **Utilities**: 100% coverage (pure functions)

## Testing Patterns

### Hook Testing
```typescript
const { result } = renderHookWithProviders(() => useCustomHook(), {
  queryClient: createTestQueryClient(),
});

await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

### Component Testing
```typescript
render(<Component prop="value" />);

const element = screen.getByRole('button');
await user.click(element);

expect(element).toHaveClass('expected-class');
```

### API Mocking
```typescript
mockAdapter.onGet('/api/endpoint').reply(200, mockData);

const result = await apiClient.getEndpoint();
expect(result).toEqual(mockData);
```

## Key Features Tested

1. **Error Handling**: Network errors, HTTP errors, validation errors
2. **Loading States**: Pending, success, error states for async operations
3. **User Interactions**: Clicks, keyboard input, form submissions
4. **Accessibility**: ARIA attributes, keyboard navigation, screen reader support
5. **Edge Cases**: Empty data, malformed input, browser compatibility
6. **Integration**: Component interactions, hook dependencies, provider contexts

This comprehensive test suite ensures the web client is robust, accessible, and maintainable while providing confidence for refactoring and new feature development.