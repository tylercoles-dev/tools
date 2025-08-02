#!/usr/bin/env node

/**
 * MCP Tools Quality Scanner CLI
 * Command-line tool for running comprehensive quality scans
 */

import { QualityService } from '../core/dist/services/quality/service.js';
import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_CONFIG = {
  projectPath: process.cwd(),
  projectName: 'mcp-tools',
  scanners: {
    technicalDebt: { 
      enabled: true,
      patterns: {
        todo: ['TODO', 'todo', 'To-do', 'TO-DO'],
        fixme: ['FIXME', 'fixme', 'FIX-ME'],
        hack: ['HACK', 'hack', 'KLUDGE', 'kludge'],
        xxx: ['XXX', 'xxx', '!!!'],
        note: ['NOTE', 'note', 'NOTICE'],
        optimize: ['OPTIMIZE', 'optimize', 'PERF', 'PERFORMANCE']
      },
      excludeFiles: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/*.min.js',
        '**/*.map'
      ],
      severityMappings: {
        'TODO': 'low',
        'FIXME': 'high',
        'HACK': 'medium',
        'XXX': 'critical',
        'NOTE': 'low',
        'OPTIMIZE': 'medium'
      }
    },
    security: { 
      enabled: true,
      auditLevel: 'moderate',
      excludePackages: [],
      autoFix: false
    },
    performance: { 
      enabled: true,
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
    },
    complexity: { 
      enabled: true,
      cyclomaticThreshold: 10,
      cognitiveThreshold: 15,
      excludeFiles: [
        '**/*.test.ts',
        '**/*.test.js',
        '**/*.spec.ts',
        '**/*.spec.js'
      ]
    }
  },
  reportOutputDir: './reports'
};

program
  .name('quality-scan')
  .description('MCP Tools Quality Scanner - Comprehensive code quality analysis')
  .version('1.0.0');

program
  .command('scan')
  .description('Run comprehensive quality scan')
  .option('-p, --project-path <path>', 'Project path to scan', process.cwd())
  .option('-n, --project-name <name>', 'Project name', 'mcp-tools')
  .option('-o, --output <dir>', 'Output directory for reports', './reports')
  .option('-c, --config <file>', 'Configuration file path')
  .option('--no-technical-debt', 'Skip technical debt scanning')
  .option('--no-security', 'Skip security scanning')
  .option('--no-performance', 'Skip performance scanning')
  .option('--no-complexity', 'Skip complexity scanning')
  .option('--html', 'Generate HTML reports', true)
  .option('--json', 'Generate JSON reports')
  .option('--ci', 'CI mode - exit with error code on quality issues')
  .action(async (options) => {
    try {
      console.log('🚀 Starting MCP Tools Quality Scan...');
      console.log(`📁 Project: ${options.projectName} (${options.projectPath})`);
      console.log(`📊 Reports: ${options.output}`);

      // Load configuration
      let config = DEFAULT_CONFIG;
      if (options.config && fs.existsSync(options.config)) {
        const userConfig = JSON.parse(fs.readFileSync(options.config, 'utf-8'));
        config = { ...config, ...userConfig };
      }

      // Override config with CLI options
      config.projectPath = options.projectPath;
      config.projectName = options.projectName;
      config.reportOutputDir = options.output;
      config.scanners.technicalDebt.enabled = options.technicalDebt;
      config.scanners.security.enabled = options.security;
      config.scanners.performance.enabled = options.performance;
      config.scanners.complexity.enabled = options.complexity;

      // Ensure output directory exists
      if (!fs.existsSync(config.reportOutputDir)) {
        fs.mkdirSync(config.reportOutputDir, { recursive: true });
      }

      // Initialize quality service
      const qualityService = new QualityService(config);

      console.log('\n📋 Scan Configuration:');
      console.log(`  Technical Debt: ${config.scanners.technicalDebt.enabled ? '✅' : '❌'}`);
      console.log(`  Security: ${config.scanners.security.enabled ? '✅' : '❌'}`);
      console.log(`  Performance: ${config.scanners.performance.enabled ? '✅' : '❌'}`);
      console.log(`  Complexity: ${config.scanners.complexity.enabled ? '✅' : '❌'}`);

      // Run full scan
      const report = await qualityService.runFullScan();

      // Display results
      console.log('\n📊 Quality Scan Results:');
      console.log('═'.repeat(50));
      console.log(`Overall Score: ${report.overall.qualityScore}/100`);
      console.log(`Grade: ${report.overall.grade}`);
      console.log(`Trend: ${report.overall.trend}`);
      console.log('═'.repeat(50));

      console.log('\n📝 Technical Debt:');
      console.log(`  Total Items: ${report.technicalDebt.totalItems}`);
      console.log(`  New Items: ${report.technicalDebt.newItems}`);
      console.log(`  Resolved Items: ${report.technicalDebt.resolvedItems}`);
      console.log(`  Estimated Effort: ${report.technicalDebt.totalEffortHours}h`);

      console.log('\n🔒 Security:');
      console.log(`  Vulnerabilities: ${report.security.vulnerabilityCount}`);
      console.log(`  Critical: ${report.security.criticalCount}`);
      console.log(`  High: ${report.security.highCount}`);
      console.log(`  Medium: ${report.security.mediumCount}`);
      console.log(`  Low: ${report.security.lowCount}`);

      console.log('\n⚡ Performance:');
      console.log(`  Budget Compliance: ${report.performance.bundleCompliance ? 'Yes' : 'No'}`);
      console.log(`  Average Score: ${report.performance.averageScore}%`);
      console.log(`  Failing Budgets: ${report.performance.failingBudgets}`);

      console.log('\n📊 Coverage:');
      console.log(`  Test Coverage: ${report.coverage.percentage}%`);
      console.log(`  Uncovered Files: ${report.coverage.uncoveredFiles}`);
      console.log(`  Trend: ${report.coverage.trend}`);

      if (report.recommendations.length > 0) {
        console.log('\n💡 Top Recommendations:');
        report.recommendations.slice(0, 5).forEach((rec, index) => {
          const priority = rec.priority.toUpperCase();
          const icon = rec.priority === 'critical' ? '🚨' : 
                       rec.priority === 'high' ? '⚠️' : 
                       rec.priority === 'medium' ? '⚡' : 'ℹ️';
          console.log(`  ${index + 1}. ${icon} [${priority}] ${rec.title}`);
          console.log(`     Impact: +${rec.impact} points | Effort: ${rec.estimatedEffort || 'Unknown'}h`);
        });
      }

      // Generate JSON report if requested
      if (options.json) {
        const jsonPath = path.join(config.reportOutputDir, 'quality-report.json');
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 JSON report: ${jsonPath}`);
      }

      // Quality gates for CI mode
      if (options.ci) {
        const qualityGates = [
          { metric: 'overall', threshold: 70, actual: report.overall.qualityScore, name: 'Overall Quality Score' },
          { metric: 'security', threshold: 0, actual: report.security.criticalCount, name: 'Critical Vulnerabilities', invert: true },
          { metric: 'performance', threshold: 90, actual: report.performance.averageScore, name: 'Performance Score' }
        ];

        let gatesPassed = true;
        console.log('\n🚪 Quality Gates:');

        for (const gate of qualityGates) {
          const passed = gate.invert ? gate.actual <= gate.threshold : gate.actual >= gate.threshold;
          const status = passed ? '✅ PASS' : '❌ FAIL';
          console.log(`  ${status} ${gate.name}: ${gate.actual} ${gate.invert ? '<=' : '>='} ${gate.threshold}`);
          
          if (!passed) {
            gatesPassed = false;
          }
        }

        if (!gatesPassed) {
          console.error('\n❌ Quality gates failed. Build should not proceed.');
          process.exit(1);
        }

        console.log('\n✅ All quality gates passed.');
      }

      qualityService.close();

      console.log('\n🎉 Quality scan completed successfully!');
      console.log(`📊 View detailed reports in: ${config.reportOutputDir}`);

    } catch (error) {
      console.error('\n❌ Quality scan failed:', error.message);
      if (options.ci) {
        process.exit(1);
      }
    }
  });

program
  .command('debt')
  .description('Run technical debt analysis only')
  .option('-p, --project-path <path>', 'Project path to scan', process.cwd())
  .option('-o, --output <dir>', 'Output directory for reports', './reports')
  .action(async (options) => {
    try {
      console.log('📝 Running Technical Debt Analysis...');

      const config = {
        ...DEFAULT_CONFIG,
        projectPath: options.projectPath,
        reportOutputDir: options.output,
        scanners: {
          ...DEFAULT_CONFIG.scanners,
          technicalDebt: { ...DEFAULT_CONFIG.scanners.technicalDebt, enabled: true },
          security: { ...DEFAULT_CONFIG.scanners.security, enabled: false },
          performance: { ...DEFAULT_CONFIG.scanners.performance, enabled: false },
          complexity: { ...DEFAULT_CONFIG.scanners.complexity, enabled: false }
        }
      };

      const qualityService = new QualityService(config);
      const debtItems = await qualityService.scanTechnicalDebt();

      console.log(`\n📊 Found ${debtItems.length} technical debt items`);
      
      const bySeverity = {
        critical: debtItems.filter(d => d.severity === 'critical').length,
        high: debtItems.filter(d => d.severity === 'high').length,
        medium: debtItems.filter(d => d.severity === 'medium').length,
        low: debtItems.filter(d => d.severity === 'low').length
      };

      console.log(`  Critical: ${bySeverity.critical}`);
      console.log(`  High: ${bySeverity.high}`);
      console.log(`  Medium: ${bySeverity.medium}`);
      console.log(`  Low: ${bySeverity.low}`);

      const totalEffort = debtItems.reduce((sum, item) => sum + (item.estimatedEffort || 0), 0);
      console.log(`  Total Estimated Effort: ${Math.round(totalEffort * 100) / 100}h`);

      qualityService.close();
      console.log(`\n📊 Technical debt report: ${config.reportOutputDir}/technical-debt-*.html`);
      
    } catch (error) {
      console.error('❌ Technical debt analysis failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('security')
  .description('Run security vulnerability scan only')
  .option('-p, --project-path <path>', 'Project path to scan', process.cwd())
  .option('-o, --output <dir>', 'Output directory for reports', './reports')
  .option('--fix', 'Attempt to auto-fix vulnerabilities')
  .action(async (options) => {
    try {
      console.log('🔒 Running Security Vulnerability Scan...');

      const config = {
        ...DEFAULT_CONFIG,
        projectPath: options.projectPath,
        reportOutputDir: options.output,
        scanners: {
          ...DEFAULT_CONFIG.scanners,
          technicalDebt: { ...DEFAULT_CONFIG.scanners.technicalDebt, enabled: false },
          security: { ...DEFAULT_CONFIG.scanners.security, enabled: true, autoFix: options.fix },
          performance: { ...DEFAULT_CONFIG.scanners.performance, enabled: false },
          complexity: { ...DEFAULT_CONFIG.scanners.complexity, enabled: false }
        }
      };

      const qualityService = new QualityService(config);
      const vulnerabilities = await qualityService.scanSecurity();

      console.log(`\n📊 Found ${vulnerabilities.length} security vulnerabilities`);
      
      const bySeverity = {
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length
      };

      console.log(`  Critical: ${bySeverity.critical}`);
      console.log(`  High: ${bySeverity.high}`);
      console.log(`  Medium: ${bySeverity.medium}`);
      console.log(`  Low: ${bySeverity.low}`);

      if (bySeverity.critical > 0 || bySeverity.high > 0) {
        console.log('\n⚠️ High-priority vulnerabilities found. Consider running with --fix option.');
      }

      qualityService.close();
      console.log(`\n📊 Security report: ${config.reportOutputDir}/security-*.html`);
      
    } catch (error) {
      console.error('❌ Security scan failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize quality configuration file')
  .option('-f, --file <file>', 'Configuration file name', 'quality-config.json')
  .action((options) => {
    try {
      const configPath = options.file;
      
      if (fs.existsSync(configPath)) {
        console.log(`⚠️ Configuration file ${configPath} already exists.`);
        return;
      }

      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      console.log(`✅ Quality configuration initialized: ${configPath}`);
      console.log('📝 Edit the configuration file to customize scan settings.');
      
    } catch (error) {
      console.error('❌ Failed to initialize configuration:', error.message);
      process.exit(1);
    }
  });

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}