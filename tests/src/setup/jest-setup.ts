/**
 * Jest setup file - runs before each test
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(): R;
      toHaveValidMCPMessage(): R;
    }
  }
}

// Custom Jest matchers for MCP Tools testing
expect.extend({
  toBeValidApiResponse(received: any) {
    const pass = received && 
                 typeof received === 'object' &&
                 typeof received.success === 'boolean' &&
                 typeof received.timestamp === 'number';
    
    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid API response with success and timestamp fields`,
        pass: false,
      };
    }
  },

  toHaveValidMCPMessage(received: any) {
    const pass = received &&
                 typeof received === 'object' &&
                 received.jsonrpc === '2.0' &&
                 (received.id !== undefined || received.method !== undefined);

    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid MCP message`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid MCP JSON-RPC message`,
        pass: false,
      };
    }
  },
});

// Suppress console logs in tests unless DEBUG is set
if (!process.env.DEBUG) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}