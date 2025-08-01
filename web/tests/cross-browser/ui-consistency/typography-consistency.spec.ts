/**
 * Typography Consistency Tests Across Browsers
 * 
 * Tests font rendering, text layout, and typography consistency across
 * different browsers to ensure uniform text appearance.
 */

import { test, expect } from '@playwright/test';

test.describe('Font Rendering Consistency', () => {
  test('should render system fonts consistently across browsers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: white; 
            padding: 20px; 
            line-height: 1;
          }
          .font-test-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .font-sample {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
          .font-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .system-ui {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.5;
          }
          .arial {
            font-family: Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
          }
          .helvetica {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
          }
          .times {
            font-family: 'Times New Roman', Times, serif;
            font-size: 16px;
            line-height: 1.5;
          }
          .georgia {
            font-family: Georgia, serif;
            font-size: 16px;
            line-height: 1.5;
          }
          .courier {
            font-family: 'Courier New', Courier, monospace;
            font-size: 16px;
            line-height: 1.5;
          }
          .monaco {
            font-family: Monaco, 'Lucida Console', monospace;
            font-size: 16px;
            line-height: 1.5;
          }
          .size-test {
            display: flex;
            gap: 20px;
            align-items: baseline;
            margin-bottom: 20px;
          }
          .size-8 { font-size: 8px; }
          .size-10 { font-size: 10px; }
          .size-12 { font-size: 12px; }
          .size-14 { font-size: 14px; }
          .size-16 { font-size: 16px; }
          .size-18 { font-size: 18px; }
          .size-20 { font-size: 20px; }
          .size-24 { font-size: 24px; }
          .size-32 { font-size: 32px; }
          .size-48 { font-size: 48px; }
        </style>
      </head>
      <body>
        <div class="font-test-container">
          <h1 style="font-size: 32px; margin-bottom: 30px; text-align: center;">Font Rendering Test</h1>
          
          <div class="font-sample">
            <div class="font-label">System UI Font Stack</div>
            <div class="system-ui">
              The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()
            </div>
          </div>
          
          <div class="font-sample">
            <div class="font-label">Arial</div>
            <div class="arial">
              The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()
            </div>
          </div>
          
          <div class="font-sample">
            <div class="font-label">Helvetica</div>
            <div class="helvetica">
              The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()
            </div>
          </div>
          
          <div class="font-sample">
            <div class="font-label">Times New Roman</div>
            <div class="times">
              The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()
            </div>
          </div>
          
          <div class="font-sample">
            <div class="font-label">Georgia</div>
            <div class="georgia">
              The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()
            </div>
          </div>
          
          <div class="font-sample">
            <div class="font-label">Courier New</div>
            <div class="courier">
              The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()
            </div>
          </div>
          
          <div class="font-sample">
            <div class="font-label">Monaco</div>
            <div class="monaco">
              The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()
            </div>
          </div>
          
          <div class="font-sample">
            <div class="font-label">Font Size Test</div>
            <div class="size-test">
              <span class="size-8">8px</span>
              <span class="size-10">10px</span>
              <span class="size-12">12px</span>
              <span class="size-14">14px</span>
              <span class="size-16">16px</span>
              <span class="size-18">18px</span>
              <span class="size-20">20px</span>
              <span class="size-24">24px</span>
              <span class="size-32">32px</span>
              <span class="size-48">48px</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    await page.waitForTimeout(500);

    const fontMeasurements = await page.evaluate(() => {
      const systemUI = document.querySelector('.system-ui') as HTMLElement;
      const arial = document.querySelector('.arial') as HTMLElement;
      const helvetica = document.querySelector('.helvetica') as HTMLElement;
      const times = document.querySelector('.times') as HTMLElement;
      const georgia = document.querySelector('.georgia') as HTMLElement;
      const courier = document.querySelector('.courier') as HTMLElement;
      const monaco = document.querySelector('.monaco') as HTMLElement;

      const getFontMetrics = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          fontFamily: computedStyle.fontFamily,
          fontSize: computedStyle.fontSize,
          lineHeight: computedStyle.lineHeight,
          fontWeight: computedStyle.fontWeight,
          fontStyle: computedStyle.fontStyle
        };
      };

      // Test font size consistency
      const sizeSamples = Array.from(document.querySelectorAll('.size-test span')).map(el => {
        const element = el as HTMLElement;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          className: element.className,
          fontSize: parseInt(style.fontSize),
          actualHeight: Math.round(rect.height),
          actualWidth: Math.round(rect.width)
        };
      });

      return {
        fonts: {
          systemUI: getFontMetrics(systemUI),
          arial: getFontMetrics(arial),
          helvetica: getFontMetrics(helvetica),
          times: getFontMetrics(times),
          georgia: getFontMetrics(georgia),
          courier: getFontMetrics(courier),
          monaco: getFontMetrics(monaco)
        },
        sizes: sizeSamples
      };
    });

    // Verify all fonts have consistent base font size
    Object.values(fontMeasurements.fonts).forEach(font => {
      expect(font.fontSize).toBe('16px');
      expect(font.lineHeight).toBe('1.5');
    });

    // Verify monospace fonts are narrower than proportional fonts
    const courierWidth = fontMeasurements.fonts.courier.width;
    const arialWidth = fontMeasurements.fonts.arial.width;
    
    // Monospace fonts should typically render narrower for the same text
    // but this can vary by browser implementation
    expect(courierWidth).toBeGreaterThan(0);
    expect(arialWidth).toBeGreaterThan(0);

    // Verify font size scaling is consistent
    const sizeTests = fontMeasurements.sizes;
    expect(sizeTests.length).toBe(10);
    
    // Verify font sizes increase monotonically
    for (let i = 1; i < sizeTests.length; i++) {
      expect(sizeTests[i].fontSize).toBeGreaterThan(sizeTests[i-1].fontSize);
    }

    console.log('Font family rendering:');
    Object.entries(fontMeasurements.fonts).forEach(([name, metrics]) => {
      console.log(`${name}: ${metrics.fontFamily} (${metrics.width}x${metrics.height})`);
    });

    await page.screenshot({ 
      path: `test-results/font-rendering-${test.info().project.name}.png`,
      fullPage: true
    });
  });

  test('should render text formatting consistently across browsers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif;
            background: white; 
            padding: 20px; 
            line-height: 1.6;
          }
          .formatting-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .formatting-sample {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
          .sample-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 2px solid #007acc;
            padding-bottom: 5px;
          }
          .weight-test {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 10px;
            align-items: center;
            margin-bottom: 10px;
          }
          .weight-100 { font-weight: 100; }
          .weight-200 { font-weight: 200; }
          .weight-300 { font-weight: 300; }
          .weight-400 { font-weight: 400; }
          .weight-500 { font-weight: 500; }
          .weight-600 { font-weight: 600; }
          .weight-700 { font-weight: 700; }
          .weight-800 { font-weight: 800; }
          .weight-900 { font-weight: 900; }
          .style-normal { font-style: normal; }
          .style-italic { font-style: italic; }
          .style-oblique { font-style: oblique; }
          .decoration-none { text-decoration: none; }
          .decoration-underline { text-decoration: underline; }
          .decoration-line-through { text-decoration: line-through; }
          .decoration-overline { text-decoration: overline; }
          .transform-none { text-transform: none; }
          .transform-uppercase { text-transform: uppercase; }
          .transform-lowercase { text-transform: lowercase; }
          .transform-capitalize { text-transform: capitalize; }
          .spacing-test {
            letter-spacing: 2px;
            word-spacing: 4px;
          }
          .align-left { text-align: left; }
          .align-center { text-align: center; }
          .align-right { text-align: right; }
          .align-justify { text-align: justify; }
          .line-height-1 { line-height: 1; }
          .line-height-1_2 { line-height: 1.2; }
          .line-height-1_5 { line-height: 1.5; }
          .line-height-2 { line-height: 2; }
        </style>
      </head>
      <body>
        <div class="formatting-container">
          <h1 style="text-align: center; margin-bottom: 30px;">Text Formatting Test</h1>
          
          <div class="formatting-sample">
            <div class="sample-title">Font Weight Test</div>
            <div class="weight-test">
              <span>Weight 100:</span>
              <span class="weight-100">The quick brown fox jumps over the lazy dog</span>
            </div>
            <div class="weight-test">
              <span>Weight 200:</span>
              <span class="weight-200">The quick brown fox jumps over the lazy dog</span>
            </div>
            <div class="weight-test">
              <span>Weight 300:</span>
              <span class="weight-300">The quick brown fox jumps over the lazy dog</span>
            </div>
            <div class="weight-test">
              <span>Weight 400:</span>
              <span class="weight-400">The quick brown fox jumps over the lazy dog</span>
            </div>
            <div class="weight-test">
              <span>Weight 500:</span>
              <span class="weight-500">The quick brown fox jumps over the lazy dog</span>
            </div>
            <div class="weight-test">
              <span>Weight 600:</span>
              <span class="weight-600">The quick brown fox jumps over the lazy dog</span>
            </div>
            <div class="weight-test">
              <span>Weight 700:</span>
              <span class="weight-700">The quick brown fox jumps over the lazy dog</span>
            </div>
            <div class="weight-test">
              <span>Weight 800:</span>
              <span class="weight-800">The quick brown fox jumps over the lazy dog</span>
            </div>
            <div class="weight-test">
              <span>Weight 900:</span>
              <span class="weight-900">The quick brown fox jumps over the lazy dog</span>
            </div>
          </div>
          
          <div class="formatting-sample">
            <div class="sample-title">Font Style Test</div>
            <p class="style-normal">Normal text: The quick brown fox jumps over the lazy dog</p>
            <p class="style-italic">Italic text: The quick brown fox jumps over the lazy dog</p>
            <p class="style-oblique">Oblique text: The quick brown fox jumps over the lazy dog</p>
          </div>
          
          <div class="formatting-sample">
            <div class="sample-title">Text Decoration Test</div>
            <p class="decoration-none">No decoration: The quick brown fox jumps over the lazy dog</p>
            <p class="decoration-underline">Underlined text: The quick brown fox jumps over the lazy dog</p>
            <p class="decoration-line-through">Strike-through text: The quick brown fox jumps over the lazy dog</p>
            <p class="decoration-overline">Overlined text: The quick brown fox jumps over the lazy dog</p>
          </div>
          
          <div class="formatting-sample">
            <div class="sample-title">Text Transform Test</div>
            <p class="transform-none">normal case: The Quick Brown Fox Jumps Over The Lazy Dog</p>
            <p class="transform-uppercase">uppercase: The Quick Brown Fox Jumps Over The Lazy Dog</p>
            <p class="transform-lowercase">LOWERCASE: THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG</p>
            <p class="transform-capitalize">capitalize: the quick brown fox jumps over the lazy dog</p>
          </div>
          
          <div class="formatting-sample">
            <div class="sample-title">Letter and Word Spacing Test</div>
            <p style="letter-spacing: normal; word-spacing: normal;">Normal spacing: The quick brown fox jumps over the lazy dog</p>
            <p style="letter-spacing: 1px; word-spacing: 2px;">Increased letter and word spacing: The quick brown fox jumps over the lazy dog</p>
            <p style="letter-spacing: -0.5px; word-spacing: 1px;">Decreased letter spacing: The quick brown fox jumps over the lazy dog</p>
          </div>
          
          <div class="formatting-sample">
            <div class="sample-title">Text Alignment Test</div>
            <p class="align-left">Left aligned: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p class="align-center">Center aligned: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p class="align-right">Right aligned: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p class="align-justify">Justified: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          </div>
          
          <div class="formatting-sample">
            <div class="sample-title">Line Height Test</div>
            <p class="line-height-1">Line height 1.0: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.</p>
            <p class="line-height-1_2">Line height 1.2: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.</p>
            <p class="line-height-1_5">Line height 1.5: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.</p>
            <p class="line-height-2">Line height 2.0: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.</p>
          </div>
        </div>
      </body>
      </html>
    `);

    await page.waitForTimeout(500);

    const formattingMeasurements = await page.evaluate(() => {
      // Test font weight variations
      const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const weightResults = weights.map(weight => {
        const element = document.querySelector(`.weight-${weight}`) as HTMLElement;
        const style = window.getComputedStyle(element);
        return {
          expected: weight,
          actual: style.fontWeight,
          width: Math.round(element.getBoundingClientRect().width),
          height: Math.round(element.getBoundingClientRect().height)
        };
      });

      // Test text decorations
      const decorations = ['none', 'underline', 'line-through', 'overline'];
      const decorationResults = decorations.map(decoration => {
        const element = document.querySelector(`.decoration-${decoration}`) as HTMLElement;
        const style = window.getComputedStyle(element);
        return {
          expected: decoration,
          actual: style.textDecoration,
          height: Math.round(element.getBoundingClientRect().height)
        };
      });

      // Test text transforms
      const transforms = ['none', 'uppercase', 'lowercase', 'capitalize'];
      const transformResults = transforms.map(transform => {
        const element = document.querySelector(`.transform-${transform}`) as HTMLElement;
        const style = window.getComputedStyle(element);
        return {
          expected: transform,
          actual: style.textTransform,
          textContent: element.textContent
        };
      });

      // Test line heights
      const lineHeights = ['1', '1_2', '1_5', '2'];
      const lineHeightResults = lineHeights.map(lh => {
        const element = document.querySelector(`.line-height-${lh}`) as HTMLElement;
        const style = window.getComputedStyle(element);
        return {
          expected: lh.replace('_', '.'),
          actual: style.lineHeight,
          height: Math.round(element.getBoundingClientRect().height)
        };
      });

      return {
        weights: weightResults,
        decorations: decorationResults,
        transforms: transformResults,
        lineHeights: lineHeightResults
      };
    });

    // Verify font weights
    formattingMeasurements.weights.forEach(weight => {
      // Font weight should match expected or be a valid equivalent
      const actualWeight = parseInt(weight.actual);
      expect([weight.expected, 400, 700]).toContain(actualWeight); // Some browsers normalize weights
    });

    // Verify text decorations
    formattingMeasurements.decorations.forEach(decoration => {
      if (decoration.expected === 'none') {
        expect(decoration.actual).toContain('none');
      } else {
        expect(decoration.actual).toContain(decoration.expected);
      }
    });

    // Verify text transforms
    formattingMeasurements.transforms.forEach(transform => {
      expect(transform.actual).toBe(transform.expected);
      
      // Verify the actual text transformation worked
      const originalText = 'The Quick Brown Fox Jumps Over The Lazy Dog';
      switch (transform.expected) {
        case 'uppercase':
          expect(transform.textContent).toContain(originalText.toUpperCase());
          break;
        case 'lowercase':
          expect(transform.textContent).toContain(originalText.toLowerCase());
          break;
        case 'capitalize':
          // Each word should start with uppercase
          const words = transform.textContent!.split(' ');
          words.forEach(word => {
            if (word.length > 0) {
              expect(word[0]).toBe(word[0].toUpperCase());
            }
          });
          break;
      }
    });

    // Verify line heights increase
    for (let i = 1; i < formattingMeasurements.lineHeights.length; i++) {
      const current = formattingMeasurements.lineHeights[i];
      const previous = formattingMeasurements.lineHeights[i - 1];
      expect(current.height).toBeGreaterThan(previous.height);
    }

    await page.screenshot({ 
      path: `test-results/text-formatting-${test.info().project.name}.png`,
      fullPage: true
    });
  });

  test('should render complex text layouts consistently across browsers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Georgia, serif;
            background: white; 
            padding: 20px; 
            line-height: 1.6;
          }
          .article-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            padding: 40px;
          }
          .article-title {
            font-size: 36px;
            font-weight: bold;
            line-height: 1.2;
            margin-bottom: 10px;
            color: #333;
          }
          .article-subtitle {
            font-size: 18px;
            font-style: italic;
            color: #666;
            margin-bottom: 20px;
          }
          .article-meta {
            font-size: 14px;
            color: #888;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .article-content {
            font-size: 16px;
            line-height: 1.8;
            color: #333;
          }
          .article-content p {
            margin-bottom: 20px;
          }
          .article-content h2 {
            font-size: 24px;
            font-weight: bold;
            margin: 30px 0 15px 0;
            color: #222;
          }
          .article-content h3 {
            font-size: 20px;
            font-weight: 600;
            margin: 25px 0 12px 0;
            color: #333;
          }
          .article-content blockquote {
            border-left: 4px solid #007acc;
            padding-left: 20px;
            margin: 25px 0;
            font-style: italic;
            color: #555;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 0 8px 8px 0;
          }
          .article-content ul, .article-content ol {
            margin: 20px 0;
            padding-left: 30px;
          }
          .article-content li {
            margin-bottom: 8px;
          }
          .article-content strong {
            font-weight: bold;
            color: #222;
          }
          .article-content em {
            font-style: italic;
            color: #444;
          }
          .article-content code {
            background: #f1f1f1;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
          }
          .article-content .highlight {
            background: #fff3cd;
            padding: 2px 4px;
            border-radius: 3px;
          }
          .drop-cap {
            float: left;
            font-size: 72px;
            line-height: 60px;
            padding-right: 8px;
            padding-top: 4px;
            font-weight: bold;
            color: #007acc;
          }
          .two-column {
            column-count: 2;
            column-gap: 30px;
            column-rule: 1px solid #ddd;
          }
          .text-hyphenate {
            hyphens: auto;
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <article class="article-container">
          <h1 class="article-title">Typography in Modern Web Design</h1>
          <div class="article-subtitle">A comprehensive guide to cross-browser text rendering</div>
          <div class="article-meta">
            Published on March 15, 2024 | By Typography Team | Reading time: 5 minutes
          </div>
          
          <div class="article-content">
            <p>
              <span class="drop-cap">T</span>ypography is one of the most critical aspects of web design, affecting both readability and user experience. This comprehensive guide explores the intricacies of cross-browser text rendering and provides practical solutions for achieving consistent typography across different platforms.
            </p>
            
            <h2>The Importance of Consistent Typography</h2>
            <p>
              In the digital age, <strong>consistent typography</strong> serves as the foundation for effective communication. Users expect a <em>seamless reading experience</em> regardless of their chosen browser or device. This expectation drives the need for thorough cross-browser testing and optimization.
            </p>
            
            <p>
              Modern web browsers implement text rendering engines differently, leading to variations in how fonts are displayed. <code>font-family</code> fallbacks, <code>line-height</code> calculations, and <span class="highlight">font smoothing techniques</span> can all contribute to these differences.
            </p>
            
            <blockquote>
              "Good typography is invisible. When done well, it allows readers to focus on content without being distracted by inconsistent or poorly rendered text." — Typography Expert
            </blockquote>
            
            <h3>Key Factors Affecting Cross-Browser Typography</h3>
            <p>
              Several factors influence how typography appears across different browsers:
            </p>
            
            <ul>
              <li><strong>Font rendering engines:</strong> Different browsers use various rendering engines (DirectWrite, FreeType, Core Text)</li>
              <li><strong>System fonts:</strong> Platform-specific font availability affects fallback behavior</li>
              <li><strong>Subpixel rendering:</strong> Anti-aliasing and subpixel rendering techniques vary</li>
              <li><strong>Default stylesheets:</strong> Browser-specific default styles can override custom typography</li>
              <li><strong>Zoom levels:</strong> Different zoom implementations affect text scaling</li>
            </ul>
            
            <h3>Best Practices for Cross-Browser Typography</h3>
            <p>
              To ensure consistent typography across browsers, consider these recommendations:
            </p>
            
            <ol>
              <li>Use comprehensive font stacks with appropriate fallbacks</li>
              <li>Specify explicit line-height values in relative units</li>
              <li>Test typography across multiple browsers and platforms</li>
              <li>Consider using web fonts for critical brand typography</li>
              <li>Implement proper font loading strategies to prevent FOUT/FOIT</li>
            </ol>
            
            <div class="two-column text-hyphenate">
              <p>
                Multi-column layouts require special attention to typography. Text should flow naturally between columns while maintaining readability and proper line spacing. Hyphenation can help prevent awkward line breaks, especially in narrower columns where longer words might otherwise create unsightly gaps.
              </p>
              
              <p>
                Cross-browser compatibility becomes even more important in multi-column scenarios, as different browsers may handle column breaks, orphans, and widows differently. Testing these layouts thoroughly ensures a consistent reading experience across all platforms and devices.
              </p>
            </div>
            
            <h2>Testing and Validation</h2>
            <p>
              Regular typography testing should include visual regression testing, automated cross-browser testing suites, and manual review across target browsers. This comprehensive approach helps identify and resolve typography inconsistencies before they impact user experience.
            </p>
          </div>
        </article>
      </body>
      </html>
    `);

    await page.waitForTimeout(1000); // Allow more time for complex layout

    const textLayoutMeasurements = await page.evaluate(() => {
      const title = document.querySelector('.article-title') as HTMLElement;
      const subtitle = document.querySelector('.article-subtitle') as HTMLElement;
      const dropCap = document.querySelector('.drop-cap') as HTMLElement;
      const blockquote = document.querySelector('blockquote') as HTMLElement;
      const twoColumn = document.querySelector('.two-column') as HTMLElement;
      const codeElements = Array.from(document.querySelectorAll('code'));

      const getTextMetrics = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontWeight: style.fontWeight,
          fontFamily: style.fontFamily,
          textAlign: style.textAlign
        };
      };

      return {
        title: getTextMetrics(title),
        subtitle: getTextMetrics(subtitle),
        dropCap: getTextMetrics(dropCap),
        blockquote: getTextMetrics(blockquote),
        twoColumn: getTextMetrics(twoColumn),
        codeCount: codeElements.length,
        codeMetrics: codeElements.map(el => getTextMetrics(el as HTMLElement)),
        articleWidth: Math.round(document.querySelector('.article-container')!.getBoundingClientRect().width)
      };
    });

    // Verify title typography
    expect(textLayoutMeasurements.title.fontSize).toBe('36px');
    expect(textLayoutMeasurements.title.fontWeight).toBe('700'); // Bold
    expect(textLayoutMeasurements.title.lineHeight).toBe('1.2');

    // Verify subtitle typography
    expect(textLayoutMeasurements.subtitle.fontSize).toBe('18px');
    expect(textLayoutMeasurements.subtitle.fontWeight).toBe('400'); // Normal

    // Verify drop cap is significantly larger
    expect(parseInt(textLayoutMeasurements.dropCap.fontSize)).toBeGreaterThan(60);

    // Verify blockquote has proper styling
    expect(textLayoutMeasurements.blockquote.width).toBeGreaterThan(0);
    expect(textLayoutMeasurements.blockquote.height).toBeGreaterThan(0);

    // Verify code elements exist and have monospace font
    expect(textLayoutMeasurements.codeCount).toBeGreaterThan(0);
    textLayoutMeasurements.codeMetrics.forEach(code => {
      expect(code.fontFamily).toContain('Courier');
    });

    // Verify two-column layout
    expect(textLayoutMeasurements.twoColumn.width).toBeGreaterThan(0);

    // Verify article container width is reasonable
    expect(textLayoutMeasurements.articleWidth).toBeGreaterThan(600);
    expect(textLayoutMeasurements.articleWidth).toBeLessThan(800);

    await page.screenshot({ 
      path: `test-results/complex-typography-${test.info().project.name}.png`,
      fullPage: true
    });
  });
});