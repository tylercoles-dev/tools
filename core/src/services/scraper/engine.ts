/**
 * Web Scraping Engine
 * Handles the actual web scraping logic
 */

import { launch, Browser, Page } from 'puppeteer';
import crypto from 'crypto';
import { 
  ScrapingTimeoutError,
  NetworkError 
} from './types.js';
import type { 
  ProcessedScrapeUrlInput, 
  ScrapedContent, 
  ScraperConfig
} from './types.js';

export class ScrapingEngine {
  private browser?: Browser;
  private config: ScraperConfig;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      concurrency: 3,
      defaultTimeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      headless: true,
      enableJavaScript: true,
      removeAds: true,
      extractMainContent: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      this.browser = await launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      console.log('Scraping engine initialized');
    } catch (error) {
      console.error('Failed to initialize scraping engine:', error);
      throw error;
    }
  }

  async scrapeUrl(input: ProcessedScrapeUrlInput): Promise<ScrapedContent> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      // Set user agent and viewport
      await page.setUserAgent(input.options?.userAgent || this.config.userAgent);
      await page.setViewport({ width: 1920, height: 1080 });

      // Set custom headers if provided
      if (input.options?.headers) {
        await page.setExtraHTTPHeaders(input.options.headers);
      }

      // Set cookies if provided
      if (input.options?.cookies) {
        await page.setCookie(...input.options.cookies);
      }

      // Configure request interception for ad blocking
      if (this.config.removeAds) {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const url = req.url();
          const resourceType = req.resourceType();
          
          // Block common ad domains and resource types
          if (this.isAdContent(url, resourceType)) {
            req.abort();
          } else {
            req.continue();
          }
        });
      }

      // Navigate to the URL
      const timeout = input.options?.timeout || this.config.defaultTimeout;
      
      try {
        await page.goto(input.url, {
          waitUntil: 'domcontentloaded',
          timeout
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          throw new ScrapingTimeoutError(input.url, timeout);
        }
        throw new NetworkError(input.url, error as Error);
      }

      // Wait for additional time if specified
      if (input.options?.waitFor) {
        await page.waitForTimeout(input.options.waitFor);
      }

      // Extract content
      const content = await this.extractContent(page, input.selector);
      
      // Take screenshot if requested
      let screenshot: string | undefined;
      if (input.options?.screenshot) {
        const screenshotBuffer = await page.screenshot({
          fullPage: input.options.fullPage || false,
          type: 'png'
        });
        screenshot = screenshotBuffer.toString('base64');
      }

      // Generate content hash
      const contentHash = crypto
        .createHash('sha256')
        .update(content.content)
        .digest('hex');

      return {
        id: crypto.randomUUID(),
        url: input.url,
        title: content.title,
        content: content.content,
        contentHash,
        metadata: {
          ...content.metadata,
          screenshot,
          wordCount: this.countWords(content.content),
          readingTime: this.calculateReadingTime(content.content)
        },
        scrapedAt: new Date().toISOString(),
        status: 'success'
      };

    } catch (error) {
      console.error(`Failed to scrape ${input.url}:`, error);
      
      return {
        id: crypto.randomUUID(),
        url: input.url,
        content: '',
        contentHash: '',
        metadata: {
          wordCount: 0,
          readingTime: 0
        },
        scrapedAt: new Date().toISOString(),
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      await page.close();
    }
  }

  private async extractContent(page: Page, selector?: string): Promise<{
    title?: string;
    content: string;
    metadata: {
      description?: string;
      keywords?: string[];
      author?: string;
      publishedDate?: string;
      language?: string;
      images?: string[];
      links?: string[];
      headers?: Array<{ level: number; text: string }>;
    };
  }> {
    const result = await page.evaluate((sel, extractMain) => {
      // Get title
      const title = document.title || document.querySelector('h1')?.textContent || undefined;

      // Get meta tags
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined;
      const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [];
      const author = document.querySelector('meta[name="author"]')?.getAttribute('content') || undefined;
      const publishedDate = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || undefined;
      const language = document.documentElement.lang || undefined;

      // Extract content based on selector or main content extraction
      let content = '';
      if (sel) {
        const element = document.querySelector(sel);
        content = element?.textContent || (element as HTMLElement)?.innerText || '';
      } else if (extractMain) {
        // Try to extract main content using common selectors
        const mainSelectors = [
          'main',
          'article',
          '.content',
          '.post-content',
          '.entry-content',
          '.article-content',
          '#content'
        ];
        
        for (const selector of mainSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent && element.textContent.length > 100) {
            content = element.textContent;
            break;
          }
        }
        
        // Fallback to body if no main content found
        if (!content) {
          content = document.body.textContent || document.body.innerText || '';
        }
      } else {
        content = document.body.textContent || document.body.innerText || '';
      }

      // Clean up content
      content = content.replace(/\s+/g, ' ').trim();

      // Extract images
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src && src.startsWith('http'));

      // Extract links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => href && href.startsWith('http'));

      // Extract headers
      const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(header => ({
          level: parseInt(header.tagName[1]),
          text: header.textContent?.trim() || ''
        }))
        .filter(h => h.text);

      return {
        title,
        content,
        metadata: {
          description,
          keywords: keywords.length > 0 ? keywords : undefined,
          author,
          publishedDate,
          language,
          images: images.length > 0 ? images.slice(0, 20) : undefined, // Limit to 20 images
          links: links.length > 0 ? links.slice(0, 50) : undefined, // Limit to 50 links
          headers: headers.length > 0 ? headers : undefined
        }
      };
    }, selector, this.config.extractMainContent);

    return result;
  }

  private isAdContent(url: string, resourceType: string): boolean {
    const adDomains = [
      'googlesyndication.com',
      'doubleclick.net',
      'googleadservices.com',
      'amazon-adsystem.com',
      'facebook.com/tr',
      'google-analytics.com',
      'googletagmanager.com'
    ];

    const adResourceTypes = ['image', 'media'];
    
    return adDomains.some(domain => url.includes(domain)) ||
           (adResourceTypes.includes(resourceType) && url.includes('ads'));
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}