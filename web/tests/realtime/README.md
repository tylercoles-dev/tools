# Real-time Collaboration Test Suite

This directory contains comprehensive tests for real-time collaboration features in the MCP Tools web client. The test suite validates WebSocket functionality, multi-user scenarios, and ensures reliable collaborative experiences across all MCP Tools features.

## Test Structure

### Core Test Files

- **`websocket-connection.realtime.spec.ts`** - WebSocket connection management, authentication, and handshake tests
- **`kanban-collaboration.realtime.spec.ts`** - Real-time Kanban board collaboration (drag-drop, live updates)
- **`wiki-collaboration.realtime.spec.ts`** - Wiki collaborative editing with Operational Transformation
- **`conflict-resolution.realtime.spec.ts`** - Conflict resolution and data integrity validation
- **`connection-resilience.realtime.spec.ts`** - Network disconnection/reconnection scenarios
- **`performance-scalability.realtime.spec.ts`** - Performance testing with multiple concurrent users
- **`presence-activity.realtime.spec.ts`** - User presence indicators and activity feed synchronization

### Utility Files

- **`../utils/websocket-mock.ts`** - WebSocket testing utilities and mock server
- **`../utils/realtime-test-helpers.ts`** - Multi-user simulation framework and helpers

## Test Categories

### 1. WebSocket Connection Tests
- Connection establishment and handshake
- Authentication over WebSocket connections
- Heartbeat mechanisms and connection persistence
- Automatic reconnection on connection loss
- Cross-tab synchronization

### 2. Multi-User Collaboration Tests
- Simultaneous user actions and state synchronization
- Concurrent editing scenarios
- User join/leave handling
- Presence indicators and activity awareness

### 3. Kanban Real-time Features
- Live card creation and updates
- Drag-and-drop synchronization between users  
- Column operations (create, rename, delete)
- Board permission changes during collaboration
- Real-time notifications for card movements

### 4. Wiki Collaborative Editing
- Simultaneous text editing with Operational Transformation
- Cursor position sharing and visibility
- Paragraph-level locking during editing
- Version control with collaborative sessions
- Comment and discussion synchronization

### 5. Conflict Resolution
- Last-write-wins vs operational transformation
- Data integrity validation after conflicts
- User notification of conflicts
- Rollback mechanisms for failed operations
- Optimistic UI updates with server validation

### 6. Connection Resilience
- Network disconnection/reconnection scenarios
- Offline editing with sync on reconnection
- Partial message delivery handling
- Server restart during active collaboration
- Connection pooling and resource management

### 7. Performance and Scalability
- Multiple concurrent users (10+, 25+, 50+ users)
- Message throughput and latency measurement
- Memory usage with persistent connections
- Network bandwidth utilization
- Browser resource consumption

### 8. User Presence and Activity
- Online/offline user status indicators
- "Who's viewing this" indicators
- Cursor positions and typing indicators
- Activity feed updates and notifications
- Cross-tool presence (Kanban, Wiki, Memory)

## Running the Tests

### Prerequisites

1. **WebSocket Mock Server**: Tests use a mock WebSocket server for controlled testing
2. **Multi-user Simulation**: Framework supports up to 100+ concurrent simulated users
3. **Network Simulation**: Built-in network condition simulation (3G, WiFi, offline)

### Running Individual Test Suites

```bash
# WebSocket connection tests
npx playwright test tests/realtime/websocket-connection.realtime.spec.ts

# Kanban collaboration tests  
npx playwright test tests/realtime/kanban-collaboration.realtime.spec.ts

# Wiki collaboration tests
npx playwright test tests/realtime/wiki-collaboration.realtime.spec.ts

# Conflict resolution tests
npx playwright test tests/realtime/conflict-resolution.realtime.spec.ts

# Connection resilience tests
npx playwright test tests/realtime/connection-resilience.realtime.spec.ts

# Performance and scalability tests
npx playwright test tests/realtime/performance-scalability.realtime.spec.ts

# User presence and activity tests
npx playwright test tests/realtime/presence-activity.realtime.spec.ts
```

### Running All Real-time Tests

```bash
# Run all real-time collaboration tests
npx playwright test tests/realtime/

# Run with specific browser
npx playwright test tests/realtime/ --project=chromium

# Run with parallel execution
npx playwright test tests/realtime/ --workers=4

# Run with headed mode for debugging
npx playwright test tests/realtime/ --headed

# Run with debug mode
npx playwright test tests/realtime/ --debug
```

### Performance Testing

```bash
# Run scalability tests with different user counts
npx playwright test tests/realtime/performance-scalability.realtime.spec.ts --grep "10 concurrent users"
npx playwright test tests/realtime/performance-scalability.realtime.spec.ts --grep "25 concurrent users"

# Run with custom timeouts for heavy tests
npx playwright test tests/realtime/performance-scalability.realtime.spec.ts --timeout=300000
```

## Test Configuration

### Environment Variables

```bash
# WebSocket server URL (default: ws://localhost:3001/ws)
WS_BASE_URL=ws://localhost:3001/ws

# API Gateway URL (default: http://localhost:3001)
API_BASE_URL=http://localhost:3001

# Test environment
NODE_ENV=test

# Enable debug logging
DEBUG=1

# Mock server configuration
MOCK_SERVER_PORT=3002
MOCK_LATENCY_MS=100
MOCK_FAILURE_RATE=0.01
```

### Playwright Configuration

The tests are configured in `playwright.config.ts` with:

- **Multiple browser projects**: Chromium, Firefox, WebKit
- **Mobile testing**: iPhone, Android simulators
- **Network conditions**: Fast/slow 3G, WiFi, offline
- **Video recording**: On failure for debugging
- **Screenshot capture**: On failure
- **Parallel execution**: Optimized for CI/CD

### Test Data

Tests use the `TestDataGenerator` from `../fixtures/test-data.ts` to create:
- Sample Kanban boards and cards
- Wiki pages with various content types
- Memory entries and relationships
- User profiles and authentication data

## Debugging Real-time Tests

### Common Issues

1. **WebSocket Connection Failures**
   - Check if mock server is running
   - Verify WebSocket URL configuration
   - Check network conditions simulation

2. **Multi-user Synchronization Issues**
   - Verify message broadcasting in mock server
   - Check for race conditions in concurrent operations
   - Ensure proper wait strategies for real-time sync

3. **Performance Test Failures**
   - Adjust timeout values for heavy tests
   - Monitor system resources during execution
   - Check browser connection limits

### Debug Tools

1. **Real-time Metrics Collector**
   ```typescript
   const metrics = await collaborationTester.measureRealtimePerformance(testFunction);
   console.log('Performance metrics:', metrics);
   ```

2. **WebSocket Message History**
   ```typescript
   const messages = await mockServer.getMessageHistory();
   console.log('WebSocket messages:', messages);
   ```

3. **Network Simulation**
   ```typescript
   await networkSimulator.setNetworkCondition(NetworkConditions.SLOW_3G);
   await networkSimulator.simulateIntermittentConnection(5000, 2000, 3);
   ```

### Visual Debugging

- Use `--headed` mode to see real-time collaboration in action
- Enable `--debug` to step through tests interactively
- Video recordings capture multi-user interactions for analysis

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Real-time Collaboration Tests

on: [push, pull_request]

jobs:
  realtime-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox]
        user-count: [5, 10, 25]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Install Playwright
        run: npx playwright install
      
      - name: Start services
        run: |
          npm run start:gateway &
          npm run start:mock-server &
          
      - name: Run real-time tests
        run: |
          npx playwright test tests/realtime/ \
            --project=${{ matrix.browser }} \
            --workers=2 \
            --reporter=junit
        env:
          USER_COUNT: ${{ matrix.user-count }}
          
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report-${{ matrix.browser }}-${{ matrix.user-count }}
          path: test-results/
```

## Monitoring and Analytics

### Test Metrics

The test suite collects comprehensive metrics:

- **Connection Performance**: Establishment time, reconnection time
- **Message Latency**: Average, min, max latencies for real-time operations
- **Throughput**: Messages per second under various conditions
- **Success Rates**: Message delivery and operation success rates
- **Resource Usage**: Memory consumption, CPU usage during tests
- **User Experience**: UI responsiveness during collaboration

### Performance Thresholds

Default performance expectations:

- **Connection Time**: < 5 seconds average, < 15 seconds max
- **Message Latency**: < 1 second average, < 5 seconds max
- **Throughput**: > 5 messages/second minimum
- **Success Rate**: > 95% message delivery
- **Memory Usage**: < 100MB increase during extended sessions
- **Multi-user Performance**: Support 25+ concurrent users

### Custom Reporting

```typescript
// Generate performance report
const report = await generatePerformanceReport(testResults);
await saveReport(report, 'realtime-performance-report.json');

// Slack/Discord notifications for CI
await notifyTeam({
  status: testResults.passed ? 'success' : 'failure',
  metrics: report.summary,
  failures: testResults.failures
});
```

## Contributing

### Adding New Real-time Tests

1. **Create test file**: Follow naming convention `feature-name.realtime.spec.ts`
2. **Use test utilities**: Leverage existing mock server and multi-user framework
3. **Include performance checks**: Add metrics collection for new features
4. **Document test scenarios**: Update this README with new test descriptions
5. **Add CI integration**: Include new tests in GitHub Actions workflow

### Test Quality Standards

- **Comprehensive coverage**: Test happy path, edge cases, and failure scenarios
- **Real-world simulation**: Use realistic user behaviors and network conditions
- **Performance validation**: Include latency, throughput, and resource usage checks
- **Cross-browser compatibility**: Ensure tests pass on Chromium, Firefox, WebKit
- **Mobile testing**: Include mobile-specific real-time scenarios
- **Documentation**: Clear test descriptions and debug information

This comprehensive test suite ensures the MCP Tools real-time collaboration features are robust, performant, and provide excellent user experiences across all supported platforms and network conditions.