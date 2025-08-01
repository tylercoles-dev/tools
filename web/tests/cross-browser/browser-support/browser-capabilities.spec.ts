/**
 * Browser Capabilities and Support Matrix Tests
 * 
 * Tests browser support for various web standards, APIs, and features
 * to create a comprehensive compatibility matrix.
 */

import { test, expect, Browser } from '@playwright/test';

// Browser support matrix for different features
const BROWSER_SUPPORT_MATRIX = {
  javascript: {
    es6: ['chrome', 'firefox', 'safari', 'edge'],
    es2017: ['chrome', 'firefox', 'safari', 'edge'],
    es2020: ['chrome', 'firefox', 'safari', 'edge'],
    modules: ['chrome', 'firefox', 'safari', 'edge'],
    dynamicImport: ['chrome', 'firefox', 'safari', 'edge'],
    optionalChaining: ['chrome', 'firefox', 'safari', 'edge'],
    nullishCoalescing: ['chrome', 'firefox', 'safari', 'edge']
  },
  css: {
    grid: ['chrome', 'firefox', 'safari', 'edge'],
    flexbox: ['chrome', 'firefox', 'safari', 'edge'],
    customProperties: ['chrome', 'firefox', 'safari', 'edge'],
    animations: ['chrome', 'firefox', 'safari', 'edge'],
    transforms: ['chrome', 'firefox', 'safari', 'edge'],
    gradients: ['chrome', 'firefox', 'safari', 'edge'],
    filters: ['chrome', 'firefox', 'safari', 'edge']
  },
  webapis: {
    fetch: ['chrome', 'firefox', 'safari', 'edge'],
    websocket: ['chrome', 'firefox', 'safari', 'edge'],
    webworkers: ['chrome', 'firefox', 'safari', 'edge'],
    serviceworkers: ['chrome', 'firefox', 'safari', 'edge'],
    indexeddb: ['chrome', 'firefox', 'safari', 'edge'],
    localstorage: ['chrome', 'firefox', 'safari', 'edge'],
    geolocation: ['chrome', 'firefox', 'safari', 'edge'],
    notifications: ['chrome', 'firefox', 'safari', 'edge'],
    clipboard: ['chrome', 'firefox', 'safari', 'edge'],
    dragdrop: ['chrome', 'firefox', 'safari', 'edge']
  },
  html5: {
    canvas: ['chrome', 'firefox', 'safari', 'edge'],
    video: ['chrome', 'firefox', 'safari', 'edge'],
    audio: ['chrome', 'firefox', 'safari', 'edge'],
    svg: ['chrome', 'firefox', 'safari', 'edge'],
    webgl: ['chrome', 'firefox', 'safari', 'edge'],
    history: ['chrome', 'firefox', 'safari', 'edge'],
    formvalidation: ['chrome', 'firefox', 'safari', 'edge']
  }
};

test.describe('Browser Capabilities Detection', () => {
  let browserName: string;
  let browserVersion: string;

  test.beforeEach(async ({ browserName: name, browser }) => {
    browserName = name;
    browserVersion = browser.version();
  });

  test('should detect JavaScript ES6+ features', async ({ page }) => {
    const capabilities = await page.evaluate(() => {
      const results: Record<string, boolean> = {};
      
      // Test ES6 features
      try {
        // Arrow functions
        eval('() => {}');
        results.arrowFunctions = true;
      } catch {
        results.arrowFunctions = false;
      }

      try {
        // Template literals
        eval('`template ${1} literal`');
        results.templateLiterals = true;
      } catch {
        results.templateLiterals = false;
      }

      try {
        // Destructuring
        eval('const [a, b] = [1, 2]; const {c} = {c: 3};');
        results.destructuring = true;
      } catch {
        results.destructuring = false;
      }

      try {
        // Spread operator
        eval('const arr = [1, ...[2, 3]];');
        results.spreadOperator = true;
      } catch {
        results.spreadOperator = false;
      }

      try {
        // Async/await
        eval('async function test() { await Promise.resolve(); }');
        results.asyncAwait = true;
      } catch {
        results.asyncAwait = false;
      }

      try {
        // Optional chaining
        eval('const obj = {}; obj?.prop?.subprop;');
        results.optionalChaining = true;
      } catch {
        results.optionalChaining = false;
      }

      try {
        // Nullish coalescing
        eval('const val = null ?? "default";');
        results.nullishCoalescing = true;
      } catch {
        results.nullishCoalescing = false;
      }

      try {
        // Modules (dynamic import)
        results.dynamicImport = typeof eval('import') === 'function';
      } catch {
        results.dynamicImport = false;
      }

      return results;
    });

    // Log capabilities for reporting
    console.log(`${browserName} JavaScript capabilities:`, capabilities);

    // Verify expected capabilities based on browser support matrix
    const supportedFeatures = BROWSER_SUPPORT_MATRIX.javascript;
    const browserKey = browserName.toLowerCase();

    Object.entries(capabilities).forEach(([feature, supported]) => {
      const expectedSupport = supportedFeatures[feature as keyof typeof supportedFeatures];
      if (expectedSupport && expectedSupport.includes(browserKey)) {
        expect(supported).toBe(true);
      }
    });
  });

  test('should detect CSS feature support', async ({ page }) => {
    const cssCapabilities = await page.evaluate(() => {
      const results: Record<string, boolean> = {};
      
      // Helper function to test CSS support
      const testCSSSupport = (property: string, value?: string): boolean => {
        const div = document.createElement('div');
        try {
          div.style.setProperty(property, value || 'initial');
          return div.style.getPropertyValue(property) !== '';
        } catch {
          return false;
        }
      };

      // Test CSS Grid
      results.grid = testCSSSupport('display', 'grid') && 
                   testCSSSupport('grid-template-columns', '1fr 1fr');

      // Test Flexbox
      results.flexbox = testCSSSupport('display', 'flex') &&
                       testCSSSupport('justify-content', 'center');

      // Test Custom Properties (CSS Variables)
      results.customProperties = testCSSSupport('--test-var', '1') &&
                                CSS.supports && CSS.supports('color', 'var(--test-var)');

      // Test CSS Animations
      results.animations = testCSSSupport('animation-name', 'test') &&
                          testCSSSupport('animation-duration', '1s');

      // Test CSS Transforms
      results.transforms = testCSSSupport('transform', 'rotate(45deg)') &&
                          testCSSSupport('transform', 'scale(1.5)');

      // Test CSS Gradients
      results.gradients = testCSSSupport('background', 'linear-gradient(to right, red, blue)');

      // Test CSS Filters
      results.filters = testCSSSupport('filter', 'blur(5px)');

      // Test CSS Clip Path
      results.clipPath = testCSSSupport('clip-path', 'circle(50%)');

      // Test CSS Backdrop Filter
      results.backdropFilter = testCSSSupport('backdrop-filter', 'blur(10px)');

      return results;
    });

    console.log(`${browserName} CSS capabilities:`, cssCapabilities);

    // Verify expected CSS support
    const supportedFeatures = BROWSER_SUPPORT_MATRIX.css;
    const browserKey = browserName.toLowerCase();

    Object.entries(cssCapabilities).forEach(([feature, supported]) => {
      const expectedSupport = supportedFeatures[feature as keyof typeof supportedFeatures];
      if (expectedSupport && expectedSupport.includes(browserKey)) {
        expect(supported).toBe(true);
      }
    });
  });

  test('should detect Web API support', async ({ page }) => {
    const webApiCapabilities = await page.evaluate(() => {
      const results: Record<string, boolean> = {};

      // Fetch API
      results.fetch = typeof fetch !== 'undefined';

      // WebSocket
      results.websocket = typeof WebSocket !== 'undefined';

      // Web Workers
      results.webworkers = typeof Worker !== 'undefined';

      // Service Workers
      results.serviceworkers = 'serviceWorker' in navigator;

      // IndexedDB
      results.indexeddb = 'indexedDB' in window;

      // Local Storage
      results.localstorage = typeof localStorage !== 'undefined';

      // Session Storage
      results.sessionstorage = typeof sessionStorage !== 'undefined';

      // Geolocation
      results.geolocation = 'geolocation' in navigator;

      // Notifications
      results.notifications = 'Notification' in window;

      // Clipboard API
      results.clipboard = 'clipboard' in navigator;

      // Drag and Drop
      results.dragdrop = 'draggable' in document.createElement('div');

      // File API
      results.fileapi = typeof FileReader !== 'undefined';

      // History API
      results.history = 'pushState' in history;

      // WebRTC
      results.webrtc = 'RTCPeerConnection' in window ||
                      'webkitRTCPeerConnection' in window ||
                      'mozRTCPeerConnection' in window;

      // Media Capture
      results.mediacapture = 'mediaDevices' in navigator &&
                            'getUserMedia' in navigator.mediaDevices;

      // Intersection Observer
      results.intersectionobserver = 'IntersectionObserver' in window;

      // Resize Observer
      results.resizeobserver = 'ResizeObserver' in window;

      // Mutation Observer
      results.mutationobserver = 'MutationObserver' in window;

      return results;
    });

    console.log(`${browserName} Web API capabilities:`, webApiCapabilities);

    // Verify expected Web API support
    const supportedFeatures = BROWSER_SUPPORT_MATRIX.webapis;
    const browserKey = browserName.toLowerCase();

    Object.entries(webApiCapabilities).forEach(([feature, supported]) => {
      const expectedSupport = supportedFeatures[feature as keyof typeof supportedFeatures];
      if (expectedSupport && expectedSupport.includes(browserKey)) {
        expect(supported).toBe(true);
      }
    });
  });

  test('should detect HTML5 feature support', async ({ page }) => {
    const html5Capabilities = await page.evaluate(() => {
      const results: Record<string, boolean> = {};

      // Canvas
      results.canvas = (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext && canvas.getContext('2d'));
        } catch {
          return false;
        }
      })();

      // WebGL
      results.webgl = (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch {
          return false;
        }
      })();

      // Video
      results.video = (() => {
        const video = document.createElement('video');
        return !!(video.canPlayType);
      })();

      // Audio
      results.audio = (() => {
        const audio = document.createElement('audio');
        return !!(audio.canPlayType);
      })();

      // SVG
      results.svg = document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1');

      // Form Validation
      results.formvalidation = (() => {
        const input = document.createElement('input');
        return 'validity' in input && 'checkValidity' in input;
      })();

      // Input Types
      const inputTypes = ['email', 'url', 'tel', 'search', 'number', 'range', 'date', 'color'];
      results.inputtypes = inputTypes.every(type => {
        const input = document.createElement('input');
        input.setAttribute('type', type);
        return input.type === type;
      });

      // Contenteditable
      results.contenteditable = 'contentEditable' in document.createElement('div');

      // Draggable
      results.draggable = 'draggable' in document.createElement('div');

      // Dataset
      results.dataset = 'dataset' in document.createElement('div');

      return results;
    });

    console.log(`${browserName} HTML5 capabilities:`, html5Capabilities);

    // Verify expected HTML5 support
    const supportedFeatures = BROWSER_SUPPORT_MATRIX.html5;
    const browserKey = browserName.toLowerCase();

    Object.entries(html5Capabilities).forEach(([feature, supported]) => {
      const expectedSupport = supportedFeatures[feature as keyof typeof supportedFeatures];
      if (expectedSupport && expectedSupport.includes(browserKey)) {
        expect(supported).toBe(true);
      }
    });
  });

  test('should generate browser capability report', async ({ page }) => {
    const browserInfo = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        doNotTrack: navigator.doNotTrack,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth
        },
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt
        } : null
      };
    });

    // Log comprehensive browser information
    console.log(`\n=== ${browserName} v${browserVersion} Browser Report ===`);
    console.log('User Agent:', browserInfo.userAgent);
    console.log('Platform:', browserInfo.platform);
    console.log('Language:', browserInfo.language);
    console.log('Viewport:', `${browserInfo.viewport.width}x${browserInfo.viewport.height}`);
    console.log('Screen:', `${browserInfo.screen.width}x${browserInfo.screen.height}`);
    console.log('Hardware Concurrency:', browserInfo.hardwareConcurrency);
    if (browserInfo.deviceMemory) {
      console.log('Device Memory:', browserInfo.deviceMemory + 'GB');
    }
    if (browserInfo.connection) {
      console.log('Connection:', browserInfo.connection);
    }

    // Verify basic browser requirements
    expect(browserInfo.userAgent).toBeTruthy();
    expect(browserInfo.viewport.width).toBeGreaterThan(0);
    expect(browserInfo.viewport.height).toBeGreaterThan(0);
  });

  test('should test browser-specific quirks and workarounds', async ({ page }) => {
    const quirks = await page.evaluate(() => {
      const results: Record<string, any> = {};

      // Safari-specific quirks
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      if (isSafari) {
        // Safari date input quirk
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        results.safariDateInput = dateInput.type === 'date';
        
        // Safari 100vh quirk
        results.safari100vh = window.innerHeight !== document.documentElement.clientHeight;
      }

      // Firefox-specific quirks
      const isFirefox = /Firefox/.test(navigator.userAgent);
      if (isFirefox) {
        // Firefox scrollbar width
        const div = document.createElement('div');
        div.style.cssText = 'width:100px;height:100px;overflow:scroll;position:absolute;top:-9999px;';
        document.body.appendChild(div);
        results.firefoxScrollbarWidth = div.offsetWidth - div.clientWidth;
        document.body.removeChild(div);
      }

      // Chrome-specific quirks
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
      if (isChrome) {
        // Chrome memory info
        results.chromeMemoryInfo = (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      }

      // Edge-specific quirks
      const isEdge = /Edge/.test(navigator.userAgent);
      if (isEdge) {
        results.edgeDetected = true;
      }

      return results;
    });

    console.log(`${browserName} browser quirks:`, quirks);

    // Test browser-specific workarounds
    await page.setContent(`
      <div id="test-container" style="width: 100px; height: 100px; background: red;">
        Test Content
      </div>
    `);

    const containerVisible = await page.isVisible('#test-container');
    expect(containerVisible).toBe(true);
  });
});

test.describe('Cross-Browser Feature Compatibility', () => {
  test('should test CSS Grid compatibility across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        .grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-gap: 10px;
          width: 200px;
          height: 100px;
        }
        .grid-item {
          background: blue;
        }
      </style>
      <div class="grid-container">
        <div class="grid-item">1</div>
        <div class="grid-item">2</div>
      </div>
    `);

    const gridSupported = await page.evaluate(() => {
      const container = document.querySelector('.grid-container') as HTMLElement;
      return window.getComputedStyle(container).display === 'grid';
    });

    expect(gridSupported).toBe(true);
  });

  test('should test Flexbox compatibility across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        .flex-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 200px;
          height: 100px;
        }
        .flex-item {
          background: green;
          width: 50px;
          height: 50px;
        }
      </style>
      <div class="flex-container">
        <div class="flex-item">1</div>
        <div class="flex-item">2</div>
      </div>
    `);

    const flexSupported = await page.evaluate(() => {
      const container = document.querySelector('.flex-container') as HTMLElement;
      return window.getComputedStyle(container).display === 'flex';
    });

    expect(flexSupported).toBe(true);
  });

  test('should test Web Components support', async ({ page }) => {
    const webComponentsSupport = await page.evaluate(() => {
      return {
        customElements: 'customElements' in window,
        shadowDOM: 'attachShadow' in Element.prototype,
        htmlTemplates: 'content' in document.createElement('template')
      };
    });

    console.log('Web Components support:', webComponentsSupport);
    
    // Modern browsers should support these
    expect(webComponentsSupport.customElements).toBe(true);
    expect(webComponentsSupport.shadowDOM).toBe(true);
    expect(webComponentsSupport.htmlTemplates).toBe(true);
  });
});