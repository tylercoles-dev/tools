#!/usr/bin/env node

/**
 * Pre-commit hook for checking technical debt
 * Scans staged files for TODO/FIXME/HACK comments and enforces limits
 */

import { TechnicalDebtScanner } from '../core/dist/services/quality/scanners/technical-debt-scanner.js';
import { execSync } from 'child_process';
import * as fs from 'fs';

const DEBT_LIMITS = {
  critical: 0, // No critical debt allowed in commits
  high: 2,     // Max 2 high severity items per commit
  medium: 5,   // Max 5 medium severity items per commit
  low: 10      // Max 10 low severity items per commit
};

async function checkTechnicalDebt() {
  try {
    console.log('🔍 Scanning for technical debt in staged files...');

    // Get list of staged files
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=AM', {
      encoding: 'utf-8'
    }).split('\n').filter(file => file.trim() && 
      (file.endsWith('.ts') || file.endsWith('.tsx') || 
       file.endsWith('.js') || file.endsWith('.jsx'))
    );

    if (stagedFiles.length === 0) {
      console.log('✅ No TypeScript/JavaScript files staged');
      return true;
    }

    console.log(`Scanning ${stagedFiles.length} staged files...`);

    const scanner = new TechnicalDebtScanner();
    const allDebtItems = [];

    // Scan each staged file
    for (const filePath of stagedFiles) {
      if (fs.existsSync(filePath)) {
        const debtItems = await scanner.scanFile(filePath);
        allDebtItems.push(...debtItems);
      }
    }

    if (allDebtItems.length === 0) {
      console.log('✅ No technical debt found in staged files');
      return true;
    }

    // Count debt by severity
    const debtCounts = {
      critical: allDebtItems.filter(item => item.severity === 'critical').length,
      high: allDebtItems.filter(item => item.severity === 'high').length,
      medium: allDebtItems.filter(item => item.severity === 'medium').length,
      low: allDebtItems.filter(item => item.severity === 'low').length
    };

    console.log('\n📊 Technical Debt Summary:');
    console.log(`  Critical: ${debtCounts.critical} (limit: ${DEBT_LIMITS.critical})`);
    console.log(`  High:     ${debtCounts.high} (limit: ${DEBT_LIMITS.high})`);
    console.log(`  Medium:   ${debtCounts.medium} (limit: ${DEBT_LIMITS.medium})`);
    console.log(`  Low:      ${debtCounts.low} (limit: ${DEBT_LIMITS.low})`);

    // Check limits
    const violations = [];

    if (debtCounts.critical > DEBT_LIMITS.critical) {
      violations.push(`Critical debt: ${debtCounts.critical} > ${DEBT_LIMITS.critical}`);
    }
    if (debtCounts.high > DEBT_LIMITS.high) {
      violations.push(`High debt: ${debtCounts.high} > ${DEBT_LIMITS.high}`);
    }
    if (debtCounts.medium > DEBT_LIMITS.medium) {
      violations.push(`Medium debt: ${debtCounts.medium} > ${DEBT_LIMITS.medium}`);
    }
    if (debtCounts.low > DEBT_LIMITS.low) {
      violations.push(`Low debt: ${debtCounts.low} > ${DEBT_LIMITS.low}`);
    }

    if (violations.length > 0) {
      console.error('\n❌ Technical debt limits exceeded:');
      violations.forEach(violation => console.error(`  - ${violation}`));
      
      console.error('\n🔍 Technical debt items found:');
      allDebtItems.forEach(item => {
        const severity = item.severity.toUpperCase();
        const icon = item.severity === 'critical' ? '🚨' : 
                     item.severity === 'high' ? '⚠️' : 
                     item.severity === 'medium' ? '⚡' : 'ℹ️';
        console.error(`  ${icon} ${severity}: ${item.filePath}:${item.lineNumber} - ${item.message}`);
      });

      console.error('\n💡 To fix:');
      console.error('  1. Resolve or remove the technical debt items');
      console.error('  2. Consider breaking down complex changes');
      console.error('  3. Create issues for items that need later attention');
      
      return false;
    }

    console.log('\n✅ Technical debt check passed');
    return true;

  } catch (error) {
    console.error('❌ Technical debt check failed:', error.message);
    return false;
  }
}

// Run the check
checkTechnicalDebt().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});