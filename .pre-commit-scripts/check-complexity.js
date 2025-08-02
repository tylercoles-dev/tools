#!/usr/bin/env node

/**
 * Pre-commit hook for code complexity checking
 * Analyzes staged files for excessive complexity
 */

import { ComplexityScanner } from '../core/dist/services/quality/scanners/complexity-scanner.js';
import { execSync } from 'child_process';
import * as fs from 'fs';

const COMPLEXITY_LIMITS = {
  cyclomatic: 10,   // Max cyclomatic complexity per function
  cognitive: 15,    // Max cognitive complexity per function
  maxFunctions: 3,  // Max complex functions per commit
  linesOfCode: 100  // Max lines of code per function
};

async function checkComplexity() {
  try {
    console.log('🧠 Analyzing code complexity in staged files...');

    // Get list of staged files
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=AM', {
      encoding: 'utf-8'
    }).split('\n').filter(file => file.trim() && 
      (file.endsWith('.ts') || file.endsWith('.tsx') || 
       file.endsWith('.js') || file.endsWith('.jsx')) &&
      !file.includes('.test.') && !file.includes('.spec.')
    );

    if (stagedFiles.length === 0) {
      console.log('✅ No source files staged for complexity analysis');
      return true;
    }

    console.log(`Analyzing ${stagedFiles.length} staged files...`);

    const scanner = new ComplexityScanner({
      cyclomaticThreshold: COMPLEXITY_LIMITS.cyclomatic,
      cognitiveThreshold: COMPLEXITY_LIMITS.cognitive
    });

    const allMetrics = [];

    // Analyze each staged file
    for (const filePath of stagedFiles) {
      if (fs.existsSync(filePath)) {
        const metrics = await scanner.analyzeFile(filePath);
        allMetrics.push(...metrics);
      }
    }

    if (allMetrics.length === 0) {
      console.log('✅ No functions found for complexity analysis');
      return true;
    }

    // Find overly complex functions
    const complexFunctions = allMetrics.filter(metric => 
      metric.cyclomaticComplexity > COMPLEXITY_LIMITS.cyclomatic ||
      metric.cognitiveComplexity > COMPLEXITY_LIMITS.cognitive ||
      metric.linesOfCode > COMPLEXITY_LIMITS.linesOfCode
    );

    const criticalComplexity = complexFunctions.filter(metric => 
      metric.severity === 'critical' || metric.severity === 'high'
    );

    console.log('\n📊 Complexity Analysis Summary:');
    console.log(`  Total Functions: ${allMetrics.length}`);
    console.log(`  Complex Functions: ${complexFunctions.length} (limit: ${COMPLEXITY_LIMITS.maxFunctions})`);
    console.log(`  Critical/High: ${criticalComplexity.length}`);

    if (criticalComplexity.length > 0) {
      console.error('\n❌ Critically complex functions found:');
      criticalComplexity.forEach(metric => {
        console.error(`  🚨 ${metric.functionName} in ${metric.filePath}`);
        console.error(`     Cyclomatic: ${metric.cyclomaticComplexity} (max: ${COMPLEXITY_LIMITS.cyclomatic})`);
        console.error(`     Cognitive: ${metric.cognitiveComplexity} (max: ${COMPLEXITY_LIMITS.cognitive})`);
        console.error(`     Lines: ${metric.linesOfCode} (max: ${COMPLEXITY_LIMITS.linesOfCode})`);
        console.error(`     Maintainability: ${metric.maintainabilityIndex}`);
      });

      console.error('\n💡 To fix:');
      console.error('  1. Break large functions into smaller, focused functions');
      console.error('  2. Extract complex logic into separate modules');
      console.error('  3. Reduce nesting levels and conditional complexity');
      console.error('  4. Consider using design patterns to simplify logic');
      
      return false;
    }

    if (complexFunctions.length > COMPLEXITY_LIMITS.maxFunctions) {
      console.error(`\n❌ Too many complex functions: ${complexFunctions.length} > ${COMPLEXITY_LIMITS.maxFunctions}`);
      
      console.error('\n⚠️ Complex functions found:');
      complexFunctions.slice(0, 5).forEach(metric => { // Show top 5
        console.error(`  ⚠️ ${metric.functionName} in ${metric.filePath}`);
        console.error(`     Cyclomatic: ${metric.cyclomaticComplexity}, Cognitive: ${metric.cognitiveComplexity}, Lines: ${metric.linesOfCode}`);
      });

      console.error('\n💡 Consider refactoring these functions before committing');
      return false;
    }

    // Show summary of complex functions as warnings
    if (complexFunctions.length > 0) {
      console.log('\n⚠️ Functions approaching complexity limits:');
      complexFunctions.forEach(metric => {
        console.log(`  ⚡ ${metric.functionName} in ${metric.filePath}`);
        console.log(`     Cyclomatic: ${metric.cyclomaticComplexity}, Cognitive: ${metric.cognitiveComplexity}`);
      });
      console.log('\n💡 Consider refactoring these functions in future commits');
    }

    console.log('\n✅ Code complexity check passed');
    return true;

  } catch (error) {
    console.error('❌ Complexity check failed:', error.message);
    return false;
  }
}

// Run the check
checkComplexity().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});