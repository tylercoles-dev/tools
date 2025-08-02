#!/usr/bin/env node

/**
 * Pre-commit hook for security vulnerability checking
 * Runs npm audit and checks for new security issues
 */

import { SecurityScanner } from '../core/dist/services/quality/scanners/security-scanner.js';
import { execSync } from 'child_process';
import * as fs from 'fs';

const SECURITY_LIMITS = {
  critical: 0, // No critical vulnerabilities allowed
  high: 1,     // Max 1 high severity vulnerability
  medium: 3,   // Max 3 medium severity vulnerabilities
  low: 5       // Max 5 low severity vulnerabilities
};

async function checkSecurity() {
  try {
    console.log('🔒 Running security vulnerability check...');

    // Check if package.json or package-lock.json changed
    const changedFiles = execSync('git diff --cached --name-only', {
      encoding: 'utf-8'
    }).split('\n').filter(file => file.trim());

    const packageFilesChanged = changedFiles.some(file => 
      file === 'package.json' || 
      file === 'package-lock.json' ||
      file.includes('package.json') ||
      file.includes('package-lock.json')
    );

    if (!packageFilesChanged) {
      console.log('✅ No package files changed, skipping security check');
      return true;
    }

    console.log('📦 Package files changed, running security scan...');

    // Quick npm audit check first
    try {
      execSync('npm audit --audit-level=moderate --dry-run', {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      console.log('✅ npm audit: No vulnerabilities found');
    } catch (auditError) {
      // npm audit returns non-zero when vulnerabilities are found
      if (auditError.stdout) {
        try {
          const auditResult = JSON.parse(auditError.stdout);
          if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
            const vulnCounts = auditResult.metadata.vulnerabilities;
            console.log('\n⚠️ npm audit found vulnerabilities:');
            if (vulnCounts.critical) console.log(`  Critical: ${vulnCounts.critical}`);
            if (vulnCounts.high) console.log(`  High: ${vulnCounts.high}`);
            if (vulnCounts.moderate) console.log(`  Moderate: ${vulnCounts.moderate}`);
            if (vulnCounts.low) console.log(`  Low: ${vulnCounts.low}`);

            // Check if critical or high vulnerabilities exist
            if (vulnCounts.critical > 0 || vulnCounts.high > 1) {
              console.error('\n❌ Critical or high severity vulnerabilities found');
              console.error('Run "npm audit fix" to attempt automatic fixes');
              return false;
            }
          }
        } catch (parseError) {
          console.warn('Could not parse npm audit output');
        }
      }
    }

    // Run detailed security scan
    const scanner = new SecurityScanner();
    const vulnerabilities = await scanner.scanProject(process.cwd());

    if (vulnerabilities.length === 0) {
      console.log('✅ No security vulnerabilities found');
      return true;
    }

    // Count vulnerabilities by severity
    const vulnCounts = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length
    };

    console.log('\n📊 Security Vulnerability Summary:');
    console.log(`  Critical: ${vulnCounts.critical} (limit: ${SECURITY_LIMITS.critical})`);
    console.log(`  High:     ${vulnCounts.high} (limit: ${SECURITY_LIMITS.high})`);
    console.log(`  Medium:   ${vulnCounts.medium} (limit: ${SECURITY_LIMITS.medium})`);
    console.log(`  Low:      ${vulnCounts.low} (limit: ${SECURITY_LIMITS.low})`);

    // Check limits
    const violations = [];

    if (vulnCounts.critical > SECURITY_LIMITS.critical) {
      violations.push(`Critical vulnerabilities: ${vulnCounts.critical} > ${SECURITY_LIMITS.critical}`);
    }
    if (vulnCounts.high > SECURITY_LIMITS.high) {
      violations.push(`High vulnerabilities: ${vulnCounts.high} > ${SECURITY_LIMITS.high}`);
    }
    if (vulnCounts.medium > SECURITY_LIMITS.medium) {
      violations.push(`Medium vulnerabilities: ${vulnCounts.medium} > ${SECURITY_LIMITS.medium}`);
    }
    if (vulnCounts.low > SECURITY_LIMITS.low) {
      violations.push(`Low vulnerabilities: ${vulnCounts.low} > ${SECURITY_LIMITS.low}`);
    }

    if (violations.length > 0) {
      console.error('\n❌ Security vulnerability limits exceeded:');
      violations.forEach(violation => console.error(`  - ${violation}`));
      
      console.error('\n🚨 Vulnerabilities found:');
      vulnerabilities
        .filter(v => v.severity === 'critical' || v.severity === 'high')
        .slice(0, 10) // Show top 10
        .forEach(vuln => {
          const severity = vuln.severity.toUpperCase();
          const icon = vuln.severity === 'critical' ? '🚨' : '⚠️';
          console.error(`  ${icon} ${severity}: ${vuln.packageName}@${vuln.version} - ${vuln.title}`);
        });

      console.error('\n💡 To fix:');
      console.error('  1. Run "npm audit fix" to apply automatic fixes');
      console.error('  2. Update vulnerable packages manually');
      console.error('  3. Consider alternative packages for unfixable vulnerabilities');
      console.error('  4. Review package licenses and maintenance status');
      
      return false;
    }

    console.log('\n✅ Security vulnerability check passed');
    return true;

  } catch (error) {
    console.error('❌ Security check failed:', error.message);
    return false;
  }
}

// Run the check
checkSecurity().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});