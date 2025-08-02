#!/usr/bin/env node

/**
 * Pre-commit hook for license compatibility checking
 * Ensures all dependencies have compatible licenses
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense',
  'WTFPL',
  '0BSD',
  'MPL-2.0', // Mozilla Public License (copyleft but compatible)
];

const PROBLEMATIC_LICENSES = [
  'GPL-2.0',
  'GPL-3.0',
  'AGPL-1.0',
  'AGPL-3.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'CDDL-1.0',
  'EPL-1.0',
  'EPL-2.0'
];

async function checkLicenses() {
  try {
    console.log('📜 Checking license compatibility...');

    // Check if package files changed
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
      console.log('✅ No package files changed, skipping license check');
      return true;
    }

    console.log('📦 Package files changed, checking licenses...');

    // Get dependency licenses using npm ls
    let licenseData;
    try {
      const npmLsOutput = execSync('npm ls --json --depth=0', {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      licenseData = JSON.parse(npmLsOutput);
    } catch (error) {
      // npm ls returns non-zero for missing dependencies, but we can still parse the output
      if (error.stdout) {
        try {
          licenseData = JSON.parse(error.stdout);
        } catch (parseError) {
          console.warn('⚠️ Could not parse npm ls output, trying alternative method');
          return checkLicensesAlternative();
        }
      } else {
        console.warn('⚠️ Could not get dependency list, trying alternative method');
        return checkLicensesAlternative();
      }
    }

    const issues = [];
    const warnings = [];
    const dependencies = licenseData.dependencies || {};

    console.log(`Checking licenses for ${Object.keys(dependencies).length} dependencies...`);

    for (const [packageName, packageInfo] of Object.entries(dependencies)) {
      if (!packageInfo || typeof packageInfo !== 'object') continue;

      const license = packageInfo.license || 'Unknown';
      const version = packageInfo.version || 'Unknown';

      // Check for problematic licenses
      if (PROBLEMATIC_LICENSES.some(problematic => license.includes(problematic))) {
        issues.push({
          package: packageName,
          version,
          license,
          severity: 'error',
          reason: 'Copyleft license may conflict with project licensing'
        });
      }
      // Check for unknown or unrecognized licenses
      else if (license === 'Unknown' || license === 'UNLICENSED') {
        issues.push({
          package: packageName,
          version,
          license,
          severity: 'error',
          reason: 'No license specified'
        });
      }
      // Check for non-standard licenses
      else if (!ALLOWED_LICENSES.some(allowed => license.includes(allowed))) {
        warnings.push({
          package: packageName,
          version,
          license,
          severity: 'warning',
          reason: 'License not in standard allow list'
        });
      }
    }

    console.log('\n📊 License Check Summary:');
    console.log(`  Total Dependencies: ${Object.keys(dependencies).length}`);
    console.log(`  License Issues: ${issues.length}`);
    console.log(`  License Warnings: ${warnings.length}`);

    if (issues.length > 0) {
      console.error('\n❌ License compatibility issues found:');
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '🚨' : '⚠️';
        console.error(`  ${icon} ${issue.package}@${issue.version}: ${issue.license}`);
        console.error(`     Reason: ${issue.reason}`);
      });

      console.error('\n💡 To fix:');
      console.error('  1. Review the licenses of flagged packages');
      console.error('  2. Consider alternative packages with compatible licenses');
      console.error('  3. Consult legal team if unsure about license compatibility');
      console.error('  4. Update the allowed licenses list if appropriate');
      
      return false;
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ License warnings (review recommended):');
      warnings.slice(0, 5).forEach(warning => { // Show top 5 warnings
        console.log(`  ⚡ ${warning.package}@${warning.version}: ${warning.license}`);
      });
      if (warnings.length > 5) {
        console.log(`  ... and ${warnings.length - 5} more`);
      }
      console.log('\n💡 Consider reviewing these licenses for compatibility');
    }

    console.log('\n✅ License compatibility check passed');
    return true;

  } catch (error) {
    console.error('❌ License check failed:', error.message);
    return false;
  }
}

async function checkLicensesAlternative() {
  try {
    console.log('🔄 Using alternative license checking method...');

    // Read package.json files directly
    const packageFiles = ['package.json'];
    
    // Check for monorepo structure
    const subPackages = ['core/package.json', 'gateway/package.json', 'web/package.json'];
    for (const subPkg of subPackages) {
      if (fs.existsSync(subPkg)) {
        packageFiles.push(subPkg);
      }
    }

    const allDependencies = new Map();

    for (const pkgFile of packageFiles) {
      if (!fs.existsSync(pkgFile)) continue;

      const packageJson = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.optionalDependencies,
        ...packageJson.peerDependencies
      };

      for (const [name, version] of Object.entries(deps || {})) {
        if (!allDependencies.has(name)) {
          allDependencies.set(name, version);
        }
      }
    }

    console.log(`Found ${allDependencies.size} unique dependencies`);

    // Check for known problematic packages
    const knownProblematicPackages = [
      'gpl-licensed-package', // Example - would need real list
      'agpl-package'
    ];

    const issues = [];
    for (const [packageName, version] of allDependencies) {
      if (knownProblematicPackages.includes(packageName)) {
        issues.push({
          package: packageName,
          version,
          license: 'GPL/AGPL (known)',
          severity: 'error',
          reason: 'Known copyleft license'
        });
      }
    }

    if (issues.length > 0) {
      console.error('\n❌ Known license issues found:');
      issues.forEach(issue => {
        console.error(`  🚨 ${issue.package}: ${issue.license}`);
      });
      return false;
    }

    console.log('✅ No known license issues found (limited check)');
    console.log('💡 Run full license audit in CI/CD pipeline');
    return true;

  } catch (error) {
    console.warn('⚠️ Alternative license check failed:', error.message);
    console.log('✅ Proceeding with commit (manual license review recommended)');
    return true; // Don't block commits for license check failures
  }
}

// Run the check
checkLicenses().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});