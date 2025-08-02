# Kanban Board Test Suite

This directory contains comprehensive automated tests for the Kanban board functionality in the MCP Tools web application. The test suite covers all aspects of Kanban board interactions, from basic CRUD operations to complex drag-and-drop scenarios and real-time collaboration.

## 🎯 Overview

The Kanban test suite provides complete coverage of:

- **Board Management**: Creation, editing, deletion, and listing of boards
- **Card Operations**: Full CRUD operations with validation and error handling
- **Drag & Drop**: Comprehensive testing of card movement between and within columns
- **Real-time Collaboration**: WebSocket-based real-time updates and conflict resolution
- **Mobile Touch**: Touch-based interactions and mobile-responsive behavior
- **Performance**: Large board handling, animation smoothness, and resource usage
- **Visual Regression**: Ensuring consistent visual appearance across different states
- **Accessibility**: Screen reader support, keyboard navigation, and ARIA compliance

## 📁 Test Structure

```
tests/
├── e2e/                                    # End-to-end test scenarios
│   ├── kanban-board-management.e2e.spec.ts       # Board CRUD operations
│   ├── kanban-card-operations.e2e.spec.ts        # Card management and validation
│   ├── kanban-drag-drop.e2e.spec.ts             # Drag and drop functionality
│   ├── kanban-realtime-collaboration.e2e.spec.ts # Real-time features
│   ├── kanban-mobile-touch.e2e.spec.ts          # Mobile and touch interactions
│   └── kanban-performance-ux.e2e.spec.ts        # Performance and UX testing
├── visual/                                 # Visual regression tests
│   └── kanban-drag-states.visual.spec.ts        # Visual appearance testing
├── pages/                                  # Page Object Models
│   └── kanban/
│       ├── kanban-boards-page.ts                # Boards listing page
│       ├── kanban-board-page.ts                 # Individual board page
│       └── index.ts                             # Exports
├── fixtures/                               # Test data and utilities
│   └── kanban-test-data.ts                     # Sample data and generators
└── utils/                                  # Helper utilities
    └── kanban-test-helpers.ts                   # Common test functions
```

## 🧪 Test Categories

### End-to-End Tests (`/e2e/`)

#### Board Management Tests
- **File**: `kanban-board-management.e2e.spec.ts`
- **Coverage**: Board creation, editing, deletion, listing, search, validation
- **Key Scenarios**:
  - Create boards with various configurations
  - Edit board names and descriptions
  - Delete boards with confirmation handling
  - Search and filter boards
  - Handle validation errors and network failures

#### Card Operations Tests
- **File**: `kanban-card-operations.e2e.spec.ts`
- **Coverage**: Card CRUD operations, validation, edge cases
- **Key Scenarios**:
  - Create cards with all field types (title, description, priority, assignee, due date)
  - Edit existing cards and handle conflicts
  - Delete cards with proper cleanup
  - Validate required fields and data formats
  - Handle special characters and large data sets

#### Drag and Drop Tests
- **File**: `kanban-drag-drop.e2e.spec.ts`
- **Coverage**: Card movement, visual feedback, edge cases, accessibility
- **Key Scenarios**:
  - Drag cards between columns
  - Reorder cards within same column
  - Visual feedback during drag operations
  - Handle invalid drop zones and cancellation
  - Keyboard-based drag operations
  - Performance measurement of drag operations

#### Real-time Collaboration Tests
- **File**: `kanban-realtime-collaboration.e2e.spec.ts`
- **Coverage**: WebSocket connections, multi-user scenarios, conflict resolution
- **Key Scenarios**:
  - WebSocket connection management
  - Real-time card updates from other users
  - Simultaneous editing conflict resolution
  - User presence indicators
  - Offline/online state handling
  - Connection recovery scenarios

#### Mobile Touch Tests
- **File**: `kanban-mobile-touch.e2e.spec.ts`
- **Coverage**: Touch interactions, mobile layout, gesture support
- **Key Scenarios**:
  - Touch-based drag and drop
  - Mobile-responsive layout verification
  - Gesture recognition (tap, long press, swipe)
  - Virtual keyboard interactions
  - Orientation change handling
  - Touch accessibility features

#### Performance and UX Tests
- **File**: `kanban-performance-ux.e2e.spec.ts`
- **Coverage**: Large board performance, animations, loading states
- **Key Scenarios**:
  - Large board loading performance (100+ cards)
  - Drag operation latency measurement
  - Animation smoothness verification
  - Memory leak detection
  - Resource usage monitoring
  - User feedback timing

### Visual Regression Tests (`/visual/`)

#### Drag States Visual Tests
- **File**: `kanban-drag-states.visual.spec.ts`
- **Coverage**: Visual consistency across different states and browsers
- **Key Scenarios**:
  - Initial board layout baseline
  - Card hover and focus states
  - Drag preview and drop zone styling
  - Animation frame verification
  - Mobile layout variations
  - Theme and accessibility mode support

## 🏗️ Page Object Models

### KanbanBoardsPage
Handles interactions with the boards listing page:
- Board creation and deletion
- Search and filtering
- Navigation to individual boards
- Board information display

### KanbanBoardPage
Manages individual board interactions:
- Card creation, editing, and deletion
- Drag and drop operations
- Column management
- Real-time status monitoring

### Utility Classes
- **KanbanTestHelpers**: Common test operations and utilities
- **MockWebSocket**: WebSocket mocking for real-time testing
- **KanbanDataGenerator**: Test data creation and management

## 📊 Test Data Management

### Test Fixtures (`/fixtures/kanban-test-data.ts`)

**Sample Boards**: Pre-configured boards for different test scenarios
- Development board with typical workflow
- Marketing board with custom columns
- Large board for performance testing

**Card Templates**: Reusable card configurations
- Minimal card (only required fields)
- Complete card (all fields populated)
- Overdue card for date testing

**Validation Cases**: Error scenarios and edge cases
- Invalid titles, dates, and field lengths
- Special characters and Unicode support
- Boundary condition testing

**Performance Benchmarks**: Expected performance thresholds
- Board load time limits
- Drag operation latency thresholds
- Real-time update delay limits

## 🚀 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running All Kanban Tests
```bash
# Run all Kanban-related tests
npm run test:e2e -- --grep "Kanban"

# Run specific test categories
npm run test:e2e tests/e2e/kanban-*.spec.ts
npm run test:visual tests/visual/kanban-*.spec.ts
```

### Running Individual Test Files
```bash
# Board management tests
npx playwright test tests/e2e/kanban-board-management.e2e.spec.ts

# Drag and drop tests
npx playwright test tests/e2e/kanban-drag-drop.e2e.spec.ts

# Visual regression tests
npx playwright test tests/visual/kanban-drag-states.visual.spec.ts
```

### Cross-Browser Testing
```bash
# Run on all browsers
npm run test:chromium tests/e2e/kanban-*.spec.ts
npm run test:firefox tests/e2e/kanban-*.spec.ts
npm run test:webkit tests/e2e/kanban-*.spec.ts

# Mobile testing
npm run test:mobile tests/e2e/kanban-mobile-touch.e2e.spec.ts
```

### Performance Testing
```bash
# Performance-focused test runs
npx playwright test tests/e2e/kanban-performance-ux.e2e.spec.ts --workers=1
```

### Debug Mode
```bash
# Run tests with browser UI for debugging
npm run test:headed tests/e2e/kanban-drag-drop.e2e.spec.ts

# Debug specific test with Playwright Inspector
npm run test:debug tests/e2e/kanban-card-operations.e2e.spec.ts
```

## 📈 Test Reports and Monitoring

### HTML Reports
```bash
# Generate and view HTML report
npm run test:report
```

### Performance Metrics
The test suite automatically measures and reports:
- Board load times
- Drag operation latency
- Animation performance
- Memory usage patterns
- Network request timing

### Visual Regression Tracking
- Baseline images stored in `tests/fixtures/screenshots/`
- Automatic comparison on test runs
- Diff images generated for failures
- Cross-browser visual consistency

## 🔧 Configuration

### Playwright Configuration
The tests use the main `playwright.config.ts` with Kanban-specific settings:
- Extended timeout for drag operations
- Visual testing configuration
- Mobile device emulation
- Network throttling for performance tests

### Environment Variables
```bash
# Test environment settings
NODE_ENV=test
BASE_URL=http://localhost:3000

# Performance testing thresholds
MAX_BOARD_LOAD_TIME=2000
MAX_DRAG_LATENCY=100
MAX_REALTIME_DELAY=500
```

## 🐛 Troubleshooting

### Common Issues

**Drag and Drop Failures**
- Ensure proper timing between mouse events
- Verify element visibility before drag operations
- Check for overlapping elements that might interfere

**Visual Test Failures**
- Update baseline images when UI changes are intentional
- Check for animation timing differences across environments
- Verify consistent font rendering

**Real-time Test Issues**
- Ensure WebSocket mock is properly set up
- Verify test isolation between scenarios
- Check for race conditions in async operations

**Performance Test Variability**
- Run performance tests in isolation (`--workers=1`)
- Account for system load variations
- Use relative performance comparisons

### Debug Helpers

**Test Data Inspection**
```javascript
// Log current board state
console.log(await boardPage.getBoardTitle());
console.log(await boardPage.getColumns());
```

**Visual Debug**
```javascript
// Take screenshot for manual inspection
await page.screenshot({ path: 'debug-screenshot.png' });
```

**Network Monitoring**
```javascript
// Monitor API calls during tests
page.on('request', request => console.log('Request:', request.url()));
page.on('response', response => console.log('Response:', response.status()));
```

## 🎨 Best Practices

### Test Organization
- Use descriptive test names that explain the scenario
- Group related tests in `describe` blocks
- Maintain proper test isolation and cleanup
- Follow the AAA pattern (Arrange, Act, Assert)

### Page Object Usage
- Use page objects for all UI interactions
- Keep business logic in page objects, not tests
- Maintain consistent method naming across page objects
- Use meaningful selector strategies (data-testid preferred)

### Data Management
- Use test data generators for dynamic content
- Clean up test data after each test
- Use meaningful test data that reflects real usage
- Avoid hardcoded values that might change

### Performance Considerations
- Minimize test setup overhead
- Use parallel execution where possible
- Cache expensive operations (board creation)
- Monitor test execution time and optimize slow tests

## 📚 Additional Resources

### Playwright Documentation
- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [Page Object Model](https://playwright.dev/docs/test-pom)
- [Visual Testing](https://playwright.dev/docs/test-screenshots)

### Kanban Best Practices
- [Kanban Methodology](https://www.atlassian.com/agile/kanban)
- [Drag and Drop UX](https://www.nngroup.com/articles/drag-drop/)
- [Touch Interface Design](https://www.smashingmagazine.com/2012/02/finger-friendly-design-ideal-mobile-touchscreen-target-sizes/)

### Accessibility Testing
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Keyboard Navigation Patterns](https://webaim.org/techniques/keyboard/)

---

## 🔄 Continuous Integration

The Kanban test suite is designed to integrate with CI/CD pipelines:

```yaml
# Example GitHub Actions configuration
- name: Run Kanban Tests
  run: |
    npm run test:e2e -- --grep "Kanban"
    npm run test:visual tests/visual/kanban-*.spec.ts
```

### Test Artifacts
- HTML reports with detailed results
- Screenshots and videos for failed tests
- Performance metrics and trends
- Visual regression diff images

This comprehensive test suite ensures the Kanban board functionality remains reliable, performant, and user-friendly across all supported platforms and scenarios.