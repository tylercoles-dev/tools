/**
 * Testing utilities for React components and hooks
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, RenderHookOptions } from '@testing-library/react';

// Create a custom QueryClient for testing
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
};

// Wrapper component with all providers
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

const AllProviders: React.FC<AllProvidersProps> = ({ 
  children, 
  queryClient = createTestQueryClient() 
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { queryClient, ...renderOptions } = options || {};
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders queryClient={queryClient}>{children}</AllProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Custom renderHook function with providers
interface CustomRenderHookOptions<TProps> extends RenderHookOptions<TProps> {
  queryClient?: QueryClient;
}

export const renderHookWithProviders = <TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: CustomRenderHookOptions<TProps>
) => {
  const { queryClient, ...renderHookOptions } = options || {};
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders queryClient={queryClient}>{children}</AllProviders>
  );

  return renderHook(hook, { wrapper, ...renderHookOptions });
};

// Mock toast function
export const mockToast = {
  toast: jest.fn(),
};

// Mock WebSocket for real-time hooks
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper methods for testing
  mockMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage?.(event);
    }
  }

  mockError() {
    this.onerror?.(new Event('error'));
  }
}

// Global WebSocket mock
export const mockWebSocket = () => {
  (global as any).WebSocket = MockWebSocket;
};

// Restore original WebSocket
export const restoreWebSocket = () => {
  delete (global as any).WebSocket;
};

// Mock API responses helper
export const createMockApiResponse = <T>(data: T, status: number = 200) => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: {},
  config: {},
});

// Wait for async operations to complete
export const waitForAsyncOperations = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Assert that a function is called with specific arguments
export const expectToHaveBeenCalledWith = (
  mockFn: jest.MockedFunction<any>,
  ...expectedArgs: any[]
) => {
  expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
};

// Cleanup helper for tests
export const cleanup = () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};

// Export everything from testing library for convenience
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { renderHook } from '@testing-library/react';