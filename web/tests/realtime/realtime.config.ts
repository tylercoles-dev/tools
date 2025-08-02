/**
 * Real-time Collaboration Test Configuration
 * Configuration settings for WebSocket testing, multi-user simulation,
 * performance thresholds, and test environment setup.
 */

export interface RealtimeTestConfig {
  // WebSocket Configuration  
  websocket: {
    url: string;
    protocols?: string[];
    reconnectAttempts: number;
    reconnectInterval: number;
    heartbeatInterval: number;
    connectionTimeout: number;
  };

  // Multi-user Simulation
  simulation: {
    maxConcurrentUsers: number;
    userBatchSize: number;
    batchDelay: number;
    userActionDelay: number;
    syncTimeout: number;
  };

  // Performance Thresholds
  performance: {
    connection: {
      maxEstablishmentTime: number;
      maxReconnectionTime: number;
      minSuccessRate: number;
    };
    messaging: {
      maxAverageLatency: number;
      maxLatency: number;
      minThroughput: number;
      minSuccessRate: number;
    };
    memory: {
      maxIncrease: number;
      maxIncreasePercent: number;
    };
    ui: {
      maxRenderTime: number;
      maxInteractionDelay: number;
    };
  };

  // Network Simulation
  network: {
    conditions: {
      [key: string]: {
        latency: number;
        downloadThroughput: number;
        uploadThroughput: number;
        packetLoss?: number;
      };
    };
    defaultCondition: string;
  };

  // Test Timeouts
  timeouts: {
    short: number;
    medium: number;
    long: number;
    performance: number;
    scalability: number;
  };

  // Mock Server Configuration
  mockServer: {
    port: number;
    delayMs: number;
    failureRate: number;
    messageHistory: boolean;
    maxHistorySize: number;
  };

  // Feature Flags
  features: {
    presenceIndicators: boolean;
    typingIndicators: boolean;
    cursorSharing: boolean;
    conflictResolution: boolean;
    offlineMode: boolean;
    crossToolSync: boolean;
    activityFeed: boolean;
    notifications: boolean;
  };
}

export const DEFAULT_REALTIME_CONFIG: RealtimeTestConfig = {
  websocket: {
    url: process.env.WS_BASE_URL || 'ws://localhost:3001/ws',
    protocols: ['mcp-realtime-v1'],
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    connectionTimeout: 10000,
  },

  simulation: {
    maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_USERS || '50'),
    userBatchSize: 5,
    batchDelay: 2000,
    userActionDelay: 100,
    syncTimeout: 15000,
  },

  performance: {
    connection: {
      maxEstablishmentTime: 5000,
      maxReconnectionTime: 20000,
      minSuccessRate: 95,
    },
    messaging: {
      maxAverageLatency: 1000,
      maxLatency: 5000,
      minThroughput: 5,
      minSuccessRate: 95,
    },
    memory: {
      maxIncrease: 100 * 1024 * 1024, // 100MB
      maxIncreasePercent: 200,
    },
    ui: {
      maxRenderTime: 1000,
      maxInteractionDelay: 500,
    },
  },

  network: {
    conditions: {
      FAST_WIFI: {
        latency: 20,
        downloadThroughput: 10000000,
        uploadThroughput: 10000000,
      },
      SLOW_WIFI: {
        latency: 100,
        downloadThroughput: 1000000,
        uploadThroughput: 1000000,
      },
      FAST_3G: {
        latency: 562,
        downloadThroughput: 1600000,
        uploadThroughput: 750000,
      },
      SLOW_3G: {
        latency: 2000,
        downloadThroughput: 500000,
        uploadThroughput: 500000,
      },
      OFFLINE: {
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      },
    },
    defaultCondition: 'FAST_WIFI',
  },

  timeouts: {
    short: 5000,
    medium: 15000,
    long: 30000,
    performance: 60000,
    scalability: 120000,
  },

  mockServer: {
    port: parseInt(process.env.MOCK_SERVER_PORT || '3002'),
    delayMs: parseInt(process.env.MOCK_LATENCY_MS || '100'),
    failureRate: parseFloat(process.env.MOCK_FAILURE_RATE || '0.01'),
    messageHistory: true,
    maxHistorySize: 1000,
  },

  features: {
    presenceIndicators: true,
    typingIndicators: true,
    cursorSharing: true,
    conflictResolution: true,
    offlineMode: true,
    crossToolSync: true,
    activityFeed: true,
    notifications: true,
  },
};

export interface TestScenario {
  name: string;
  description: string;
  userCount: number;
  duration: number;
  networkCondition?: string;
  actions: TestAction[];
  expectedOutcome: string;
  performanceThresholds?: Partial<RealtimeTestConfig['performance']>;
}

export interface TestAction {
  type: 'navigate' | 'click' | 'type' | 'drag' | 'wait' | 'custom';
  selector?: string;
  text?: string;
  delay?: number;
  fromSelector?: string;
  toSelector?: string;
  customAction?: string;
  userIndex?: number; // If undefined, applies to all users
}

export const PREDEFINED_SCENARIOS: TestScenario[] = [
  {
    name: 'Basic Collaboration',
    description: 'Two users collaborating on a Kanban board',
    userCount: 2,
    duration: 30000,
    actions: [
      { type: 'navigate', selector: '/kanban' },
      { type: 'click', selector: '[data-testid="create-board-button"]' },
      { type: 'type', selector: '[data-testid="board-name-input"]', text: 'Collaboration Test' },
      { type: 'click', selector: '[data-testid="create-board-submit"]' },
      { type: 'wait', delay: 2000 },
      { type: 'click', selector: '[data-testid*="add-card-button"]', userIndex: 0 },
      { type: 'type', selector: '[data-testid="card-title-input"]', text: 'Card by User 0', userIndex: 0 },
      { type: 'click', selector: '[data-testid="create-card-button"]', userIndex: 0 },
      { type: 'click', selector: '[data-testid*="add-card-button"]', userIndex: 1 },
      { type: 'type', selector: '[data-testid="card-title-input"]', text: 'Card by User 1', userIndex: 1 },
      { type: 'click', selector: '[data-testid="create-card-button"]', userIndex: 1 },
      { type: 'wait', delay: 3000 },
    ],
    expectedOutcome: 'Both users see both cards in real-time',
  },

  {
    name: 'High Frequency Operations',
    description: 'Rapid operations from multiple users',
    userCount: 5,
    duration: 60000,
    networkCondition: 'FAST_3G',
    actions: [
      { type: 'navigate', selector: '/kanban' },
      { type: 'custom', customAction: 'createBoardWithColumns' },
      { type: 'custom', customAction: 'rapidCardCreation' },
      { type: 'custom', customAction: 'rapidCardMovement' },
    ],
    expectedOutcome: 'All operations synchronized without data loss',
    performanceThresholds: {
      messaging: {
        maxAverageLatency: 2000,
        minThroughput: 3,
      },
    },
  },

  {
    name: 'Network Resilience',
    description: 'Collaboration during network interruptions',
    userCount: 3,
    duration: 45000,
    actions: [
      { type: 'navigate', selector: '/wiki' },
      { type: 'custom', customAction: 'createWikiPage' },
      { type: 'custom', customAction: 'collaborativeEditing' },
      { type: 'custom', customAction: 'simulateNetworkInterruption' },
      { type: 'custom', customAction: 'resumeCollaboration' },
    ],
    expectedOutcome: 'Content synchronized after network recovery',
  },

  {
    name: 'Scalability Stress Test',
    description: 'Maximum supported concurrent users',
    userCount: 25,
    duration: 90000,
    actions: [
      { type: 'navigate', selector: '/dashboard' },
      { type: 'custom', customAction: 'distributedBoardCreation' },
      { type: 'custom', customAction: 'massiveCardOperations' },
      { type: 'wait', delay: 30000 },
    ],
    expectedOutcome: 'System remains responsive with all users',
    performanceThresholds: {
      connection: {
        maxEstablishmentTime: 15000,
      },
      messaging: {
        maxAverageLatency: 3000,
        minThroughput: 2,
      },
    },
  },
];

export const PERFORMANCE_BENCHMARKS = {
  userCounts: [1, 2, 5, 10, 25, 50],
  networkConditions: ['FAST_WIFI', 'SLOW_WIFI', 'FAST_3G', 'SLOW_3G'],
  testDurations: {
    quick: 30000,
    standard: 60000,
    extended: 120000,
    stress: 300000,
  },
  messageVolumes: {
    low: 10,
    medium: 100,
    high: 1000,
    stress: 5000,
  },
};

export interface TestReportConfig {
  outputPath: string;
  formats: ('json' | 'html' | 'csv')[];
  includeMetrics: boolean;
  includeScreenshots: boolean;
  includeVideoRecordings: boolean;
  metricsCollection: {
    performanceMetrics: boolean;
    memoryUsage: boolean;
    networkActivity: boolean;
    userInteractions: boolean;
  };
}

export const DEFAULT_REPORT_CONFIG: TestReportConfig = {
  outputPath: './test-results/realtime',
  formats: ['json', 'html'],
  includeMetrics: true,
  includeScreenshots: true,
  includeVideoRecordings: false,
  metricsCollection: {
    performanceMetrics: true,
    memoryUsage: true,
    networkActivity: true,
    userInteractions: true,
  },
};

export function getTestConfig(overrides?: Partial<RealtimeTestConfig>): RealtimeTestConfig {
  return {
    ...DEFAULT_REALTIME_CONFIG,
    ...overrides,
    websocket: {
      ...DEFAULT_REALTIME_CONFIG.websocket,
      ...overrides?.websocket,
    },
    simulation: {
      ...DEFAULT_REALTIME_CONFIG.simulation,
      ...overrides?.simulation,
    },
    performance: {
      ...DEFAULT_REALTIME_CONFIG.performance,
      connection: {
        ...DEFAULT_REALTIME_CONFIG.performance.connection,
        ...overrides?.performance?.connection,
      },
      messaging: {
        ...DEFAULT_REALTIME_CONFIG.performance.messaging,
        ...overrides?.performance?.messaging,
      },
      memory: {
        ...DEFAULT_REALTIME_CONFIG.performance.memory,
        ...overrides?.performance?.memory,
      },
      ui: {
        ...DEFAULT_REALTIME_CONFIG.performance.ui,
        ...overrides?.performance?.ui,
      },
    },
    network: {
      ...DEFAULT_REALTIME_CONFIG.network,
      ...overrides?.network,
    },
    timeouts: {
      ...DEFAULT_REALTIME_CONFIG.timeouts,
      ...overrides?.timeouts,
    },
    mockServer: {
      ...DEFAULT_REALTIME_CONFIG.mockServer,
      ...overrides?.mockServer,
    },
    features: {
      ...DEFAULT_REALTIME_CONFIG.features,
      ...overrides?.features,
    },
  };
}

export function getScenarioConfig(scenarioName: string): TestScenario | undefined {
  return PREDEFINED_SCENARIOS.find(scenario => scenario.name === scenarioName);
}

export function validatePerformanceThresholds(
  metrics: any,
  config: RealtimeTestConfig
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  // Connection performance
  if (metrics.connectionTime > config.performance.connection.maxEstablishmentTime) {
    failures.push(`Connection time ${metrics.connectionTime}ms exceeds threshold ${config.performance.connection.maxEstablishmentTime}ms`);
  }

  if (metrics.reconnectionTime > config.performance.connection.maxReconnectionTime) {
    failures.push(`Reconnection time ${metrics.reconnectionTime}ms exceeds threshold ${config.performance.connection.maxReconnectionTime}ms`);
  }

  // Messaging performance
  if (metrics.averageLatency > config.performance.messaging.maxAverageLatency) {
    failures.push(`Average latency ${metrics.averageLatency}ms exceeds threshold ${config.performance.messaging.maxAverageLatency}ms`);
  }

  if (metrics.maxLatency > config.performance.messaging.maxLatency) {
    failures.push(`Max latency ${metrics.maxLatency}ms exceeds threshold ${config.performance.messaging.maxLatency}ms`);
  }

  if (metrics.throughput < config.performance.messaging.minThroughput) {
    failures.push(`Throughput ${metrics.throughput} msg/s below threshold ${config.performance.messaging.minThroughput} msg/s`);
  }

  if (metrics.messageSuccessRate < config.performance.messaging.minSuccessRate) {
    failures.push(`Message success rate ${metrics.messageSuccessRate}% below threshold ${config.performance.messaging.minSuccessRate}%`);
  }

  // Memory performance
  if (metrics.memoryIncrease > config.performance.memory.maxIncrease) {
    failures.push(`Memory increase ${metrics.memoryIncrease} bytes exceeds threshold ${config.performance.memory.maxIncrease} bytes`);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export function createTestMatrix(
  baseScenario: TestScenario,
  variations: {
    userCounts?: number[];
    networkConditions?: string[];
    durations?: number[];
  }
): TestScenario[] {
  const matrix: TestScenario[] = [];

  const userCounts = variations.userCounts || [baseScenario.userCount];
  const networkConditions = variations.networkConditions || [baseScenario.networkCondition || 'FAST_WIFI'];
  const durations = variations.durations || [baseScenario.duration];

  for (const userCount of userCounts) {
    for (const networkCondition of networkConditions) {
      for (const duration of durations) {
        matrix.push({
          ...baseScenario,
          name: `${baseScenario.name} (${userCount} users, ${networkCondition}, ${duration}ms)`,
          userCount,
          networkCondition,
          duration,
        });
      }
    }
  }

  return matrix;
}

// Environment-specific configurations
export const CI_CONFIG: Partial<RealtimeTestConfig> = {
  simulation: {
    maxConcurrentUsers: 10,
    userBatchSize: 2,
    batchDelay: 3000,
    userActionDelay: 200,
    syncTimeout: 30000,
  },
  timeouts: {
    short: 10000,
    medium: 30000,
    long: 60000,
    performance: 120000,
    scalability: 300000,
  },
  performance: {
    connection: {
      maxEstablishmentTime: 10000,
      maxReconnectionTime: 30000,
      minSuccessRate: 90,
    },
    messaging: {
      maxAverageLatency: 2000,
      maxLatency: 10000,
      minThroughput: 3,
      minSuccessRate: 90,
    },
  },
};

export const LOCAL_DEV_CONFIG: Partial<RealtimeTestConfig> = {
  simulation: {
    maxConcurrentUsers: 25,
    userBatchSize: 5,
    batchDelay: 1000,
    userActionDelay: 50,
    syncTimeout: 10000,
  },
  mockServer: {
    delayMs: 50,
    failureRate: 0.005,
  },
};

export const STRESS_TEST_CONFIG: Partial<RealtimeTestConfig> = {
  simulation: {
    maxConcurrentUsers: 100,
    userBatchSize: 10,
    batchDelay: 500,
    userActionDelay: 20,
    syncTimeout: 60000,
  },
  timeouts: {
    short: 15000,
    medium: 60000,
    long: 120000,
    performance: 300000,
    scalability: 600000,
  },
  performance: {
    messaging: {
      maxAverageLatency: 5000,
      maxLatency: 15000,
      minThroughput: 1,
      minSuccessRate: 85,
    },
  },
};