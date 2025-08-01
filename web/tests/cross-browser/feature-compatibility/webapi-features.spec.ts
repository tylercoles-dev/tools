/**
 * Web API Feature Compatibility Tests
 * 
 * Tests modern Web APIs across different browsers to ensure
 * consistent functionality and identify compatibility issues.
 */

import { test, expect } from '@playwright/test';

test.describe('Storage API Compatibility', () => {
  test('should support localStorage across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        if (typeof localStorage === 'undefined') {
          return { supported: false, error: 'localStorage not available' };
        }

        // Test basic operations
        localStorage.setItem('test-key', 'test-value');
        const retrievedValue = localStorage.getItem('test-key');
        
        // Test JSON storage
        const testObject = { name: 'test', value: 42 };
        localStorage.setItem('test-object', JSON.stringify(testObject));
        const retrievedObject = JSON.parse(localStorage.getItem('test-object') || '{}');
        
        // Test removal
        localStorage.removeItem('test-key');
        const removedValue = localStorage.getItem('test-key');
        
        // Test clear
        localStorage.setItem('temp-key', 'temp-value');
        const lengthBefore = localStorage.length;
        localStorage.clear();
        const lengthAfter = localStorage.length;
        
        return {
          supported: true,
          basicStorage: retrievedValue === 'test-value',
          jsonStorage: retrievedObject.name === 'test' && retrievedObject.value === 42,
          removal: removedValue === null,
          clear: lengthBefore > lengthAfter && lengthAfter === 0,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.basicStorage).toBe(true);
    expect(result.jsonStorage).toBe(true);
    expect(result.removal).toBe(true);
    expect(result.clear).toBe(true);
  });

  test('should support sessionStorage across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        if (typeof sessionStorage === 'undefined') {
          return { supported: false, error: 'sessionStorage not available' };
        }

        // Test basic operations
        sessionStorage.setItem('session-key', 'session-value');
        const retrievedValue = sessionStorage.getItem('session-key');
        
        // Test storage info
        const length = sessionStorage.length;
        const key = sessionStorage.key(0);
        
        sessionStorage.clear();
        
        return {
          supported: true,
          basicStorage: retrievedValue === 'session-value',
          length: length >= 1,
          keyAccess: key === 'session-key',
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.basicStorage).toBe(true);
    expect(result.length).toBe(true);
    expect(result.keyAccess).toBe(true);
  });

  test('should support IndexedDB across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          if (!('indexedDB' in window)) {
            resolve({ supported: false, error: 'IndexedDB not available' });
            return;
          }

          const dbName = 'TestDB';
          const dbVersion = 1;
          const request = indexedDB.open(dbName, dbVersion);
          
          request.onerror = () => {
            resolve({ supported: false, error: 'IndexedDB open failed' });
          };
          
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Test basic operations
            const transaction = db.transaction(['testStore'], 'readwrite');
            const store = transaction.objectStore('testStore');
            
            const addRequest = store.add({ id: 1, name: 'test' });
            addRequest.onsuccess = () => {
              const getRequest = store.get(1);
              getRequest.onsuccess = () => {
                const data = getRequest.result;
                db.close();
                
                // Clean up
                indexedDB.deleteDatabase(dbName);
                
                resolve({
                  supported: true,
                  dataStored: data && data.name === 'test',
                  error: null
                });
              };
            };
          };
          
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('testStore')) {
              db.createObjectStore('testStore', { keyPath: 'id' });
            }
          };
          
          // Timeout after 3 seconds
          setTimeout(() => {
            resolve({ supported: false, error: 'IndexedDB timeout' });
          }, 3000);
          
        } catch (error) {
          resolve({ supported: false, error: error.message });
        }
      });
    });

    expect(result.supported).toBe(true);
    expect(result.dataStored).toBe(true);
  });
});

test.describe('Network API Compatibility', () => {
  test('should support Fetch API across browsers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        if (typeof fetch === 'undefined') {
          return { supported: false, error: 'Fetch API not available' };
        }

        // Test basic fetch
        const response = await fetch('data:text/plain;base64,SGVsbG8gV29ybGQ=');
        const text = await response.text();
        
        // Test fetch with options
        const postResponse = await fetch('data:application/json;base64,eyJ0ZXN0IjoidmFsdWUifQ==', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const json = await postResponse.json();
        
        return {
          supported: true,
          basicFetch: text === 'Hello World',
          jsonFetch: json.test === 'value',
          responseObject: {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers instanceof Headers
          },
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.basicFetch).toBe(true);
    expect(result.jsonFetch).toBe(true);
    expect(result.responseObject.ok).toBe(true);
    expect(result.responseObject.status).toBe(200);
    expect(result.responseObject.headers).toBe(true);
  });

  test('should support WebSocket across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          if (typeof WebSocket === 'undefined') {
            resolve({ supported: false, error: 'WebSocket not available' });
            return;
          }

          // Test WebSocket connection to a test echo server
          const ws = new WebSocket('wss://echo.websocket.org/');
          let messageReceived = false;
          
          ws.onopen = () => {
            ws.send('test message');
          };
          
          ws.onmessage = (event) => {
            messageReceived = event.data === 'test message';
            ws.close();
          };
          
          ws.onclose = () => {
            resolve({
              supported: true,
              connectionEstablished: true,
              messageEcho: messageReceived,
              error: null
            });
          };
          
          ws.onerror = () => {
            resolve({
              supported: true, // WebSocket exists but connection failed
              connectionEstablished: false,
              error: 'WebSocket connection failed'
            });
          };
          
          // Timeout after 5 seconds
          setTimeout(() => {
            if (ws.readyState !== WebSocket.CLOSED) {
              ws.close();
            }
            resolve({
              supported: true,
              connectionEstablished: false,
              error: 'WebSocket connection timeout'
            });
          }, 5000);
          
        } catch (error) {
          resolve({
            supported: false,
            error: error.message
          });
        }
      });
    });

    expect(result.supported).toBe(true);
    // Connection might fail due to network restrictions, but WebSocket API should exist
  });

  test('should support EventSource (Server-Sent Events) across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        if (typeof EventSource === 'undefined') {
          return { supported: false, error: 'EventSource not available' };
        }

        // Test EventSource construction (don't actually connect)
        const eventSourceSupported = typeof EventSource === 'function';
        
        // Test EventSource constants
        const constants = {
          CONNECTING: EventSource.CONNECTING === 0,
          OPEN: EventSource.OPEN === 1,
          CLOSED: EventSource.CLOSED === 2
        };
        
        return {
          supported: eventSourceSupported,
          constants,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.constants.CONNECTING).toBe(true);
    expect(result.constants.OPEN).toBe(true);
    expect(result.constants.CLOSED).toBe(true);
  });
});

test.describe('Media API Compatibility', () => {
  test('should support getUserMedia across browsers', async ({ page }) => {
    // Grant camera permissions for testing
    await page.context().grantPermissions(['camera', 'microphone']);
    
    const result = await page.evaluate(async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return { 
            supported: false, 
            error: 'getUserMedia not available',
            fallbackSupported: !!(navigator.getUserMedia || 
                                navigator.webkitGetUserMedia || 
                                navigator.mozGetUserMedia)
          };
        }

        // Test media devices enumeration
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Test constraints support
        const constraints = {
          video: { width: 640, height: 480 },
          audio: true
        };
        
        // Note: We won't actually request media to avoid permission dialogs
        // Just test the API availability and constraint validation
        const supportsConstraints = await navigator.mediaDevices.getSupportedConstraints();
        
        return {
          supported: true,
          devicesEnumerated: devices.length >= 0,
          supportedConstraints: Object.keys(supportsConstraints).length > 0,
          constraintsIncludeVideo: 'width' in supportsConstraints && 'height' in supportsConstraints,
          constraintsIncludeAudio: 'sampleRate' in supportsConstraints || 'channelCount' in supportsConstraints,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.devicesEnumerated).toBe(true);
    expect(result.supportedConstraints).toBe(true);
  });

  test('should support Web Audio API across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
          return { supported: false, error: 'Web Audio API not available' };
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        
        // Test basic audio context features
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Test audio nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Test audio context properties
        const result = {
          supported: true,
          sampleRate: audioContext.sampleRate,
          state: audioContext.state,
          currentTime: audioContext.currentTime >= 0,
          destination: !!audioContext.destination,
          oscillatorType: oscillator.type,
          gainValue: gainNode.gain.value,
          error: null
        };
        
        // Clean up
        audioContext.close();
        
        return result;
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.sampleRate).toBeGreaterThan(0);
    expect(result.currentTime).toBe(true);
    expect(result.destination).toBe(true);
  });
});

test.describe('Device API Compatibility', () => {
  test('should support Geolocation API across browsers', async ({ page }) => {
    // Grant geolocation permissions for testing
    await page.context().grantPermissions(['geolocation']);
    
    const result = await page.evaluate(() => {
      try {
        if (!('geolocation' in navigator)) {
          return { supported: false, error: 'Geolocation API not available' };
        }

        // Test API availability (don't actually request location)
        const hasGetCurrentPosition = typeof navigator.geolocation.getCurrentPosition === 'function';
        const hasWatchPosition = typeof navigator.geolocation.watchPosition === 'function';
        const hasClearWatch = typeof navigator.geolocation.clearWatch === 'function';
        
        return {
          supported: true,
          getCurrentPosition: hasGetCurrentPosition,
          watchPosition: hasWatchPosition,
          clearWatch: hasClearWatch,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.getCurrentPosition).toBe(true);
    expect(result.watchPosition).toBe(true);
    expect(result.clearWatch).toBe(true);
  });

  test('should support Device Orientation API if available', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const hasDeviceOrientationEvent = 'DeviceOrientationEvent' in window;
        const hasDeviceMotionEvent = 'DeviceMotionEvent' in window;
        
        // Test if we can add event listeners
        let orientationSupported = false;
        let motionSupported = false;
        
        if (hasDeviceOrientationEvent) {
          try {
            window.addEventListener('deviceorientation', function() {}, { once: true });
            orientationSupported = true;
          } catch (e) {
            // Event listener not supported
          }
        }
        
        if (hasDeviceMotionEvent) {
          try {
            window.addEventListener('devicemotion', function() {}, { once: true });
            motionSupported = true;
          } catch (e) {
            // Event listener not supported
          }
        }
        
        return {
          deviceOrientationEvent: hasDeviceOrientationEvent,
          deviceMotionEvent: hasDeviceMotionEvent,
          orientationListenerSupported: orientationSupported,
          motionListenerSupported: motionSupported,
          supported: hasDeviceOrientationEvent || hasDeviceMotionEvent
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    // Device orientation might not be available on desktop browsers
    if (result.supported) {
      console.log('Device Orientation API supported');
      expect(result.deviceOrientationEvent || result.deviceMotionEvent).toBe(true);
    } else {
      console.log('Device Orientation API not supported (normal for desktop browsers)');
    }
  });

  test('should support Vibration API if available', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const hasVibrate = 'vibrate' in navigator;
        
        if (!hasVibrate) {
          return { 
            supported: false, 
            reason: 'Vibration API not available (normal for desktop browsers)' 
          };
        }
        
        // Test vibration API (won't actually vibrate in most test environments)
        const vibrateResult = navigator.vibrate(0); // 0ms vibration (safe test)
        
        return {
          supported: true,
          vibrateFunction: typeof navigator.vibrate === 'function',
          vibrateResult: typeof vibrateResult === 'boolean'
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    if (result.supported) {
      expect(result.vibrateFunction).toBe(true);
      console.log('Vibration API supported');
    } else {
      console.log('Vibration API not supported:', result.reason || result.error);
    }
  });
});

test.describe('Communication API Compatibility', () => {
  test('should support Notifications API across browsers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        if (!('Notification' in window)) {
          return { supported: false, error: 'Notifications API not available' };
        }

        // Test Notification properties and methods
        const hasPermission = 'permission' in Notification;
        const hasRequestPermission = typeof Notification.requestPermission === 'function';
        
        // Test notification constructor (don't actually show notification)
        const notificationSupported = typeof Notification === 'function';
        
        // Test permission states
        const currentPermission = Notification.permission;
        const validPermissions = ['granted', 'denied', 'default'].includes(currentPermission);
        
        return {
          supported: notificationSupported,
          hasPermission,
          hasRequestPermission,
          currentPermission,
          validPermissions,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.hasPermission).toBe(true);
    expect(result.hasRequestPermission).toBe(true);
    expect(result.validPermissions).toBe(true);
  });

  test('should support Clipboard API across browsers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        if (!navigator.clipboard) {
          return { 
            supported: false, 
            error: 'Clipboard API not available',
            fallbackSupported: document.queryCommandSupported && document.queryCommandSupported('copy')
          };
        }

        // Test Clipboard API methods
        const hasReadText = typeof navigator.clipboard.readText === 'function';
        const hasWriteText = typeof navigator.clipboard.writeText === 'function';
        const hasRead = typeof navigator.clipboard.read === 'function';
        const hasWrite = typeof navigator.clipboard.write === 'function';
        
        return {
          supported: true,
          hasReadText,
          hasWriteText,
          hasRead,
          hasWrite,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.hasReadText).toBe(true);
    expect(result.hasWriteText).toBe(true);
    expect(result.hasRead).toBe(true);
    expect(result.hasWrite).toBe(true);
  });

  test('should support Broadcast Channel API if available', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        if (!('BroadcastChannel' in window)) {
          return { supported: false, error: 'BroadcastChannel API not available' };
        }

        // Test BroadcastChannel creation
        const channel = new BroadcastChannel('test-channel');
        
        // Test channel properties and methods
        const hasName = typeof channel.name === 'string';
        const hasPostMessage = typeof channel.postMessage === 'function';
        const hasClose = typeof channel.close === 'function';
        const hasOnMessage = 'onmessage' in channel;
        const hasOnMessageError = 'onmessageerror' in channel;
        
        // Clean up
        channel.close();
        
        return {
          supported: true,
          hasName,
          hasPostMessage,
          hasClose,
          hasOnMessage,
          hasOnMessageError,
          channelName: channel.name === 'test-channel',
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    if (result.supported) {
      expect(result.hasName).toBe(true);
      expect(result.hasPostMessage).toBe(true);
      expect(result.hasClose).toBe(true);
      expect(result.hasOnMessage).toBe(true);
      expect(result.channelName).toBe(true);
      console.log('BroadcastChannel API supported');
    } else {
      console.log('BroadcastChannel API not supported:', result.error);
    }
  });
});

test.describe('File API Compatibility', () => {
  test('should support File API across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        // Test File API constructors
        const hasFile = typeof File === 'function';
        const hasBlob = typeof Blob === 'function';
        const hasFileReader = typeof FileReader === 'function';
        const hasURL = typeof URL === 'function' && typeof URL.createObjectURL === 'function';
        
        // Test Blob creation
        const blob = new Blob(['Hello, World!'], { type: 'text/plain' });
        const blobSize = blob.size;
        const blobType = blob.type;
        
        // Test File creation
        const file = new File(['File content'], 'test.txt', { 
          type: 'text/plain',
          lastModified: Date.now()
        });
        const fileName = file.name;
        const fileSize = file.size;
        const fileType = file.type;
        
        // Test FileReader
        const reader = new FileReader();
        const hasReadAsText = typeof reader.readAsText === 'function';
        const hasReadAsDataURL = typeof reader.readAsDataURL === 'function';
        const hasReadAsArrayBuffer = typeof reader.readAsArrayBuffer === 'function';
        
        // Test URL methods
        const objectURL = URL.createObjectURL(blob);
        const isValidURL = objectURL.startsWith('blob:');
        URL.revokeObjectURL(objectURL);
        
        return {
          supported: true,
          hasFile,
          hasBlob,
          hasFileReader,
          hasURL,
          blob: {
            size: blobSize === 13, // 'Hello, World!' length
            type: blobType === 'text/plain'
          },
          file: {
            name: fileName === 'test.txt',
            size: fileSize === 12, // 'File content' length
            type: fileType === 'text/plain'
          },
          fileReader: {
            hasReadAsText,
            hasReadAsDataURL,
            hasReadAsArrayBuffer
          },
          url: {
            createObjectURL: isValidURL
          },
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.hasFile).toBe(true);
    expect(result.hasBlob).toBe(true);
    expect(result.hasFileReader).toBe(true);
    expect(result.hasURL).toBe(true);
    
    expect(result.blob.size).toBe(true);
    expect(result.blob.type).toBe(true);
    
    expect(result.file.name).toBe(true);
    expect(result.file.size).toBe(true);
    expect(result.file.type).toBe(true);
    
    expect(result.fileReader.hasReadAsText).toBe(true);
    expect(result.fileReader.hasReadAsDataURL).toBe(true);
    expect(result.fileReader.hasReadAsArrayBuffer).toBe(true);
    
    expect(result.url.createObjectURL).toBe(true);
  });

  test('should support Drag and Drop API across browsers', async ({ page }) => {
    await page.setContent(`
      <div id="drag-source" draggable="true" style="width: 100px; height: 50px; background: blue; color: white; text-align: center; line-height: 50px;">
        Drag Me
      </div>
      <div id="drop-target" style="width: 200px; height: 100px; background: lightgray; margin-top: 20px; text-align: center; line-height: 100px;">
        Drop Zone
      </div>
    `);

    const result = await page.evaluate(() => {
      try {
        const dragSource = document.getElementById('drag-source');
        const dropTarget = document.getElementById('drop-target');
        
        // Test drag and drop API availability
        const hasDragEvents = 'ondragstart' in dragSource! && 'ondrop' in dropTarget!;
        const hasDataTransfer = 'DataTransfer' in window;
        const hasDragEvent = 'DragEvent' in window;
        
        // Test draggable attribute
        const isDraggable = dragSource!.draggable === true;
        
        // Test DataTransfer if available
        let dataTransferMethods = false;
        if (hasDataTransfer) {
          try {
            const dt = new DataTransfer();
            dataTransferMethods = typeof dt.setData === 'function' && 
                                 typeof dt.getData === 'function' &&
                                 typeof dt.clearData === 'function';
          } catch (e) {
            // DataTransfer constructor might not be available
            dataTransferMethods = false;
          }
        }
        
        return {
          supported: hasDragEvents && hasDataTransfer,
          hasDragEvents,
          hasDataTransfer,
          hasDragEvent,
          isDraggable,
          dataTransferMethods,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.hasDragEvents).toBe(true);
    expect(result.hasDataTransfer).toBe(true);
    expect(result.hasDragEvent).toBe(true);
    expect(result.isDraggable).toBe(true);
  });
});