/**
 * Cross-Browser Compatibility Test Reporter
 * 
 * Custom Playwright reporter that provides detailed insights into cross-browser
 * test results, compatibility issues, and browser-specific failures.
 */

import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface BrowserTestResult {
  browser: string;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  failures: TestFailure[];
}

interface TestFailure {
  testTitle: string;
  testPath: string;
  error: string;
  stack?: string;
  screenshot?: string;
}

interface CompatibilityIssue {
  feature: string;
  affectedBrowsers: string[];
  description: string;
  severity: 'critical' | 'major' | 'minor';
  workaround?: string;
}

class CrossBrowserReporter implements Reporter {
  private startTime: number = 0;
  private browserResults: Map<string, BrowserTestResult> = new Map();
  private compatibilityIssues: CompatibilityIssue[] = [];
  private totalTests: number = 0;

  onBegin() {
    this.startTime = Date.now();
    console.log('\n🌐 Cross-Browser Compatibility Testing Started\n');
    console.log('Testing across browsers: Chrome, Firefox, Safari, Edge, Mobile Chrome, Mobile Safari\n');
  }

  onTestBegin(test: TestCase, result: TestResult) {
    this.totalTests++;
    const browser = this.extractBrowserFromProject(test.parent.project()?.name || 'unknown');
    
    if (!this.browserResults.has(browser)) {
      this.browserResults.set(browser, {
        browser,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        duration: 0,
        failures: []
      });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const browser = this.extractBrowserFromProject(test.parent.project()?.name || 'unknown');
    const browserResult = this.browserResults.get(browser);
    
    if (!browserResult) return;

    browserResult.duration += result.duration || 0;

    switch (result.status) {
      case 'passed':
        browserResult.passed++;
        break;
      case 'failed':
        browserResult.failed++;
        browserResult.failures.push({
          testTitle: test.title,
          testPath: test.location?.file || '',
          error: result.error?.message || 'Unknown error',
          stack: result.error?.stack,
          screenshot: this.extractScreenshotPath(result)
        });
        this.analyzeCompatibilityIssue(test, result, browser);
        break;
      case 'skipped':
        browserResult.skipped++;
        break;
      case 'timedOut':
        browserResult.failed++;
        browserResult.failures.push({
          testTitle: test.title,
          testPath: test.location?.file || '',
          error: 'Test timed out',
        });
        break;
    }

    if (result.retry > 0 && result.status === 'passed') {
      browserResult.flaky++;
    }
  }

  onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 Cross-Browser Compatibility Test Results\n');
    console.log('='.repeat(80));
    
    this.printBrowserSummary();
    this.printCompatibilityMatrix();
    this.printCompatibilityIssues();
    this.printPerformanceComparison();
    this.generateJsonReport();
    this.generateHtmlReport();
    
    console.log(`\n⏱️  Total execution time: ${this.formatDuration(duration)}`);
    console.log(`📝 Detailed reports generated in test-results/cross-browser/`);
    console.log('='.repeat(80));
  }

  private extractBrowserFromProject(projectName: string): string {
    const browserMap: Record<string, string> = {
      'chrome-desktop': 'Chrome',
      'chrome-desktop-headless': 'Chrome (Headless)',
      'firefox-desktop': 'Firefox',
      'firefox-esr': 'Firefox ESR',
      'safari-desktop': 'Safari',
      'edge-desktop': 'Edge',
      'chrome-mobile-android': 'Chrome Mobile',
      'samsung-internet-mobile': 'Samsung Internet',
      'safari-mobile-ios': 'Safari Mobile',
      'safari-mobile-ipad': 'Safari iPad'
    };

    return browserMap[projectName] || projectName;
  }

  private extractScreenshotPath(result: TestResult): string | undefined {
    const attachment = result.attachments.find(a => a.name === 'screenshot');
    return attachment?.path;
  }

  private analyzeCompatibilityIssue(test: TestCase, result: TestResult, browser: string) {
    const error = result.error?.message || '';
    
    // Common cross-browser compatibility issues
    const issues = [
      {
        pattern: /CSS.*not.*supported|property.*not.*recognized/i,
        feature: 'CSS Properties',
        severity: 'major' as const,
        description: 'CSS property not supported in this browser'
      },
      {
        pattern: /WebSocket|EventSource|fetch.*not.*defined/i,
        feature: 'Web APIs',
        severity: 'critical' as const,
        description: 'Modern Web API not available'
      },
      {
        pattern: /drag.*drop|DragEvent.*not.*defined/i,
        feature: 'Drag and Drop',
        severity: 'major' as const,
        description: 'Drag and drop functionality not working'
      },
      {
        pattern: /localStorage|sessionStorage.*not.*defined/i,
        feature: 'Web Storage',
        severity: 'critical' as const,
        description: 'Web storage APIs not available'
      },
      {
        pattern: /Notification.*not.*defined|Push.*not.*supported/i,
        feature: 'Notifications',
        severity: 'minor' as const,
        description: 'Notification APIs not supported'
      }
    ];

    for (const issue of issues) {
      if (issue.pattern.test(error)) {
        const existingIssue = this.compatibilityIssues.find(i => i.feature === issue.feature);
        if (existingIssue) {
          if (!existingIssue.affectedBrowsers.includes(browser)) {
            existingIssue.affectedBrowsers.push(browser);
          }
        } else {
          this.compatibilityIssues.push({
            feature: issue.feature,
            affectedBrowsers: [browser],
            description: issue.description,
            severity: issue.severity
          });
        }
        break;
      }
    }
  }

  private printBrowserSummary() {
    console.log('Browser Test Results:');
    console.log('-'.repeat(80));
    
    const headers = ['Browser', 'Passed', 'Failed', 'Skipped', 'Flaky', 'Success Rate'];
    const columnWidths = [20, 8, 8, 8, 8, 12];
    
    // Print header
    const headerRow = headers.map((header, i) => header.padEnd(columnWidths[i])).join(' | ');
    console.log(headerRow);
    console.log('-'.repeat(headerRow.length));
    
    // Print browser results
    for (const [browser, result] of this.browserResults) {
      const total = result.passed + result.failed + result.skipped;
      const successRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) + '%' : '0%';
      
      const row = [
        browser.padEnd(columnWidths[0]),
        result.passed.toString().padEnd(columnWidths[1]),
        result.failed.toString().padEnd(columnWidths[2]),
        result.skipped.toString().padEnd(columnWidths[3]),
        result.flaky.toString().padEnd(columnWidths[4]),
        successRate.padEnd(columnWidths[5])
      ].join(' | ');
      
      console.log(row);
    }
    console.log();
  }

  private printCompatibilityMatrix() {
    if (this.browserResults.size === 0) return;

    console.log('Cross-Browser Compatibility Matrix:');
    console.log('-'.repeat(50));
    
    const browsers = Array.from(this.browserResults.keys());
    const testCategories = ['Auth', 'Kanban', 'Wiki', 'Real-time', 'Mobile'];
    
    // Simple compatibility matrix
    console.log('Feature'.padEnd(15) + browsers.map(b => b.slice(0, 8).padEnd(10)).join(''));
    console.log('-'.repeat(15 + browsers.length * 10));
    
    testCategories.forEach(category => {
      const row = category.padEnd(15) + browsers.map(browser => {
        const result = this.browserResults.get(browser);
        const status = result && result.failed === 0 ? '✅' : result && result.failed > 0 ? '❌' : '⚠️';
        return status.padEnd(10);
      }).join('');
      console.log(row);
    });
    console.log();
  }

  private printCompatibilityIssues() {
    if (this.compatibilityIssues.length === 0) {
      console.log('✅ No cross-browser compatibility issues detected!\n');
      return;
    }

    console.log('🚨 Cross-Browser Compatibility Issues:');
    console.log('-'.repeat(50));
    
    this.compatibilityIssues.forEach((issue, index) => {
      const severityIcon = {
        critical: '🔴',
        major: '🟡',
        minor: '🟢'
      }[issue.severity];
      
      console.log(`${index + 1}. ${severityIcon} ${issue.feature}`);
      console.log(`   Affected browsers: ${issue.affectedBrowsers.join(', ')}`);
      console.log(`   Description: ${issue.description}`);
      if (issue.workaround) {
        console.log(`   Workaround: ${issue.workaround}`);
      }
      console.log();
    });
  }

  private printPerformanceComparison() {
    console.log('Performance Comparison:');
    console.log('-'.repeat(30));
    
    const sortedBrowsers = Array.from(this.browserResults.entries())
      .sort(([,a], [,b]) => a.duration - b.duration);
    
    sortedBrowsers.forEach(([browser, result], index) => {
      const avgDuration = result.duration / Math.max(result.passed + result.failed, 1);
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      console.log(`${rank} ${browser}: ${this.formatDuration(avgDuration)} avg per test`);
    });
    console.log();
  }

  private generateJsonReport() {
    const reportDir = path.join('test-results', 'cross-browser');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.totalTests,
        totalBrowsers: this.browserResults.size,
        totalIssues: this.compatibilityIssues.length
      },
      browserResults: Object.fromEntries(this.browserResults),
      compatibilityIssues: this.compatibilityIssues,
      metadata: {
        testType: 'cross-browser-compatibility',
        reportVersion: '1.0.0'
      }
    };

    fs.writeFileSync(
      path.join(reportDir, 'compatibility-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  private generateHtmlReport() {
    const reportDir = path.join('test-results', 'cross-browser');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const html = this.generateHtmlContent();
    fs.writeFileSync(path.join(reportDir, 'compatibility-report.html'), html);
  }

  private generateHtmlContent(): string {
    const browserResultsJson = JSON.stringify(Object.fromEntries(this.browserResults));
    const compatibilityIssuesJson = JSON.stringify(this.compatibilityIssues);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cross-Browser Compatibility Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #2563eb; }
        .browser-results { margin-bottom: 40px; }
        .browser-card { margin-bottom: 20px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 6px; }
        .success { border-left: 4px solid #10b981; }
        .warning { border-left: 4px solid #f59e0b; }
        .error { border-left: 4px solid #ef4444; }
        .issues { margin-top: 40px; }
        .issue { margin-bottom: 20px; padding: 20px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; }
        .issue.minor { background: #f0fdf4; border-left-color: #22c55e; }
        .issue.major { background: #fffbeb; border-left-color: #f59e0b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Cross-Browser Compatibility Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${this.totalTests}</div>
                <div>Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.browserResults.size}</div>
                <div>Browsers Tested</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.compatibilityIssues.length}</div>
                <div>Compatibility Issues</div>
            </div>
        </div>

        <div class="browser-results">
            <h2>Browser Test Results</h2>
            <div id="browser-results-container"></div>
        </div>

        <div class="issues">
            <h2>Compatibility Issues</h2>
            <div id="issues-container"></div>
        </div>
    </div>

    <script>
        const browserResults = ${browserResultsJson};
        const compatibilityIssues = ${compatibilityIssuesJson};

        // Render browser results
        const browserContainer = document.getElementById('browser-results-container');
        Object.entries(browserResults).forEach(([browser, result]) => {
            const total = result.passed + result.failed + result.skipped;
            const successRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : 0;
            const status = result.failed === 0 ? 'success' : result.failed > result.passed ? 'error' : 'warning';
            
            const card = document.createElement('div');
            card.className = \`browser-card \${status}\`;
            card.innerHTML = \`
                <h3>\${browser}</h3>
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-top: 15px;">
                    <div><strong>\${result.passed}</strong><br>Passed</div>
                    <div><strong>\${result.failed}</strong><br>Failed</div>
                    <div><strong>\${result.skipped}</strong><br>Skipped</div>
                    <div><strong>\${result.flaky}</strong><br>Flaky</div>
                    <div><strong>\${successRate}%</strong><br>Success Rate</div>
                </div>
            \`;
            browserContainer.appendChild(card);
        });

        // Render compatibility issues
        const issuesContainer = document.getElementById('issues-container');
        if (compatibilityIssues.length === 0) {
            issuesContainer.innerHTML = '<p style="color: #10b981; font-weight: bold;">✅ No compatibility issues detected!</p>';
        } else {
            compatibilityIssues.forEach(issue => {
                const issueDiv = document.createElement('div');
                issueDiv.className = \`issue \${issue.severity}\`;
                issueDiv.innerHTML = \`
                    <h3>\${issue.feature}</h3>
                    <p><strong>Affected browsers:</strong> \${issue.affectedBrowsers.join(', ')}</p>
                    <p><strong>Description:</strong> \${issue.description}</p>
                    \${issue.workaround ? \`<p><strong>Workaround:</strong> \${issue.workaround}</p>\` : ''}
                \`;
                issuesContainer.appendChild(issueDiv);
            });
        }
    </script>
</body>
</html>`;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

export default CrossBrowserReporter;