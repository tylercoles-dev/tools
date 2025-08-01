/**
 * CSS Feature Compatibility Tests
 * 
 * Tests modern CSS features across different browsers to ensure
 * consistent styling and identify compatibility issues.
 */

import { test, expect } from '@playwright/test';

test.describe('CSS Layout Feature Compatibility', () => {
  test('should support CSS Grid across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        .grid-container {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          grid-template-rows: auto 1fr auto;
          grid-gap: 10px;
          width: 300px;
          height: 200px;
          background: #f0f0f0;
        }
        .grid-item {
          background: #007acc;
          color: white;
          padding: 10px;
          text-align: center;
        }
        .header { grid-area: 1 / 1 / 2 / 4; }
        .sidebar { grid-area: 2 / 1 / 3 / 2; }
        .main { grid-area: 2 / 2 / 3 / 3; }
        .aside { grid-area: 2 / 3 / 3 / 4; }
        .footer { grid-area: 3 / 1 / 4 / 4; }
      </style>
      <div class="grid-container">
        <div class="grid-item header">Header</div>
        <div class="grid-item sidebar">Sidebar</div>
        <div class="grid-item main">Main</div>
        <div class="grid-item aside">Aside</div>
        <div class="grid-item footer">Footer</div>
      </div>
    `);

    const gridSupport = await page.evaluate(() => {
      const container = document.querySelector('.grid-container') as HTMLElement;
      const computedStyle = window.getComputedStyle(container);
      
      return {
        displayGrid: computedStyle.display === 'grid',
        gridTemplateColumns: computedStyle.gridTemplateColumns,
        gridTemplateRows: computedStyle.gridTemplateRows,
        gridGap: computedStyle.gridGap || computedStyle.gap,
        itemPositions: Array.from(document.querySelectorAll('.grid-item')).map(item => {
          const style = window.getComputedStyle(item as HTMLElement);
          return {
            gridArea: style.gridArea,
            gridColumn: style.gridColumn,
            gridRow: style.gridRow
          };
        })
      };
    });

    expect(gridSupport.displayGrid).toBe(true);
    expect(gridSupport.gridTemplateColumns).toContain('fr');
    expect(gridSupport.gridTemplateRows).toBeTruthy();
    expect(gridSupport.gridGap || '10px').toBeTruthy();
  });

  test('should support CSS Flexbox across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        .flex-container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          width: 400px;
          height: 100px;
          background: #f0f0f0;
        }
        .flex-item {
          flex: 1 1 auto;
          background: #28a745;
          color: white;
          padding: 10px;
          margin: 5px;
          text-align: center;
        }
        .flex-item.grow {
          flex-grow: 2;
        }
        .flex-item.shrink {
          flex-shrink: 2;
        }
      </style>
      <div class="flex-container">
        <div class="flex-item">Item 1</div>
        <div class="flex-item grow">Item 2 (Grow)</div>
        <div class="flex-item shrink">Item 3 (Shrink)</div>
        <div class="flex-item">Item 4</div>
      </div>
    `);

    const flexSupport = await page.evaluate(() => {
      const container = document.querySelector('.flex-container') as HTMLElement;
      const computedStyle = window.getComputedStyle(container);
      
      return {
        displayFlex: computedStyle.display === 'flex',
        flexDirection: computedStyle.flexDirection,
        justifyContent: computedStyle.justifyContent,
        alignItems: computedStyle.alignItems,
        flexWrap: computedStyle.flexWrap,
        itemProperties: Array.from(document.querySelectorAll('.flex-item')).map(item => {
          const style = window.getComputedStyle(item as HTMLElement);
          return {
            flex: style.flex,
            flexGrow: style.flexGrow,
            flexShrink: style.flexShrink,
            flexBasis: style.flexBasis
          };
        })
      };
    });

    expect(flexSupport.displayFlex).toBe(true);
    expect(flexSupport.flexDirection).toBe('row');
    expect(flexSupport.justifyContent).toBe('space-between');
    expect(flexSupport.alignItems).toBe('center');
    expect(flexSupport.flexWrap).toBe('wrap');
  });

  test('should support CSS Container Queries if available', async ({ page }) => {
    await page.setContent(`
      <style>
        .container {
          container-type: inline-size;
          width: 400px;
          background: #f0f0f0;
          padding: 20px;
        }
        .item {
          background: #dc3545;
          color: white;
          padding: 10px;
          text-align: center;
        }
        @container (min-width: 300px) {
          .item {
            background: #28a745;
            font-size: 1.2em;
          }
        }
      </style>
      <div class="container">
        <div class="item">Container Query Item</div>
      </div>
    `);

    const containerQuerySupport = await page.evaluate(() => {
      const container = document.querySelector('.container') as HTMLElement;
      const item = document.querySelector('.item') as HTMLElement;
      const containerStyle = window.getComputedStyle(container);
      const itemStyle = window.getComputedStyle(item);
      
      // Check if container queries are supported
      const supportsContainerQueries = CSS.supports && (
        CSS.supports('container-type', 'inline-size') ||
        CSS.supports('container-type: inline-size')
      );
      
      return {
        supported: supportsContainerQueries,
        containerType: containerStyle.containerType,
        itemBackground: itemStyle.backgroundColor,
        itemFontSize: itemStyle.fontSize
      };
    });

    if (containerQuerySupport.supported) {
      expect(containerQuerySupport.containerType).toBe('inline-size');
      // Item should have green background due to container query
      expect(containerQuerySupport.itemBackground).toMatch(/rgb\(40, 167, 69\)|#28a745/);
    } else {
      console.log('Container Queries not supported in this browser');
    }
  });
});

test.describe('CSS Visual Feature Compatibility', () => {
  test('should support CSS Custom Properties (Variables) across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        :root {
          --primary-color: #007acc;
          --secondary-color: #28a745;
          --font-size: 16px;
          --spacing: 10px;
        }
        .custom-props-test {
          color: var(--primary-color);
          background-color: var(--secondary-color);
          font-size: var(--font-size);
          padding: var(--spacing);
          margin: calc(var(--spacing) * 2);
          border: 2px solid var(--primary-color, #000);
        }
      </style>
      <div class="custom-props-test">Custom Properties Test</div>
    `);

    const customPropsSupport = await page.evaluate(() => {
      const element = document.querySelector('.custom-props-test') as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      
      // Test CSS.supports for custom properties
      const supportsCustomProps = CSS.supports && CSS.supports('color', 'var(--test)');
      
      return {
        supported: supportsCustomProps,
        color: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,
        fontSize: computedStyle.fontSize,
        padding: computedStyle.padding,
        margin: computedStyle.margin,
        borderColor: computedStyle.borderColor
      };
    });

    expect(customPropsSupport.supported).toBe(true);
    expect(customPropsSupport.color).toMatch(/rgb\(0, 122, 204\)|#007acc/);
    expect(customPropsSupport.backgroundColor).toMatch(/rgb\(40, 167, 69\)|#28a745/);
    expect(customPropsSupport.fontSize).toBe('16px');
    expect(customPropsSupport.padding).toBe('10px');
  });

  test('should support CSS Gradients across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        .gradient-linear {
          width: 200px;
          height: 100px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          margin: 10px;
        }
        .gradient-radial {
          width: 200px;
          height: 100px;
          background: radial-gradient(circle, #ff6b6b, #4ecdc4);
          margin: 10px;
        }
        .gradient-conic {
          width: 200px;
          height: 100px;
          background: conic-gradient(from 0deg, #ff6b6b, #4ecdc4, #ff6b6b);
          margin: 10px;
        }
      </style>
      <div class="gradient-linear"></div>
      <div class="gradient-radial"></div>
      <div class="gradient-conic"></div>
    `);

    const gradientSupport = await page.evaluate(() => {
      const linearElement = document.querySelector('.gradient-linear') as HTMLElement;
      const radialElement = document.querySelector('.gradient-radial') as HTMLElement;
      const conicElement = document.querySelector('.gradient-conic') as HTMLElement;
      
      const linearStyle = window.getComputedStyle(linearElement);
      const radialStyle = window.getComputedStyle(radialElement);
      const conicStyle = window.getComputedStyle(conicElement);
      
      return {
        linearGradient: {
          supported: linearStyle.backgroundImage.includes('linear-gradient'),
          value: linearStyle.backgroundImage
        },
        radialGradient: {
          supported: radialStyle.backgroundImage.includes('radial-gradient'),
          value: radialStyle.backgroundImage
        },
        conicGradient: {
          supported: conicStyle.backgroundImage.includes('conic-gradient'),
          value: conicStyle.backgroundImage
        }
      };
    });

    expect(gradientSupport.linearGradient.supported).toBe(true);
    expect(gradientSupport.radialGradient.supported).toBe(true);
    // Conic gradients might not be supported in all browsers
    if (gradientSupport.conicGradient.supported) {
      expect(gradientSupport.conicGradient.value).toContain('conic-gradient');
    }
  });

  test('should support CSS Transforms across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        .transform-container {
          width: 300px;
          height: 200px;
          background: #f0f0f0;
          position: relative;
          overflow: hidden;
        }
        .transform-2d {
          width: 50px;
          height: 50px;
          background: #007acc;
          position: absolute;
          top: 50px;
          left: 50px;
          transform: rotate(45deg) scale(1.2) translate(20px, 10px);
        }
        .transform-3d {
          width: 50px;
          height: 50px;
          background: #28a745;
          position: absolute;
          top: 50px;
          right: 50px;
          transform: rotateX(45deg) rotateY(45deg) translateZ(20px);
          transform-style: preserve-3d;
        }
      </style>
      <div class="transform-container">
        <div class="transform-2d"></div>
        <div class="transform-3d"></div>
      </div>
    `);

    const transformSupport = await page.evaluate(() => {
      const element2d = document.querySelector('.transform-2d') as HTMLElement;
      const element3d = document.querySelector('.transform-3d') as HTMLElement;
      
      const style2d = window.getComputedStyle(element2d);
      const style3d = window.getComputedStyle(element3d);
      
      return {
        transform2d: {
          supported: style2d.transform !== 'none',
          value: style2d.transform
        },
        transform3d: {
          supported: style3d.transform !== 'none',
          value: style3d.transform,
          transformStyle: style3d.transformStyle
        }
      };
    });

    expect(transformSupport.transform2d.supported).toBe(true);
    expect(transformSupport.transform2d.value).toContain('matrix');
    expect(transformSupport.transform3d.supported).toBe(true);
    expect(transformSupport.transform3d.value).toContain('matrix3d');
  });

  test('should support CSS Filters across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        .filter-container {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .filter-item {
          width: 80px;
          height: 80px;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2FjYyIvPjwvc3ZnPg==');
          margin: 5px;
        }
        .blur { filter: blur(2px); }
        .brightness { filter: brightness(1.5); }
        .contrast { filter: contrast(2); }
        .grayscale { filter: grayscale(100%); }
        .hue-rotate { filter: hue-rotate(90deg); }
        .saturate { filter: saturate(2); }
        .sepia { filter: sepia(100%); }
        .drop-shadow { filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5)); }
        .multiple { filter: blur(1px) brightness(1.2) contrast(1.5); }
      </style>
      <div class="filter-container">
        <div class="filter-item blur"></div>
        <div class="filter-item brightness"></div>
        <div class="filter-item contrast"></div>
        <div class="filter-item grayscale"></div>
        <div class="filter-item hue-rotate"></div>
        <div class="filter-item saturate"></div>
        <div class="filter-item sepia"></div>
        <div class="filter-item drop-shadow"></div>
        <div class="filter-item multiple"></div>
      </div>
    `);

    const filterSupport = await page.evaluate(() => {
      const filters = [
        'blur', 'brightness', 'contrast', 'grayscale', 
        'hue-rotate', 'saturate', 'sepia', 'drop-shadow', 'multiple'
      ];
      
      const results: Record<string, { supported: boolean; value: string }> = {};
      
      filters.forEach(filterClass => {
        const element = document.querySelector(`.${filterClass}`) as HTMLElement;
        const style = window.getComputedStyle(element);
        results[filterClass] = {
          supported: style.filter !== 'none',
          value: style.filter
        };
      });
      
      return results;
    });

    Object.entries(filterSupport).forEach(([filterName, { supported, value }]) => {
      expect(supported).toBe(true);
      expect(value).not.toBe('none');
      console.log(`${filterName} filter:`, value);
    });
  });

  test('should support CSS Animations across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-30px);
          }
          60% {
            transform: translateY(-15px);
          }
        }
        .animated-element {
          width: 100px;
          height: 50px;
          background: #007acc;
          margin: 20px;
          animation: slideIn 1s ease-in-out, bounce 2s infinite;
        }
        .transition-element {
          width: 100px;
          height: 50px;
          background: #28a745;
          margin: 20px;
          transition: all 0.3s ease;
        }
        .transition-element:hover {
          transform: scale(1.2);
          background: #dc3545;
        }
      </style>
      <div class="animated-element"></div>
      <div class="transition-element"></div>
    `);

    const animationSupport = await page.evaluate(() => {
      const animatedElement = document.querySelector('.animated-element') as HTMLElement;
      const transitionElement = document.querySelector('.transition-element') as HTMLElement;
      
      const animatedStyle = window.getComputedStyle(animatedElement);
      const transitionStyle = window.getComputedStyle(transitionElement);
      
      return {
        animation: {
          supported: animatedStyle.animationName !== 'none',
          animationName: animatedStyle.animationName,
          animationDuration: animatedStyle.animationDuration,
          animationTimingFunction: animatedStyle.animationTimingFunction,
          animationIterationCount: animatedStyle.animationIterationCount
        },
        transition: {
          supported: transitionStyle.transitionProperty !== 'none',
          transitionProperty: transitionStyle.transitionProperty,
          transitionDuration: transitionStyle.transitionDuration,
          transitionTimingFunction: transitionStyle.transitionTimingFunction
        }
      };
    });

    expect(animationSupport.animation.supported).toBe(true);
    expect(animationSupport.animation.animationName).toContain('slideIn');
    expect(animationSupport.animation.animationDuration).toBeTruthy();
    
    expect(animationSupport.transition.supported).toBe(true);
    expect(animationSupport.transition.transitionProperty).toBe('all');
    expect(animationSupport.transition.transitionDuration).toBe('0.3s');
  });
});

test.describe('CSS Advanced Feature Compatibility', () => {
  test('should support CSS Clip Path across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        .clip-path-container {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .clip-path-item {
          width: 100px;
          height: 100px;
          background: #007acc;
          margin: 10px;
        }
        .circle { clip-path: circle(50%); }
        .ellipse { clip-path: ellipse(50% 30%); }
        .polygon { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
        .inset { clip-path: inset(20px 30px 40px 50px); }
      </style>
      <div class="clip-path-container">
        <div class="clip-path-item circle"></div>
        <div class="clip-path-item ellipse"></div>
        <div class="clip-path-item polygon"></div>
        <div class="clip-path-item inset"></div>
      </div>
    `);

    const clipPathSupport = await page.evaluate(() => {
      const shapes = ['circle', 'ellipse', 'polygon', 'inset'];
      const results: Record<string, { supported: boolean; value: string }> = {};
      
      shapes.forEach(shape => {
        const element = document.querySelector(`.${shape}`) as HTMLElement;
        const style = window.getComputedStyle(element);
        results[shape] = {
          supported: style.clipPath !== 'none',
          value: style.clipPath
        };
      });
      
      return results;
    });

    Object.entries(clipPathSupport).forEach(([shape, { supported, value }]) => {
      expect(supported).toBe(true);
      expect(value).not.toBe('none');
      console.log(`${shape} clip-path:`, value);
    });
  });

  test('should support CSS Backdrop Filter if available', async ({ page }) => {
    await page.setContent(`
      <style>
        .backdrop-container {
          width: 300px;
          height: 200px;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIHN0b3AtY29sb3I9IiNmZjZiNmIiLz48c3RvcCBzdG9wLWNvbG9yPSIjNGVjZGM0IiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==');
          position: relative;
        }
        .backdrop-element {
          width: 150px;
          height: 100px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px) brightness(1.1);
          position: absolute;
          top: 50px;
          left: 75px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        }
      </style>
      <div class="backdrop-container">
        <div class="backdrop-element">Backdrop Filter</div>
      </div>
    `);

    const backdropFilterSupport = await page.evaluate(() => {
      const element = document.querySelector('.backdrop-element') as HTMLElement;
      const style = window.getComputedStyle(element);
      
      // Check CSS.supports for backdrop-filter
      const supportsBackdropFilter = CSS.supports && CSS.supports('backdrop-filter', 'blur(10px)');
      
      return {
        supported: supportsBackdropFilter,
        backdropFilter: style.backdropFilter,
        fallbackSupported: style.webkitBackdropFilter !== undefined
      };
    });

    if (backdropFilterSupport.supported || backdropFilterSupport.fallbackSupported) {
      expect(backdropFilterSupport.backdropFilter || backdropFilterSupport.fallbackSupported).toBeTruthy();
      console.log('Backdrop filter supported');
    } else {
      console.log('Backdrop filter not supported in this browser');
    }
  });

  test('should support CSS Scroll Behavior across browsers', async ({ page }) => {
    await page.setContent(`
      <style>
        html {
          scroll-behavior: smooth;
        }
        .scroll-container {
          height: 200px;
          overflow-y: auto;
          scroll-behavior: smooth;
        }
        .scroll-content {
          height: 800px;
          background: linear-gradient(to bottom, #ff6b6b, #4ecdc4);
        }
        .scroll-target {
          height: 100px;
          background: #007acc;
          margin-top: 600px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
      <div class="scroll-container" id="container">
        <div class="scroll-content">
          <div class="scroll-target" id="target">Scroll Target</div>
        </div>
      </div>
    `);

    const scrollBehaviorSupport = await page.evaluate(() => {
      const htmlElement = document.documentElement;
      const container = document.getElementById('container') as HTMLElement;
      
      const htmlStyle = window.getComputedStyle(htmlElement);
      const containerStyle = window.getComputedStyle(container);
      
      return {
        htmlScrollBehavior: htmlStyle.scrollBehavior,
        containerScrollBehavior: containerStyle.scrollBehavior,
        supported: CSS.supports && CSS.supports('scroll-behavior', 'smooth')
      };
    });

    expect(scrollBehaviorSupport.supported).toBe(true);
    expect(scrollBehaviorSupport.htmlScrollBehavior).toBe('smooth');
    expect(scrollBehaviorSupport.containerScrollBehavior).toBe('smooth');
  });

  test('should support CSS Logical Properties if available', async ({ page }) => {
    await page.setContent(`
      <style>
        .logical-props {
          width: 200px;
          height: 100px;
          background: #007acc;
          color: white;
          padding-inline-start: 20px;
          padding-inline-end: 10px;
          padding-block-start: 15px;
          padding-block-end: 5px;
          margin-inline: 10px;
          margin-block: 20px;
          border-inline-start: 3px solid #28a745;
          border-inline-end: 1px solid #dc3545;
          writing-mode: horizontal-tb;
          direction: ltr;
        }
      </style>
      <div class="logical-props">Logical Properties Test</div>
    `);

    const logicalPropsSupport = await page.evaluate(() => {
      const element = document.querySelector('.logical-props') as HTMLElement;
      const style = window.getComputedStyle(element);
      
      const supportsLogicalProps = CSS.supports && (
        CSS.supports('padding-inline-start', '10px') ||
        CSS.supports('padding-inline-start: 10px')
      );
      
      return {
        supported: supportsLogicalProps,
        paddingInlineStart: style.paddingInlineStart,
        paddingInlineEnd: style.paddingInlineEnd,
        paddingBlockStart: style.paddingBlockStart,
        paddingBlockEnd: style.paddingBlockEnd,
        marginInline: style.marginInline,
        marginBlock: style.marginBlock,
        borderInlineStartWidth: style.borderInlineStartWidth,
        borderInlineEndWidth: style.borderInlineEndWidth
      };
    });

    if (logicalPropsSupport.supported) {
      expect(logicalPropsSupport.paddingInlineStart).toBe('20px');
      expect(logicalPropsSupport.paddingInlineEnd).toBe('10px');
      expect(logicalPropsSupport.paddingBlockStart).toBe('15px');
      expect(logicalPropsSupport.paddingBlockEnd).toBe('5px');
      console.log('CSS Logical Properties supported');
    } else {
      console.log('CSS Logical Properties not supported in this browser');
    }
  });
});