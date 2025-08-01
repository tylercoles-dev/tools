import { defineConfig, devices } from '@playwright/test';

/**
 * Comprehensive Cross-Browser Compatibility Testing Configuration
 * Supports Desktop: Chrome, Firefox, Safari, Edge
 * Mobile: Chrome Mobile, Safari Mobile, Samsung Internet
 * Legacy: IE11 (limited), older browser versions
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Directory for test files
  testDir: './tests',
  
  // Maximum time one test can run for (increased for cross-browser testing)
  timeout: 60 * 1000,
  
  // Test timeout for each individual test
  expect: {
    timeout: 10000, // Increased for slower browsers
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only (increased for cross-browser flakiness)
  retries: process.env.CI ? 3 : 1,
  
  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 2 : undefined,
  
  // Enhanced reporter configuration for cross-browser testing
  reporter: [
    ['html', { 
      open: 'never',
      outputFolder: 'test-results/html-report'
    }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['github'], // GitHub Actions integration
    ['./tests/utils/cross-browser-reporter.ts'], // Custom cross-browser reporter
  ],
  
  // Shared test options
  use: {
    // Base URL for all tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser context options
    ignoreHTTPSErrors: true,
    
    // Global test timeout (increased for cross-browser compatibility)
    actionTimeout: 15000,
    
    // Enhanced screenshot configuration
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    // Enhanced video recording for cross-browser debugging
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
    
    // Enhanced trace collection
    trace: {
      mode: 'retain-on-failure',
      sources: true,
      screenshots: true,
      snapshots: true
    },
    
    // Default viewport size
    viewport: { width: 1280, height: 720 },
    
    // Locale and timezone for consistent testing
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Color scheme preference
    colorScheme: 'light',
    
    // Reduced motion for consistent animations
    reducedMotion: 'reduce',
  },

  // Comprehensive cross-browser project matrix
  projects: [
    // Setup project - runs before all tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // === DESKTOP BROWSERS - CHROMIUM-BASED ===
    {
      name: 'chrome-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
        channel: 'chrome',
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/mobile/**', '**/legacy/**'],
    },

    {
      name: 'chrome-desktop-headless',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
        headless: true,
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/mobile/**', '**/legacy/**', '**/visual/**'],
    },

    {
      name: 'edge-desktop',
      use: { 
        ...devices['Desktop Edge'],
        storageState: 'tests/fixtures/auth.json',
        channel: 'msedge',
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/mobile/**', '**/legacy/**'],
    },

    // === DESKTOP BROWSERS - FIREFOX ===
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'tests/fixtures/auth.json',
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': true,
            'dom.push.enabled': true,
            'dom.serviceWorkers.enabled': true,
          }
        }
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/mobile/**', '**/legacy/**'],
    },

    {
      name: 'firefox-esr',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'tests/fixtures/auth.json',
        channel: 'firefox-esr',
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': true,
          }
        }
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/mobile/**', '**/legacy/**', '**/modern-features/**'],
    },

    // === DESKTOP BROWSERS - WEBKIT (SAFARI) ===
    {
      name: 'safari-desktop',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/mobile/**', '**/legacy/**'],
    },

    // === MOBILE BROWSERS - ANDROID ===
    {
      name: 'chrome-mobile-android',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/desktop/**', '**/legacy/**'],
    },

    {
      name: 'samsung-internet-mobile',
      use: { 
        ...devices['Galaxy S9+'],
        storageState: 'tests/fixtures/auth.json',
        // Samsung Internet specific user agent
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G965F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/9.2 Chrome/67.0.3396.87 Mobile Safari/537.36',
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/desktop/**', '**/legacy/**'],
    },

    // === MOBILE BROWSERS - iOS ===
    {
      name: 'safari-mobile-ios',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/desktop/**', '**/legacy/**'],
    },

    {
      name: 'safari-mobile-ipad',
      use: { 
        ...devices['iPad Pro'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
      testDir: './tests',
      testIgnore: ['**/desktop/**', '**/legacy/**'],
    },

    // === CROSS-BROWSER COMPATIBILITY SPECIFIC PROJECTS ===
    
    // Feature compatibility testing
    {
      name: 'feature-compatibility',
      testMatch: '**/cross-browser/feature-compatibility/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
    },

    // UI consistency testing across browsers
    {
      name: 'ui-consistency',
      testMatch: '**/cross-browser/ui-consistency/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
    },

    // Performance cross-browser testing
    {
      name: 'performance-cross-browser',
      testMatch: '**/cross-browser/performance/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
    },

    // Visual regression cross-browser
    {
      name: 'visual-cross-browser',
      testMatch: '**/cross-browser/visual/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
    },

    // Legacy browser support
    {
      name: 'legacy-support',
      testMatch: '**/cross-browser/legacy/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
        // Simulate older browser capabilities
        javaScriptEnabled: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko', // IE11
      },
      dependencies: ['setup'],
    },

    // Accessibility cross-browser
    {
      name: 'accessibility-cross-browser',
      testMatch: '**/cross-browser/accessibility/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
        // High contrast mode simulation
        colorScheme: 'dark',
        forcedColors: 'active',
      },
      dependencies: ['setup'],
    },

    // Security cross-browser
    {
      name: 'security-cross-browser',
      testMatch: '**/cross-browser/security/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
    },

    // === BROWSER-SPECIFIC TEST PROJECTS ===
    
    // Chrome-specific tests
    {
      name: 'chrome-specific',
      testMatch: '**/browser-specific/chrome/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/auth.json',
        channel: 'chrome',
      },
      dependencies: ['setup'],
    },

    // Firefox-specific tests
    {
      name: 'firefox-specific',
      testMatch: '**/browser-specific/firefox/**/*.spec.ts',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
    },

    // Safari-specific tests
    {
      name: 'safari-specific',
      testMatch: '**/browser-specific/safari/**/*.spec.ts',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
    },

    // Mobile-specific tests
    {
      name: 'mobile-specific',
      testMatch: '**/browser-specific/mobile/**/*.spec.ts',
      use: {
        ...devices['iPhone 12'],
        storageState: 'tests/fixtures/auth.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Enhanced web server configuration for cross-browser testing
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000, // Increased timeout for cross-browser testing
      env: {
        NODE_ENV: 'test',
        NEXT_PUBLIC_CROSS_BROWSER_TESTING: 'true',
      },
    },
    // API gateway for full integration tests
    {
      command: 'cd ../gateway && npm run dev',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: 'test',
        PORT: '3001',
        CROSS_BROWSER_TESTING: 'true',
      },
    },
  ],

  // Enhanced global setup and teardown for cross-browser testing
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),

  // Output directory for test results
  outputDir: 'test-results/',
  
  // Enhanced snapshot configuration for cross-browser visual testing
  snapshotDir: './tests/fixtures/screenshots',
  snapshotPathTemplate: '{testDir}/{testFileDir}/screenshots/{testFileName}-{projectName}-{platform}{ext}',
  
  // Update snapshots based on browser
  updateSnapshots: process.env.UPDATE_SNAPSHOTS ? 'all' : 'missing',
  
  // Metadata for cross-browser testing
  metadata: {
    testType: 'cross-browser-compatibility',
    browsers: ['chrome', 'firefox', 'safari', 'edge'],
    platforms: ['desktop', 'mobile'],
    features: ['ui-consistency', 'feature-compatibility', 'performance', 'accessibility'],
  },
});