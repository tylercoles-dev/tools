/**
 * JavaScript Feature Compatibility Tests
 * 
 * Tests modern JavaScript features across different browsers to ensure
 * consistent behavior and identify compatibility issues.
 */

import { test, expect } from '@playwright/test';

test.describe('JavaScript ES6+ Feature Compatibility', () => {
  test('should support arrow functions across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const arrowFunc = (x: number) => x * 2;
        return {
          supported: true,
          result: arrowFunc(5),
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.result).toBe(10);
  });

  test('should support template literals across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const name = 'World';
        const message = `Hello, ${name}!`;
        return {
          supported: true,
          result: message,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.result).toBe('Hello, World!');
  });

  test('should support destructuring assignment across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const arr = [1, 2, 3];
        const obj = { a: 4, b: 5 };
        
        const [first, second] = arr;
        const { a, b } = obj;
        
        return {
          supported: true,
          arrayDestructuring: [first, second],
          objectDestructuring: { a, b },
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.arrayDestructuring).toEqual([1, 2]);
    expect(result.objectDestructuring).toEqual({ a: 4, b: 5 });
  });

  test('should support spread operator across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const arr1 = [1, 2];
        const arr2 = [3, 4];
        const combined = [...arr1, ...arr2];
        
        const obj1 = { a: 1, b: 2 };
        const obj2 = { c: 3, d: 4 };
        const mergedObj = { ...obj1, ...obj2 };
        
        return {
          supported: true,
          arraySpread: combined,
          objectSpread: mergedObj,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.arraySpread).toEqual([1, 2, 3, 4]);
    expect(result.objectSpread).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  test('should support async/await across browsers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const asyncFunc = async (value: number) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return value * 2;
        };
        
        const result = await asyncFunc(5);
        
        return {
          supported: true,
          result,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.result).toBe(10);
  });

  test('should support Promises across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      return Promise.resolve('test')
        .then(value => value.toUpperCase())
        .then(value => ({ supported: true, result: value }))
        .catch(error => ({ supported: false, error: error.message }));
    });

    expect(result.supported).toBe(true);
    expect(result.result).toBe('TEST');
  });

  test('should support Classes across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        class TestClass {
          private value: number;
          
          constructor(value: number) {
            this.value = value;
          }
          
          getValue() {
            return this.value;
          }
          
          static create(value: number) {
            return new TestClass(value);
          }
        }
        
        const instance = TestClass.create(42);
        
        return {
          supported: true,
          result: instance.getValue(),
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.result).toBe(42);
  });

  test('should support Map and Set across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const map = new Map();
        map.set('key1', 'value1');
        map.set('key2', 'value2');
        
        const set = new Set();
        set.add(1);
        set.add(2);
        set.add(1); // Duplicate should be ignored
        
        return {
          supported: true,
          mapSize: map.size,
          mapValue: map.get('key1'),
          setSize: set.size,
          hasValue: set.has(1),
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.mapSize).toBe(2);
    expect(result.mapValue).toBe('value1');
    expect(result.setSize).toBe(2);
    expect(result.hasValue).toBe(true);
  });

  test('should support WeakMap and WeakSet across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const weakMap = new WeakMap();
        const weakSet = new WeakSet();
        
        const obj = {};
        weakMap.set(obj, 'test');
        weakSet.add(obj);
        
        return {
          supported: true,
          weakMapValue: weakMap.get(obj),
          weakSetHas: weakSet.has(obj),
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.weakMapValue).toBe('test');
    expect(result.weakSetHas).toBe(true);
  });

  test('should support Symbol across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const sym1 = Symbol('test');
        const sym2 = Symbol('test');
        const sym3 = Symbol.for('global');
        const sym4 = Symbol.for('global');
        
        return {
          supported: true,
          uniqueness: sym1 !== sym2,
          globalSymbol: sym3 === sym4,
          description: sym1.toString(),
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.uniqueness).toBe(true);
    expect(result.globalSymbol).toBe(true);
    expect(result.description).toBe('Symbol(test)');
  });

  test('should support Proxy across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const target = { value: 42 };
        const proxy = new Proxy(target, {
          get(target, prop) {
            return prop in target ? target[prop as keyof typeof target] : 'default';
          },
          set(target, prop, value) {
            target[prop as keyof typeof target] = value;
            return true;
          }
        });
        
        proxy.newProp = 'test';
        
        return {
          supported: true,
          originalValue: proxy.value,
          defaultValue: proxy.nonExistent,
          newProp: proxy.newProp,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.originalValue).toBe(42);
    expect(result.defaultValue).toBe('default');
    expect(result.newProp).toBe('test');
  });

  test('should support Optional Chaining across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const obj = {
          nested: {
            value: 'found'
          }
        };
        
        // Test optional chaining
        const existingValue = obj?.nested?.value;
        const nonExistentValue = obj?.missing?.value;
        
        return {
          supported: true,
          existingValue,
          nonExistentValue,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.existingValue).toBe('found');
    expect(result.nonExistentValue).toBeUndefined();
  });

  test('should support Nullish Coalescing across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const value1 = null ?? 'default';
        const value2 = undefined ?? 'default';
        const value3 = 0 ?? 'default'; // Should be 0, not 'default'
        const value4 = '' ?? 'default'; // Should be '', not 'default'
        const value5 = false ?? 'default'; // Should be false, not 'default'
        
        return {
          supported: true,
          nullValue: value1,
          undefinedValue: value2,
          zeroValue: value3,
          emptyString: value4,
          falseValue: value5,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.nullValue).toBe('default');
    expect(result.undefinedValue).toBe('default');
    expect(result.zeroValue).toBe(0);
    expect(result.emptyString).toBe('');
    expect(result.falseValue).toBe(false);
  });

  test('should support BigInt across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const bigInt1 = BigInt(9007199254740991);
        const bigInt2 = 9007199254740991n;
        const bigInt3 = BigInt('9007199254740991');
        
        return {
          supported: true,
          bigInt1: bigInt1.toString(),
          bigInt2: bigInt2.toString(),
          bigInt3: bigInt3.toString(),
          equality: bigInt1 === bigInt2,
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    // BigInt might not be supported in all browsers
    if (result.supported) {
      expect(result.bigInt1).toBe('9007199254740991');
      expect(result.bigInt2).toBe('9007199254740991');
      expect(result.bigInt3).toBe('9007199254740991');
      expect(result.equality).toBe(true);
    }
  });
});

test.describe('JavaScript Performance Features', () => {
  test('should support Web Workers across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          if (typeof Worker === 'undefined') {
            resolve({ supported: false, error: 'Worker not available' });
            return;
          }

          // Create a simple worker inline
          const workerCode = `
            self.onmessage = function(e) {
              const result = e.data * 2;
              self.postMessage(result);
            };
          `;
          
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));
          
          worker.onmessage = function(e) {
            worker.terminate();
            resolve({
              supported: true,
              result: e.data,
              error: null
            });
          };
          
          worker.onerror = function(error) {
            worker.terminate();
            resolve({
              supported: false,
              result: null,
              error: error.message
            });
          };
          
          worker.postMessage(5);
          
          // Timeout after 1 second
          setTimeout(() => {
            worker.terminate();
            resolve({
              supported: false,
              result: null,
              error: 'Worker timeout'
            });
          }, 1000);
          
        } catch (error) {
          resolve({
            supported: false,
            result: null,
            error: error.message
          });
        }
      });
    });

    expect(result.supported).toBe(true);
    expect(result.result).toBe(10);
  });

  test('should support ArrayBuffer and TypedArrays across browsers', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const buffer = new ArrayBuffer(16);
        const int32View = new Int32Array(buffer);
        const uint8View = new Uint8Array(buffer);
        
        int32View[0] = 42;
        
        return {
          supported: true,
          bufferLength: buffer.byteLength,
          int32Value: int32View[0],
          uint8Value: uint8View[0],
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    expect(result.supported).toBe(true);
    expect(result.bufferLength).toBe(16);
    expect(result.int32Value).toBe(42);
    expect(result.uint8Value).toBe(42);
  });

  test('should support SharedArrayBuffer if available', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        if (typeof SharedArrayBuffer === 'undefined') {
          return {
            supported: false,
            reason: 'SharedArrayBuffer not available (requires HTTPS and specific headers)',
            error: null
          };
        }

        const sharedBuffer = new SharedArrayBuffer(16);
        const sharedInt32 = new Int32Array(sharedBuffer);
        sharedInt32[0] = 100;
        
        return {
          supported: true,
          bufferLength: sharedBuffer.byteLength,
          value: sharedInt32[0],
          error: null
        };
      } catch (error) {
        return {
          supported: false,
          result: null,
          error: error.message
        };
      }
    });

    // SharedArrayBuffer might not be available due to security requirements
    if (result.supported) {
      expect(result.bufferLength).toBe(16);
      expect(result.value).toBe(100);
    } else {
      console.log('SharedArrayBuffer not supported:', result.reason || result.error);
    }
  });
});

test.describe('Modern JavaScript API Compatibility', () => {
  test('should support Intersection Observer across browsers', async ({ page }) => {
    await page.setContent(`
      <div style="height: 200vh;">
        <div id="target" style="margin-top: 150vh; height: 100px; background: red;">
          Target Element
        </div>
      </div>
    `);

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          if (!('IntersectionObserver' in window)) {
            resolve({ supported: false, error: 'IntersectionObserver not available' });
            return;
          }

          const target = document.getElementById('target');
          let observed = false;
          
          const observer = new IntersectionObserver((entries) => {
            observed = true;
            observer.disconnect();
            resolve({
              supported: true,
              entriesCount: entries.length,
              isIntersecting: entries[0].isIntersecting,
              error: null
            });
          });
          
          observer.observe(target!);
          
          // Scroll to trigger intersection
          target!.scrollIntoView();
          
          // Timeout after 1 second
          setTimeout(() => {
            observer.disconnect();
            if (!observed) {
              resolve({
                supported: false,
                error: 'IntersectionObserver timeout'
              });
            }
          }, 1000);
          
        } catch (error) {
          resolve({
            supported: false,
            error: error.message
          });
        }
      });
    });

    expect(result.supported).toBe(true);
    expect(result.entriesCount).toBe(1);
  });

  test('should support Resize Observer across browsers', async ({ page }) => {
    await page.setContent(`
      <div id="resizable" style="width: 100px; height: 100px; background: blue; resize: both; overflow: auto;">
        Resizable Element
      </div>
    `);

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          if (!('ResizeObserver' in window)) {
            resolve({ supported: false, error: 'ResizeObserver not available' });
            return;
          }

          const target = document.getElementById('resizable') as HTMLElement;
          let observed = false;
          
          const observer = new ResizeObserver((entries) => {
            observed = true;
            observer.disconnect();
            resolve({
              supported: true,
              entriesCount: entries.length,
              width: entries[0].contentRect.width,
              height: entries[0].contentRect.height,
              error: null
            });
          });
          
          observer.observe(target);
          
          // Trigger resize
          setTimeout(() => {
            target.style.width = '200px';
            target.style.height = '200px';
          }, 100);
          
          // Timeout after 1 second
          setTimeout(() => {
            observer.disconnect();
            if (!observed) {
              resolve({
                supported: false,
                error: 'ResizeObserver timeout'
              });
            }
          }, 1000);
          
        } catch (error) {
          resolve({
            supported: false,
            error: error.message
          });
        }
      });
    });

    expect(result.supported).toBe(true);
    expect(result.entriesCount).toBe(1);
  });

  test('should support Mutation Observer across browsers', async ({ page }) => {
    await page.setContent(`
      <div id="container">
        <p>Original content</p>
      </div>
    `);

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          if (!('MutationObserver' in window)) {
            resolve({ supported: false, error: 'MutationObserver not available' });
            return;
          }

          const container = document.getElementById('container');
          let observed = false;
          
          const observer = new MutationObserver((mutations) => {
            observed = true;
            observer.disconnect();
            resolve({
              supported: true,
              mutationsCount: mutations.length,
              mutationType: mutations[0].type,
              addedNodes: mutations[0].addedNodes.length,
              error: null
            });
          });
          
          observer.observe(container!, {
            childList: true,
            subtree: true
          });
          
          // Trigger mutation
          setTimeout(() => {
            const newElement = document.createElement('div');
            newElement.textContent = 'New content';
            container!.appendChild(newElement);
          }, 100);
          
          // Timeout after 1 second
          setTimeout(() => {
            observer.disconnect();
            if (!observed) {
              resolve({
                supported: false,
                error: 'MutationObserver timeout'
              });
            }
          }, 1000);
          
        } catch (error) {
          resolve({
            supported: false,
            error: error.message
          });
        }
      });
    });

    expect(result.supported).toBe(true);
    expect(result.mutationsCount).toBe(1);
    expect(result.mutationType).toBe('childList');
    expect(result.addedNodes).toBe(1);
  });
});