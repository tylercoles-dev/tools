/**
 * UI Layout Consistency Tests Across Browsers
 * 
 * Tests layout rendering consistency across different browsers to ensure
 * uniform user experience and identify browser-specific layout issues.
 */

import { test, expect } from '@playwright/test';

test.describe('Grid Layout Consistency', () => {
  test('should render CSS Grid consistently across browsers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          .grid-container {
            display: grid;
            grid-template-columns: 200px 1fr 150px;
            grid-template-rows: 60px 1fr 40px;
            grid-gap: 10px;
            width: 800px;
            height: 600px;
            background: #f5f5f5;
            border: 2px solid #007acc;
          }
          .grid-item {
            background: #007acc;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            font-size: 14px;
            border-radius: 4px;
          }
          .header { grid-area: 1 / 1 / 2 / 4; background: #2c3e50; }
          .sidebar { grid-area: 2 / 1 / 3 / 2; background: #34495e; }
          .main { grid-area: 2 / 2 / 3 / 3; background: #3498db; }
          .aside { grid-area: 2 / 3 / 3 / 4; background: #9b59b6; }
          .footer { grid-area: 3 / 1 / 4 / 4; background: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="grid-container" id="grid">
          <div class="grid-item header">Header</div>
          <div class="grid-item sidebar">Sidebar</div>
          <div class="grid-item main">Main Content</div>
          <div class="grid-item aside">Aside</div>
          <div class="grid-item footer">Footer</div>
        </div>
      </body>
      </html>
    `);

    // Wait for layout to settle
    await page.waitForTimeout(500);

    const layoutMeasurements = await page.evaluate(() => {
      const container = document.getElementById('grid')!;
      const header = document.querySelector('.header') as HTMLElement;
      const sidebar = document.querySelector('.sidebar') as HTMLElement;
      const main = document.querySelector('.main') as HTMLElement;
      const aside = document.querySelector('.aside') as HTMLElement;
      const footer = document.querySelector('.footer') as HTMLElement;

      const containerRect = container.getBoundingClientRect();
      
      return {
        container: {
          width: Math.round(containerRect.width),
          height: Math.round(containerRect.height)
        },
        header: {
          width: Math.round(header.getBoundingClientRect().width),
          height: Math.round(header.getBoundingClientRect().height),
          top: Math.round(header.getBoundingClientRect().top - containerRect.top),
          left: Math.round(header.getBoundingClientRect().left - containerRect.left)
        },
        sidebar: {
          width: Math.round(sidebar.getBoundingClientRect().width),
          height: Math.round(sidebar.getBoundingClientRect().height),
          top: Math.round(sidebar.getBoundingClientRect().top - containerRect.top),
          left: Math.round(sidebar.getBoundingClientRect().left - containerRect.left)
        },
        main: {
          width: Math.round(main.getBoundingClientRect().width),
          height: Math.round(main.getBoundingClientRect().height),
          top: Math.round(main.getBoundingClientRect().top - containerRect.top),
          left: Math.round(main.getBoundingClientRect().left - containerRect.left)
        },
        aside: {
          width: Math.round(aside.getBoundingClientRect().width),
          height: Math.round(aside.getBoundingClientRect().height),
          top: Math.round(aside.getBoundingClientRect().top - containerRect.top),
          left: Math.round(aside.getBoundingClientRect().left - containerRect.left)
        },
        footer: {
          width: Math.round(footer.getBoundingClientRect().width),
          height: Math.round(footer.getBoundingClientRect().height),
          top: Math.round(footer.getBoundingClientRect().top - containerRect.top),
          left: Math.round(footer.getBoundingClientRect().left - containerRect.left)
        }
      };
    });

    // Verify container dimensions
    expect(layoutMeasurements.container.width).toBe(800);
    expect(layoutMeasurements.container.height).toBe(600);

    // Verify header spans full width and is at top
    expect(layoutMeasurements.header.width).toBe(780); // 800 - 20px gap
    expect(layoutMeasurements.header.height).toBe(60);
    expect(layoutMeasurements.header.top).toBe(0);
    expect(layoutMeasurements.header.left).toBe(0);

    // Verify sidebar dimensions and position
    expect(layoutMeasurements.sidebar.width).toBe(200);
    expect(layoutMeasurements.sidebar.top).toBe(70); // 60px header + 10px gap
    expect(layoutMeasurements.sidebar.left).toBe(0);

    // Verify main content area
    expect(layoutMeasurements.main.top).toBe(70);
    expect(layoutMeasurements.main.left).toBe(210); // 200px sidebar + 10px gap

    // Verify aside panel
    expect(layoutMeasurements.aside.width).toBe(150);
    expect(layoutMeasurements.aside.top).toBe(70);

    // Verify footer spans full width and is at bottom
    expect(layoutMeasurements.footer.width).toBe(780);
    expect(layoutMeasurements.footer.height).toBe(40);

    // Take a screenshot for visual comparison
    await page.screenshot({ 
      path: `test-results/grid-layout-${test.info().project.name}.png`,
      fullPage: true
    });
  });

  test('should render Flexbox layout consistently across browsers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          .flex-container {
            display: flex;
            flex-direction: column;
            width: 800px;
            height: 600px;
            background: #f8f9fa;
            border: 2px solid #28a745;
          }
          .flex-header {
            flex: 0 0 80px;
            background: #007acc;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            font-size: 18px;
            font-weight: bold;
          }
          .flex-body {
            flex: 1;
            display: flex;
            flex-direction: row;
          }
          .flex-sidebar {
            flex: 0 0 200px;
            background: #6c757d;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
          }
          .flex-main {
            flex: 1;
            background: #e9ecef;
            display: flex;
            flex-direction: column;
          }
          .flex-nav {
            flex: 0 0 50px;
            background: #28a745;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-around;
            font-family: Arial, sans-serif;
          }
          .flex-content {
            flex: 1;
            background: #ffffff;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .flex-footer {
            flex: 0 0 60px;
            background: #dc3545;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <div class="flex-container" id="flex">
          <div class="flex-header">Header</div>
          <div class="flex-body">
            <div class="flex-sidebar">Sidebar</div>
            <div class="flex-main">
              <div class="flex-nav">
                <span>Nav 1</span>
                <span>Nav 2</span>
                <span>Nav 3</span>
              </div>
              <div class="flex-content">
                <h2>Main Content Area</h2>
                <p>This is the main content area that should flex to fill available space.</p>
              </div>
            </div>
          </div>
          <div class="flex-footer">Footer</div>
        </div>
      </body>
      </html>
    `);

    await page.waitForTimeout(500);

    const flexMeasurements = await page.evaluate(() => {
      const container = document.getElementById('flex')!;
      const header = document.querySelector('.flex-header') as HTMLElement;
      const sidebar = document.querySelector('.flex-sidebar') as HTMLElement;
      const nav = document.querySelector('.flex-nav') as HTMLElement;
      const content = document.querySelector('.flex-content') as HTMLElement;
      const footer = document.querySelector('.flex-footer') as HTMLElement;

      const containerRect = container.getBoundingClientRect();

      return {
        container: {
          width: Math.round(containerRect.width),
          height: Math.round(containerRect.height)
        },
        header: {
          width: Math.round(header.getBoundingClientRect().width),
          height: Math.round(header.getBoundingClientRect().height)
        },
        sidebar: {
          width: Math.round(sidebar.getBoundingClientRect().width),
          height: Math.round(sidebar.getBoundingClientRect().height)
        },
        nav: {
          width: Math.round(nav.getBoundingClientRect().width),
          height: Math.round(nav.getBoundingClientRect().height)
        },
        content: {
          width: Math.round(content.getBoundingClientRect().width),
          height: Math.round(content.getBoundingClientRect().height)
        },
        footer: {
          width: Math.round(footer.getBoundingClientRect().width),
          height: Math.round(footer.getBoundingClientRect().height)
        }
      };
    });

    // Verify container dimensions
    expect(flexMeasurements.container.width).toBe(800);
    expect(flexMeasurements.container.height).toBe(600);

    // Verify header takes full width and fixed height
    expect(flexMeasurements.header.width).toBe(800);
    expect(flexMeasurements.header.height).toBe(80);

    // Verify sidebar has fixed width
    expect(flexMeasurements.sidebar.width).toBe(200);

    // Verify navigation bar height
    expect(flexMeasurements.nav.height).toBe(50);

    // Verify footer takes full width and fixed height
    expect(flexMeasurements.footer.width).toBe(800);
    expect(flexMeasurements.footer.height).toBe(60);

    // Take a screenshot for visual comparison
    await page.screenshot({ 
      path: `test-results/flex-layout-${test.info().project.name}.png`,
      fullPage: true
    });
  });
});

test.describe('Responsive Layout Consistency', () => {
  test('should handle viewport changes consistently across browsers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          .responsive-container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
          }
          .responsive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
          }
          .responsive-item {
            background: #007acc;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px;
            min-height: 150px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
          }
          @media (max-width: 768px) {
            .responsive-container {
              padding: 10px;
            }
            .responsive-grid {
              grid-template-columns: 1fr;
              gap: 10px;
            }
            .responsive-item {
              padding: 20px;
              min-height: 100px;
            }
          }
          @media (max-width: 480px) {
            .responsive-container {
              padding: 5px;
            }
            .responsive-item {
              padding: 15px;
              min-height: 80px;
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="responsive-container" id="responsive">
          <div class="responsive-grid">
            <div class="responsive-item">Item 1</div>
            <div class="responsive-item">Item 2</div>
            <div class="responsive-item">Item 3</div>
            <div class="responsive-item">Item 4</div>
          </div>
        </div>
      </body>
      </html>
    `);

    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(300);

    const desktopLayout = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.responsive-item'));
      return items.map((item, index) => {
        const rect = item.getBoundingClientRect();
        return {
          index,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left)
        };
      });
    });

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);

    const tabletLayout = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.responsive-item'));
      return items.map((item, index) => {
        const rect = item.getBoundingClientRect();
        return {
          index,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left)
        };
      });
    });

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    const mobileLayout = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.responsive-item'));
      return items.map((item, index) => {
        const rect = item.getBoundingClientRect();
        return {
          index,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left)
        };
      });
    });

    // Verify desktop layout has multiple columns
    const desktopItemsPerRow = desktopLayout.filter(item => item.top === desktopLayout[0].top);
    expect(desktopItemsPerRow.length).toBeGreaterThan(1);

    // Verify tablet layout adapts
    const tabletItemsPerRow = tabletLayout.filter(item => item.top === tabletLayout[0].top);
    expect(tabletItemsPerRow.length).toBeLessThanOrEqual(desktopItemsPerRow.length);

    // Verify mobile layout is single column
    const mobileItemsPerRow = mobileLayout.filter(item => item.top === mobileLayout[0].top);
    expect(mobileItemsPerRow.length).toBe(1);

    // Take screenshots at different viewports
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.screenshot({ 
      path: `test-results/responsive-desktop-${test.info().project.name}.png`
    });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: `test-results/responsive-tablet-${test.info().project.name}.png`
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: `test-results/responsive-mobile-${test.info().project.name}.png`
    });
  });
});

test.describe('Component Layout Consistency', () => {
  test('should render form layouts consistently across browsers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .form-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .form-group {
            margin-bottom: 20px;
          }
          .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
          }
          .form-col {
            flex: 1;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
          }
          input, textarea, select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            transition: border-color 0.3s ease;
          }
          input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #007acc;
          }
          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .checkbox-group input[type="checkbox"] {
            width: auto;
          }
          .radio-group {
            display: flex;
            gap: 20px;
          }
          .radio-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .radio-item input[type="radio"] {
            width: auto;
          }
          .button-group {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 30px;
          }
          button {
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.3s ease;
          }
          .btn-primary {
            background: #007acc;
            color: white;
          }
          .btn-primary:hover {
            background: #005a9e;
          }
          .btn-secondary {
            background: #6c757d;
            color: white;
          }
          .btn-secondary:hover {
            background: #545b62;
          }
        </style>
      </head>
      <body>
        <div class="form-container" id="form">
          <h2>Contact Form</h2>
          <form>
            <div class="form-row">
              <div class="form-col">
                <label for="firstName">First Name</label>
                <input type="text" id="firstName" name="firstName" value="John">
              </div>
              <div class="form-col">
                <label for="lastName">Last Name</label>
                <input type="text" id="lastName" name="lastName" value="Doe">
              </div>
            </div>
            
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" value="john.doe@example.com">
            </div>
            
            <div class="form-group">
              <label for="phone">Phone</label>
              <input type="tel" id="phone" name="phone" value="+1234567890">
            </div>
            
            <div class="form-group">
              <label for="country">Country</label>
              <select id="country" name="country">
                <option value="us" selected>United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
                <option value="au">Australia</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Preferred Contact Method</label>
              <div class="radio-group">
                <div class="radio-item">
                  <input type="radio" id="contactEmail" name="contact" value="email" checked>
                  <label for="contactEmail">Email</label>
                </div>
                <div class="radio-item">
                  <input type="radio" id="contactPhone" name="contact" value="phone">
                  <label for="contactPhone">Phone</label>
                </div>
                <div class="radio-item">
                  <input type="radio" id="contactBoth" name="contact" value="both">
                  <label for="contactBoth">Both</label>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <div class="checkbox-group">
                <input type="checkbox" id="newsletter" name="newsletter" checked>
                <label for="newsletter">Subscribe to newsletter</label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" name="message" rows="4" placeholder="Enter your message here...">Test message content</textarea>
            </div>
            
            <div class="button-group">
              <button type="button" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary">Submit</button>
            </div>
          </form>
        </div>
      </body>
      </html>
    `);

    await page.waitForTimeout(500);

    const formMeasurements = await page.evaluate(() => {
      const form = document.getElementById('form')!;
      const firstNameInput = document.getElementById('firstName') as HTMLInputElement;
      const lastNameInput = document.getElementById('lastName') as HTMLInputElement;
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const countrySelect = document.getElementById('country') as HTMLSelectElement;
      const textarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitButton = document.querySelector('.btn-primary') as HTMLButtonElement;

      const formRect = form.getBoundingClientRect();

      return {
        form: {
          width: Math.round(formRect.width),
          height: Math.round(formRect.height)
        },
        inputs: {
          firstName: {
            width: Math.round(firstNameInput.getBoundingClientRect().width),
            height: Math.round(firstNameInput.getBoundingClientRect().height),
            value: firstNameInput.value
          },
          lastName: {
            width: Math.round(lastNameInput.getBoundingClientRect().width),
            height: Math.round(lastNameInput.getBoundingClientRect().height),
            value: lastNameInput.value
          },
          email: {
            width: Math.round(emailInput.getBoundingClientRect().width),
            height: Math.round(emailInput.getBoundingClientRect().height),
            value: emailInput.value
          },
          country: {
            width: Math.round(countrySelect.getBoundingClientRect().width),
            height: Math.round(countrySelect.getBoundingClientRect().height),
            selectedIndex: countrySelect.selectedIndex
          },
          textarea: {
            width: Math.round(textarea.getBoundingClientRect().width),
            height: Math.round(textarea.getBoundingClientRect().height),
            value: textarea.value
          }
        },
        button: {
          width: Math.round(submitButton.getBoundingClientRect().width),
          height: Math.round(submitButton.getBoundingClientRect().height)
        }
      };
    });

    // Verify form container has consistent width
    expect(formMeasurements.form.width).toBeGreaterThan(500);
    expect(formMeasurements.form.width).toBeLessThan(700);

    // Verify input field values are preserved
    expect(formMeasurements.inputs.firstName.value).toBe('John');
    expect(formMeasurements.inputs.lastName.value).toBe('Doe');
    expect(formMeasurements.inputs.email.value).toBe('john.doe@example.com');

    // Verify form row inputs have similar widths (allowing for small differences)
    const widthDifference = Math.abs(
      formMeasurements.inputs.firstName.width - formMeasurements.inputs.lastName.width
    );
    expect(widthDifference).toBeLessThan(5);

    // Verify all input heights are consistent
    const inputHeight = formMeasurements.inputs.firstName.height;
    expect(formMeasurements.inputs.lastName.height).toBe(inputHeight);
    expect(formMeasurements.inputs.email.height).toBe(inputHeight);
    expect(formMeasurements.inputs.country.height).toBeGreaterThanOrEqual(inputHeight - 2);

    // Verify textarea is taller than regular inputs
    expect(formMeasurements.inputs.textarea.height).toBeGreaterThan(inputHeight * 2);

    await page.screenshot({ 
      path: `test-results/form-layout-${test.info().project.name}.png`,
      fullPage: true
    });
  });

  test('should render card layouts consistently across browsers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 20px; }
          .cards-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
          .card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          }
          .card-image {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
          }
          .card-content {
            padding: 20px;
          }
          .card-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          .card-description {
            color: #666;
            line-height: 1.5;
            margin-bottom: 15px;
          }
          .card-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #888;
            margin-bottom: 15px;
          }
          .card-actions {
            display: flex;
            gap: 10px;
          }
          .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.3s ease;
          }
          .btn-primary {
            background: #007acc;
            color: white;
          }
          .btn-primary:hover {
            background: #005a9e;
          }
          .btn-outline {
            background: transparent;
            color: #007acc;
            border: 1px solid #007acc;
          }
          .btn-outline:hover {
            background: #007acc;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="cards-container" id="cards">
          <div class="card">
            <div class="card-image">Image 1</div>
            <div class="card-content">
              <h3 class="card-title">Card Title One</h3>
              <p class="card-description">This is a description for the first card. It contains some sample text to test layout consistency.</p>
              <div class="card-meta">
                <span>January 15, 2024</span>
                <span>Category A</span>
              </div>
              <div class="card-actions">
                <button class="btn btn-primary">Read More</button>
                <button class="btn btn-outline">Share</button>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-image">Image 2</div>
            <div class="card-content">
              <h3 class="card-title">Card Title Two</h3>
              <p class="card-description">This is a longer description for the second card to test how different content lengths affect the layout and consistency across browsers.</p>
              <div class="card-meta">
                <span>February 20, 2024</span>
                <span>Category B</span>
              </div>
              <div class="card-actions">
                <button class="btn btn-primary">Read More</button>
                <button class="btn btn-outline">Share</button>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-image">Image 3</div>
            <div class="card-content">
              <h3 class="card-title">Card Title Three</h3>
              <p class="card-description">Short description for the third card.</p>
              <div class="card-meta">
                <span>March 5, 2024</span>
                <span>Category C</span>
              </div>
              <div class="card-actions">
                <button class="btn btn-primary">Read More</button>
                <button class="btn btn-outline">Share</button>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    await page.waitForTimeout(500);

    const cardMeasurements = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card'));
      const container = document.getElementById('cards')!;
      
      const containerRect = container.getBoundingClientRect();
      
      return {
        container: {
          width: Math.round(containerRect.width),
          height: Math.round(containerRect.height)
        },
        cards: cards.map((card, index) => {
          const cardRect = card.getBoundingClientRect();
          const image = card.querySelector('.card-image') as HTMLElement;
          const content = card.querySelector('.card-content') as HTMLElement;
          const title = card.querySelector('.card-title') as HTMLElement;
          const description = card.querySelector('.card-description') as HTMLElement;
          
          return {
            index,
            width: Math.round(cardRect.width),
            height: Math.round(cardRect.height),
            imageHeight: Math.round(image.getBoundingClientRect().height),
            contentPadding: Math.round(parseInt(window.getComputedStyle(content).padding)),
            titleFontSize: Math.round(parseInt(window.getComputedStyle(title).fontSize)),
            descriptionLineHeight: window.getComputedStyle(description).lineHeight
          };
        })
      };
    });

    // Verify all cards have consistent image heights
    const imageHeight = cardMeasurements.cards[0].imageHeight;
    cardMeasurements.cards.forEach(card => {
      expect(card.imageHeight).toBe(imageHeight);
    });

    // Verify all cards have consistent content padding
    const contentPadding = cardMeasurements.cards[0].contentPadding;
    cardMeasurements.cards.forEach(card => {
      expect(card.contentPadding).toBe(contentPadding);
    });

    // Verify all cards have consistent title font sizes
    const titleFontSize = cardMeasurements.cards[0].titleFontSize;
    cardMeasurements.cards.forEach(card => {
      expect(card.titleFontSize).toBe(titleFontSize);
    });

    // Cards might have different heights due to content, but widths should be consistent in same row
    const firstRowCards = cardMeasurements.cards.filter((_, index) => index < 2);
    if (firstRowCards.length > 1) {
      const widthDifference = Math.abs(firstRowCards[0].width - firstRowCards[1].width);
      expect(widthDifference).toBeLessThan(5);
    }

    await page.screenshot({ 
      path: `test-results/card-layout-${test.info().project.name}.png`,
      fullPage: true
    });
  });
});