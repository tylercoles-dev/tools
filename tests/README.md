# MCP Tools Integration Testing Framework

Comprehensive end-to-end and integration testing suite for the MCP Tools ecosystem.

## Overview

This testing framework provides:

- **Integration Tests** - Cross-service communication and data flow validation
- **End-to-End Tests** - Complete user workflow testing
- **Performance Tests** - Load testing and performance benchmarks
- **API Contract Tests** - REST API and MCP protocol validation

## Quick Start

### Prerequisites

- All MCP Tools services built and ready
- Node.js 18.0.0+
- npm 8.0.0+

### Installation

```bash
cd tests
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests only
npm run test:performance   # Performance tests only

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Environment Setup

The test framework automatically:

1. **Builds all components** before testing
2. **Starts required services** (gateway, workers)
3. **Creates test databases** (separate from development data)
4. **Cleans up** after tests complete

## Test Structure

```
tests/
├── src/
│   ├── integration/        # Cross-service integration tests
│   │   ├── api-gateway.test.ts
│   │   ├── kanban-workflow.test.ts
│   │   └── embeddings-worker.test.ts
│   ├── e2e/               # End-to-end workflow tests
│   │   └── full-workflow.test.ts
│   ├── performance/       # Performance and load tests
│   │   └── load-testing.test.ts
│   ├── utils/            # Test utilities and helpers
│   │   └── test-client.ts
│   └── setup/            # Test environment setup
│       ├── jest-setup.ts
│       ├── global-setup.ts
│       └── global-teardown.ts
├── jest.config.js         # Jest configuration
├── tsconfig.json         # TypeScript configuration
└── .env.test            # Test environment variables
```

## Test Categories

### Integration Tests

Test individual service integration points:

- **API Gateway** - Health checks, error handling, request/response format
- **Kanban Workflow** - Board/card management, cross-component integration
- **Embeddings Worker** - Memory processing, batch operations, error handling

### End-to-End Tests

Test complete user workflows:

- **Project Management** - Full project lifecycle from board creation to completion
- **Knowledge Management** - Wiki pages, memory linking, cross-service search
- **Real-time Collaboration** - WebSocket updates and live synchronization
- **Error Recovery** - Service failure handling and data consistency

### Performance Tests

Validate system performance under load:

- **API Performance** - Concurrent requests, sustained load testing
- **Database Performance** - Large dataset operations, query optimization
- **Memory Usage** - Memory leak detection, resource cleanup

## Test Utilities

### TestAPIClient

HTTP client for testing REST APIs:

```typescript
const client = new TestAPIClient('http://localhost:3001');

// Health checks
const health = await client.getHealth();

// Kanban operations
const board = await client.createKanbanBoard(boardData);
const boards = await client.getKanbanBoards();

// Memory operations
const memory = await client.createMemory(memoryData);
const memories = await client.getMemories();

// MCP tool calls
const result = await client.callMCPTool('kanban', toolCall);
```

### TestWebSocketClient

WebSocket client for real-time testing:

```typescript
const wsClient = new TestWebSocketClient('ws://localhost:3001');
await wsClient.connect();

// Listen for updates
wsClient.onMessage('kanban_update', (data) => {
  console.log('Kanban update:', data);
});

// Send messages
wsClient.send({ type: 'subscribe', channel: 'kanban' });
```

### TestDataGenerator

Generates test data:

```typescript
// Random test data
const board = TestDataGenerator.randomKanbanBoard();
const memory = TestDataGenerator.randomMemory();
const card = TestDataGenerator.randomKanbanCard(boardId, columnId);

// Utilities
const email = TestDataGenerator.randomEmail();
const string = TestDataGenerator.randomString(10);
```

## Configuration

### Environment Variables (.env.test)

```env
NODE_ENV=test
GATEWAY_PORT=3001
DATABASE_URL=sqlite:./memory-test.db
KANBAN_DATABASE_URL=sqlite:./kanban-test.db
EMBEDDING_PROVIDER=ollama
TEST_TIMEOUT=30000
```

### Jest Configuration

- **Test Environment**: Node.js
- **Module System**: ESM
- **Test Timeout**: 30 seconds
- **Max Workers**: 1 (sequential for integration tests)
- **Coverage**: Text, LCOV, HTML reports

## Custom Matchers

The framework includes custom Jest matchers:

```typescript
// API response validation
expect(response.data).toBeValidApiResponse();

// MCP message validation
expect(message).toHaveValidMCPMessage();
```

## Service Management

### Automatic Service Lifecycle

Tests automatically manage service lifecycle:

1. **Global Setup** - Build components, start services, wait for readiness
2. **Test Execution** - Run tests with services running
3. **Global Teardown** - Gracefully shutdown services, cleanup resources

### Manual Service Control

```bash
# Start services manually
npm run start:services

# Stop services
npm run stop:services

# Setup test environment
npm run setup

# Cleanup test environment
npm run teardown
```

## Best Practices

### Writing Integration Tests

1. **Use realistic data** - Test with data that resembles production
2. **Test error scenarios** - Validate error handling and edge cases
3. **Verify cross-service communication** - Ensure services work together
4. **Check data consistency** - Validate data integrity across services

### Performance Testing

1. **Set realistic expectations** - Base on production requirements
2. **Test under load** - Validate concurrent usage scenarios
3. **Monitor resources** - Check memory usage and resource cleanup
4. **Measure consistently** - Use consistent test environments

### Test Isolation

1. **Use test databases** - Separate from development data
2. **Clean up after tests** - Remove test data between runs
3. **Avoid test dependencies** - Each test should be independent
4. **Reset state** - Ensure consistent starting conditions

## Troubleshooting

### Common Issues

#### Services Not Starting

```bash
# Check if ports are in use
netstat -tulpn | grep :3001

# Build components manually
cd ../core && npm run build
cd ../gateway && npm run build
```

#### Database Issues

```bash
# Remove test databases
rm -f ../gateway/*-test.db

# Check database permissions
ls -la ../gateway/*.db
```

#### Timeout Issues

```bash
# Increase test timeout
export TEST_TIMEOUT=60000

# Run with debug logging
export DEBUG=true npm test
```

### Debug Mode

Run tests with detailed logging:

```bash
DEBUG=true npm test
```

### Selective Test Execution

```bash
# Run specific test file
npm test -- api-gateway.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Health Checks"

# Run tests in specific directory
npm test -- integration/
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd tests
          npm install
      
      - name: Run integration tests
        run: |
          cd tests
          npm run test:integration
      
      - name: Run e2e tests
        run: |
          cd tests
          npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: tests/coverage/lcov.info
```

## Contributing

1. **Follow test structure** - Place tests in appropriate categories
2. **Use test utilities** - Leverage existing helpers and clients
3. **Add documentation** - Document new test scenarios
4. **Update examples** - Keep examples current with API changes

## Future Enhancements

- **Visual regression testing** - Web client screenshot comparisons
- **Contract testing** - Pact.js integration for API contracts
- **Chaos engineering** - Service failure simulation
- **Monitoring integration** - Performance metrics collection