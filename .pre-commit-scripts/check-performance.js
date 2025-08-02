#!/usr/bin/env node

/**
 * Pre-commit hook for performance budget checking
 * Checks bundle sizes against predefined budgets
 */

import { PerformanceScanner } from '../core/dist/services/quality/scanners/performance-scanner.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PERFORMANCE_CONFIG = {
  budgets: [
    {
      bundleName: 'core',
      type: 'bundle',
      maximumWarning: '500kb',
      maximumError: '1mb',
      paths: ['core/dist/**/*.js']
    },
    {
      bundleName: 'gateway',
      type: 'bundle',
      maximumWarning: '800kb',
      maximumError: '1.5mb',
      paths: ['gateway/dist/**/*.js']
    },
    {
      bundleName: 'web',
      type: 'bundle',
      maximumWarning: '2mb',
      maximumError: '5mb',
      paths: ['web/.next/**/*.js', 'web/dist/**/*.js']
    }
  ]
};

async function checkPerformance() {
  try {
    console.log('⚡ Checking performance budgets...');

    // Check if any build-related files changed
    const changedFiles = execSync('git diff --cached --name-only', {
      encoding: 'utf-8'
    }).split('\n').filter(file => file.trim());

    const buildFilesChanged = changedFiles.some(file => 
      file === 'package.json' || 
      file.includes('package.json') ||
      file.includes('tsup.config.') ||
      file.includes('webpack.config.') ||
      file.includes('vite.config.') ||
      file.includes('next.config.') ||
      file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.js') ||
      file.endsWith('.jsx')
    );

    if (!buildFilesChanged) {
      console.log('✅ No build-affecting files changed, skipping performance check');
      return true;
    }

    console.log('📦 Build-affecting files changed, checking performance...');

    // Check if built files exist
    const builtFilesExist = PERFORMANCE_CONFIG.budgets.some(budget => {
      return budget.paths.some(pattern => {
        // Simple check for common build directories
        const basePath = pattern.split('/**')[0];
        return fs.existsSync(basePath);
      });
    });

    if (!builtFilesExist) {
      console.log('ℹ️ No built files found, attempting quick build check...');
      
      // Try to build core package for size check
      try {
        if (fs.existsSync('core/package.json')) {
          console.log('Building core package...');
          execSync('cd core && npm run build', { 
            stdio: 'pipe',
            timeout: 60000 // 1 minute timeout
          });
        }
      } catch (buildError) {
        console.warn('⚠️ Could not build for performance check, proceeding...');
        return true; // Don't fail the commit for build issues
      }
    }

    const scanner = new PerformanceScanner(PERFORMANCE_CONFIG);
    const budgets = await scanner.scanProject(process.cwd());

    if (budgets.length === 0) {
      console.log('ℹ️ No performance budgets to check');
      return true;
    }

    const violations = budgets.filter(budget => !budget.isCompliant);
    const warnings = budgets.filter(budget => {
      if (budget.isCompliant) return false;
      
      // Check if it exceeds warning but not error threshold
      try {
        const currentSize = parseSize(budget.currentSize);
        const warningSize = parseSize(budget.maximumWarning);
        const errorSize = parseSize(budget.maximumError);
        
        return currentSize > warningSize && currentSize <= errorSize;
      } catch {
        return false;
      }
    });

    const errors = violations.filter(budget => !warnings.includes(budget));

    console.log('\n📊 Performance Budget Summary:');
    console.log(`  Total Budgets: ${budgets.length}`);
    console.log(`  Compliant: ${budgets.length - violations.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log(`  Violations: ${errors.length}`);

    // Show budget details
    budgets.forEach(budget => {
      const status = budget.isCompliant ? '✅' : 
                     warnings.includes(budget) ? '⚠️' : '❌';
      console.log(`  ${status} ${budget.bundleName}: ${budget.currentSize} (max: ${budget.maximumWarning}/${budget.maximumError})`);
    });

    if (errors.length > 0) {
      console.error('\n❌ Performance budget violations (hard limits):');
      errors.forEach(budget => {
        console.error(`  🚨 ${budget.bundleName}: ${budget.currentSize} > ${budget.maximumError}`);
      });

      console.error('\n💡 To fix:');
      console.error('  1. Enable tree shaking and dead code elimination');
      console.error('  2. Implement code splitting and lazy loading');
      console.error('  3. Remove unused dependencies and imports');
      console.error('  4. Compress and optimize assets');
      console.error('  5. Consider bundle analysis tools for deeper insights');
      
      return false;
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ Performance budget warnings:');
      warnings.forEach(budget => {
        console.log(`  ⚡ ${budget.bundleName}: ${budget.currentSize} > ${budget.maximumWarning} (approaching limit)`);
      });
      console.log('\n💡 Consider optimizing these bundles to stay within warning thresholds');
    }

    console.log('\n✅ Performance budget check passed');
    return true;

  } catch (error) {
    console.error('❌ Performance check failed:', error.message);
    // Don't fail the commit for performance check errors
    console.log('⚠️ Continuing with commit due to performance check error');
    return true;
  }
}

function parseSize(sizeStr) {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) throw new Error(`Invalid size format: ${sizeStr}`);
  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
}

// Run the check
checkPerformance().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});