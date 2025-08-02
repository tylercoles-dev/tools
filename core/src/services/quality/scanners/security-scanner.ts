import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { SecurityVulnerability, SeverityLevel } from '../types.js';

export interface SecurityScannerConfig {
  auditLevel: 'low' | 'moderate' | 'high' | 'critical';
  excludePackages: string[];
  autoFix: boolean;
  registries: string[];
  timeout: number;
}

export const DEFAULT_SECURITY_CONFIG: SecurityScannerConfig = {
  auditLevel: 'moderate',
  excludePackages: [],
  autoFix: false,
  registries: ['https://registry.npmjs.org'],
  timeout: 300000 // 5 minutes
};

interface NpmAuditVulnerability {
  id: number;
  title: string;
  severity: string;
  vulnerable_versions: string;
  patched_versions?: string;
  overview: string;
  recommendation: string;
  url: string;
  created: string;
  updated: string;
  cwe: string[];
  cvss: {
    score: number;
    vectorString: string;
  };
}

interface NpmAuditAdvisory {
  id: number;
  title: string;
  module_name: string;
  severity: string;
  overview: string;
  recommendation: string;
  url: string;
  patched_versions: string;
  vulnerable_versions: string;
  cwe: string[];
  cvss: {
    score: number;
    vectorString: string;
  };
}

interface NpmAuditResult {
  auditReportVersion: number;
  vulnerabilities: Record<string, {
    name: string;
    severity: string;
    isDirect: boolean;
    via: (string | NpmAuditAdvisory)[];
    effects: string[];
    range: string;
    nodes: string[];
    fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
  }>;
  metadata: {
    vulnerabilities: Record<string, number>;
    dependencies: number;
    devDependencies: number;
    optionalDependencies: number;
    totalDependencies: number;
  };
}

export class SecurityScanner {
  private config: SecurityScannerConfig;

  constructor(config: Partial<SecurityScannerConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  async scanProject(projectPath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check if package.json exists
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        console.warn(`No package.json found in ${projectPath}`);
        return vulnerabilities;
      }

      console.log('Running npm audit...');
      
      // Run npm audit
      const auditResult = await this.runNpmAudit(projectPath);
      if (auditResult) {
        const npmVulns = this.parseNpmAuditResult(auditResult);
        vulnerabilities.push(...npmVulns);
      }

      // Check for license compliance
      const licenseIssues = await this.checkLicenseCompliance(projectPath);
      vulnerabilities.push(...licenseIssues);

      // Check for known malicious packages
      const maliciousPackages = await this.checkMaliciousPackages(projectPath);
      vulnerabilities.push(...maliciousPackages);

      console.log(`Found ${vulnerabilities.length} security issues`);
      return vulnerabilities;

    } catch (error) {
      console.error('Security scan failed:', error);
      return vulnerabilities;
    }
  }

  private async runNpmAudit(projectPath: string): Promise<NpmAuditResult | null> {
    try {
      const auditCommand = `npm audit --json --audit-level=${this.config.auditLevel}`;
      
      const result = execSync(auditCommand, {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: this.config.timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return JSON.parse(result) as NpmAuditResult;
    } catch (error: any) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout) as NpmAuditResult;
        } catch (parseError) {
          console.warn('Failed to parse npm audit output:', parseError);
        }
      }
      
      console.warn('npm audit failed:', error.message);
      return null;
    }
  }

  private parseNpmAuditResult(auditResult: NpmAuditResult): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities)) {
      if (this.config.excludePackages.includes(packageName)) {
        continue;
      }

      for (const via of vulnData.via) {
        if (typeof via === 'object') {
          const severity = this.mapNpmSeverityToOurs(via.severity);
          
          vulnerabilities.push({
            id: '', // Will be set by database
            packageName,
            version: vulnData.range,
            vulnerabilityId: via.id.toString(),
            severity,
            title: via.title,
            description: via.overview,
            solution: via.recommendation,
            detectedAt: new Date().toISOString(),
            falsePositive: false
          });
        }
      }
    }

    return vulnerabilities;
  }

  private mapNpmSeverityToOurs(npmSeverity: string): SeverityLevel {
    switch (npmSeverity.toLowerCase()) {
      case 'info':
        return 'low';
      case 'low':
        return 'low';
      case 'moderate':
        return 'medium';
      case 'high':
        return 'high';
      case 'critical':
        return 'critical';
      default:
        return 'medium';
    }
  }

  private async checkLicenseCompliance(projectPath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    try {
      // Get license information for all packages
      const licensesResult = execSync('npm ls --json --depth=0', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const licensesData = JSON.parse(licensesResult);
      const problematicLicenses = ['GPL-3.0', 'GPL-2.0', 'AGPL-3.0', 'AGPL-1.0'];

      // Check dependencies
      if (licensesData.dependencies) {
        for (const [packageName, packageInfo] of Object.entries(licensesData.dependencies as any)) {
          if (packageInfo && typeof packageInfo === 'object' && 'license' in packageInfo) {
            const license = packageInfo.license as string;
            const version = 'version' in packageInfo ? (packageInfo.version as string) : 'unknown';
            if (problematicLicenses.some(problematic => license?.includes(problematic))) {
              vulnerabilities.push({
                id: '',
                packageName,
                version,
                vulnerabilityId: `license-${packageName}`,
                severity: 'medium',
                title: `Potentially problematic license: ${license}`,
                description: `Package ${packageName} uses license ${license} which may have compliance implications`,
                solution: 'Review license terms and consider alternative packages',
                detectedAt: new Date().toISOString(),
                falsePositive: false
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('License compliance check failed:', error);
    }

    return vulnerabilities;
  }

  private async checkMaliciousPackages(projectPath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Known patterns of malicious packages
      const suspiciousPatterns = [
        /^discord[\.-]?token/i,
        /^npm[\.-]?stealer/i,
        /^password[\.-]?stealer/i,
        /^cookie[\.-]?stealer/i,
        /^electron[\.-]?stealer/i,
        /fake[\.-]?/i
      ];

      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.optionalDependencies,
        ...packageJson.peerDependencies
      };

      for (const [packageName, version] of Object.entries(allDependencies)) {
        if (suspiciousPatterns.some(pattern => pattern.test(packageName))) {
          vulnerabilities.push({
            id: '',
            packageName,
            version: version as string,
            vulnerabilityId: `malicious-${packageName}`,
            severity: 'critical',
            title: `Potentially malicious package: ${packageName}`,
            description: `Package ${packageName} matches patterns associated with malicious packages`,
            solution: 'Remove this package and find a trusted alternative',
            detectedAt: new Date().toISOString(),
            falsePositive: false
          });
        }
      }
    } catch (error) {
      console.warn('Malicious package check failed:', error);
    }

    return vulnerabilities;
  }

  async fixVulnerabilities(projectPath: string, autoFix: boolean = false): Promise<{
    fixed: number;
    manualReviewRequired: SecurityVulnerability[];
  }> {
    if (!autoFix && !this.config.autoFix) {
      return {
        fixed: 0,
        manualReviewRequired: await this.scanProject(projectPath)
      };
    }

    let fixed = 0;
    try {
      console.log('Attempting to auto-fix security vulnerabilities...');
      
      const result = execSync('npm audit fix --json', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: this.config.timeout
      });

      const fixResult = JSON.parse(result);
      fixed = fixResult.meta?.fixed || 0;
      
      console.log(`Auto-fixed ${fixed} vulnerabilities`);
    } catch (error: any) {
      console.warn('Auto-fix failed:', error.message);
    }

    const remainingVulnerabilities = await this.scanProject(projectPath);
    
    return {
      fixed,
      manualReviewRequired: remainingVulnerabilities
    };
  }

  async generateSecurityReport(vulnerabilities: SecurityVulnerability[]): Promise<{
    summary: {
      total: number;
      bySeverity: Record<SeverityLevel, number>;
      byPackage: Record<string, number>;
      criticalPackages: string[];
    };
    recommendations: Array<{
      priority: SeverityLevel;
      action: string;
      packages: string[];
      description: string;
    }>;
  }> {
    const summary = {
      total: vulnerabilities.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<SeverityLevel, number>,
      byPackage: {} as Record<string, number>,
      criticalPackages: [] as string[]
    };

    const packageVulns = new Map<string, SecurityVulnerability[]>();

    // Aggregate statistics
    for (const vuln of vulnerabilities) {
      summary.bySeverity[vuln.severity]++;
      summary.byPackage[vuln.packageName] = (summary.byPackage[vuln.packageName] || 0) + 1;
      
      if (vuln.severity === 'critical' && !summary.criticalPackages.includes(vuln.packageName)) {
        summary.criticalPackages.push(vuln.packageName);
      }

      if (!packageVulns.has(vuln.packageName)) {
        packageVulns.set(vuln.packageName, []);
      }
      packageVulns.get(vuln.packageName)!.push(vuln);
    }

    // Generate recommendations
    const recommendations = [];

    if (summary.bySeverity.critical > 0) {
      recommendations.push({
        priority: 'critical' as SeverityLevel,
        action: 'Immediate Update Required',
        packages: summary.criticalPackages,
        description: 'These packages have critical security vulnerabilities that need immediate attention'
      });
    }

    if (summary.bySeverity.high > 0) {
      const highSeverityPackages = Array.from(packageVulns.entries())
        .filter(([_, vulns]) => vulns.some(v => v.severity === 'high'))
        .map(([pkg, _]) => pkg);
      
      recommendations.push({
        priority: 'high' as SeverityLevel,
        action: 'Update Within 7 Days',
        packages: highSeverityPackages,
        description: 'These packages have high severity vulnerabilities that should be updated soon'
      });
    }

    if (summary.bySeverity.medium > 0) {
      recommendations.push({
        priority: 'medium' as SeverityLevel,
        action: 'Schedule Updates',
        packages: Object.keys(summary.byPackage),
        description: 'Plan updates for these packages in the next sprint cycle'
      });
    }

    return { summary, recommendations };
  }

  async generateHTMLSecurityReport(vulnerabilities: SecurityVulnerability[], outputPath: string): Promise<void> {
    const report = await this.generateSecurityReport(vulnerabilities);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Vulnerability Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .alert { padding: 15px; border-radius: 8px; margin: 10px 0; }
        .alert.critical { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .alert.high { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .alert.medium { background: #cce5ff; border: 1px solid #b3d9ff; color: #004085; }
        .alert.low { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-card { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #6c757d; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #495057; }
        .vuln-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #dee2e6; }
        .vuln-item.critical { border-left-color: #721c24; }
        .vuln-item.high { border-left-color: #dc3545; }
        .vuln-item.medium { border-left-color: #fd7e14; }
        .vuln-item.low { border-left-color: #198754; }
        .package-name { font-weight: bold; color: #495057; }
        .vuln-id { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Vulnerability Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    ${report.summary.total === 0 ? `
        <div class="alert low">
            <h3>✅ No Security Vulnerabilities Found</h3>
            <p>Your project appears to be free of known security vulnerabilities.</p>
        </div>
    ` : ''}

    <div class="summary-grid">
        <div class="summary-card">
            <h3>Total Vulnerabilities</h3>
            <div class="value">${report.summary.total}</div>
        </div>
        <div class="summary-card">
            <h3>Critical</h3>
            <div class="value" style="color: #721c24;">${report.summary.bySeverity.critical}</div>
        </div>
        <div class="summary-card">
            <h3>High</h3>
            <div class="value" style="color: #dc3545;">${report.summary.bySeverity.high}</div>
        </div>
        <div class="summary-card">
            <h3>Medium</h3>
            <div class="value" style="color: #fd7e14;">${report.summary.bySeverity.medium}</div>
        </div>
        <div class="summary-card">
            <h3>Low</h3>
            <div class="value" style="color: #198754;">${report.summary.bySeverity.low}</div>
        </div>
    </div>

    ${report.recommendations.length > 0 ? `
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="alert ${rec.priority}">
                <h3>${rec.action}</h3>
                <p>${rec.description}</p>
                <p><strong>Affected packages:</strong> ${rec.packages.join(', ')}</p>
            </div>
        `).join('')}
    ` : ''}

    ${vulnerabilities.length > 0 ? `
        <h2>Vulnerability Details</h2>
        ${vulnerabilities.map(vuln => `
            <div class="vuln-item ${vuln.severity}">
                <div class="package-name">${vuln.packageName} (${vuln.version})</div>
                <div><strong>${vuln.title}</strong></div>
                <div>ID: <span class="vuln-id">${vuln.vulnerabilityId}</span> | Severity: <strong>${vuln.severity.toUpperCase()}</strong></div>
                <p>${vuln.description}</p>
                ${vuln.solution ? `<p><strong>Solution:</strong> ${vuln.solution}</p>` : ''}
                <div><small>Detected: ${new Date(vuln.detectedAt).toLocaleString()}</small></div>
            </div>
        `).join('')}
    ` : ''}
</body>
</html>
    `;

    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`Security report generated: ${outputPath}`);
  }
}