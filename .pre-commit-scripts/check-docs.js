#!/usr/bin/env node

/**
 * Pre-commit hook for documentation checking
 * Ensures code changes include appropriate documentation
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

const DOC_REQUIREMENTS = {
  minCommentRatio: 0.1,     // At least 10% of lines should be comments
  requireJSDoc: true,       // Require JSDoc for exported functions
  maxFunctionLength: 50,    // Functions over 50 lines need documentation
  requireREADME: true       // New directories should have README
};

async function checkDocumentation() {
  try {
    console.log('📚 Checking documentation requirements...');

    // Get staged files
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=AM', {
      encoding: 'utf-8'
    }).split('\n').filter(file => file.trim() && 
      (file.endsWith('.ts') || file.endsWith('.tsx') || 
       file.endsWith('.js') || file.endsWith('.jsx'))
    );

    if (stagedFiles.length === 0) {
      console.log('✅ No source files staged for documentation check');
      return true;
    }

    console.log(`Checking documentation for ${stagedFiles.length} staged files...`);

    const issues = [];
    const warnings = [];

    for (const filePath of stagedFiles) {
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Check comment ratio
      const commentLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('//') || 
               trimmed.startsWith('/*') || 
               trimmed.startsWith('*') ||
               trimmed.startsWith('/**');
      }).length;

      const codeLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('//') && 
               !trimmed.startsWith('/*') && 
               !trimmed.startsWith('*') &&
               !trimmed.startsWith('/**') &&
               !trimmed.startsWith('*/');
      }).length;

      const commentRatio = codeLines > 0 ? commentLines / codeLines : 0;

      if (commentRatio < DOC_REQUIREMENTS.minCommentRatio) {
        warnings.push({
          file: filePath,
          type: 'low_comment_ratio',
          message: `Low comment ratio: ${Math.round(commentRatio * 100)}% (min: ${DOC_REQUIREMENTS.minCommentRatio * 100}%)`
        });
      }

      // Check for exported functions without JSDoc
      if (DOC_REQUIREMENTS.requireJSDoc) {
        const exportedFunctions = findExportedFunctions(content);
        for (const func of exportedFunctions) {
          if (!hasJSDoc(content, func.line)) {
            if (func.isPublicAPI) {
              issues.push({
                file: filePath,
                type: 'missing_jsdoc',
                message: `Exported function '${func.name}' at line ${func.line} missing JSDoc documentation`
              });
            } else {
              warnings.push({
                file: filePath,
                type: 'missing_jsdoc',
                message: `Function '${func.name}' at line ${func.line} could benefit from JSDoc documentation`
              });
            }
          }
        }
      }

      // Check for long functions without documentation
      const longFunctions = findLongFunctions(content, DOC_REQUIREMENTS.maxFunctionLength);
      for (const func of longFunctions) {
        if (!hasDocumentation(content, func.startLine, func.endLine)) {
          warnings.push({
            file: filePath,
            type: 'long_function_undocumented',
            message: `Long function '${func.name}' (${func.length} lines) at line ${func.startLine} needs documentation`
          });
        }
      }
    }

    // Check for new directories without README
    if (DOC_REQUIREMENTS.requireREADME) {
      const newDirectories = findNewDirectories();
      for (const dir of newDirectories) {
        const readmePath = `${dir}/README.md`;
        if (!fs.existsSync(readmePath)) {
          warnings.push({
            file: dir,
            type: 'missing_readme',
            message: `New directory '${dir}' should include a README.md file`
          });
        }
      }
    }

    console.log('\n📊 Documentation Check Summary:');
    console.log(`  Files Checked: ${stagedFiles.length}`);
    console.log(`  Documentation Issues: ${issues.length}`);
    console.log(`  Documentation Warnings: ${warnings.length}`);

    if (issues.length > 0) {
      console.error('\n❌ Documentation issues found:');
      issues.forEach(issue => {
        console.error(`  🚨 ${issue.file}: ${issue.message}`);
      });

      console.error('\n💡 To fix:');
      console.error('  1. Add JSDoc comments to exported functions');
      console.error('  2. Include parameter and return type documentation');
      console.error('  3. Add examples for complex functions');
      console.error('  4. Document public APIs comprehensively');
      
      return false;
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ Documentation recommendations:');
      warnings.slice(0, 10).forEach(warning => { // Show top 10 warnings
        console.log(`  ⚡ ${warning.file}: ${warning.message}`);
      });
      if (warnings.length > 10) {
        console.log(`  ... and ${warnings.length - 10} more recommendations`);
      }
      console.log('\n💡 Consider improving documentation for better maintainability');
    }

    console.log('\n✅ Documentation check passed');
    return true;

  } catch (error) {
    console.error('❌ Documentation check failed:', error.message);
    return false;
  }
}

function findExportedFunctions(content) {
  const functions = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for exported functions
    const exportFunctionMatch = line.match(/export\s+(?:async\s+)?function\s+(\w+)/);
    const exportArrowMatch = line.match(/export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(/);
    const exportDefaultMatch = line.match(/export\s+default\s+(?:async\s+)?function\s+(\w+)?/);
    
    if (exportFunctionMatch) {
      functions.push({
        name: exportFunctionMatch[1],
        line: i + 1,
        isPublicAPI: true
      });
    } else if (exportArrowMatch) {
      functions.push({
        name: exportArrowMatch[1],
        line: i + 1,
        isPublicAPI: true
      });
    } else if (exportDefaultMatch) {
      functions.push({
        name: exportDefaultMatch[1] || 'default',
        line: i + 1,
        isPublicAPI: true
      });
    }
    
    // Also check for regular function declarations that might be exported later
    const functionMatch = line.match(/(?:async\s+)?function\s+(\w+)/);
    if (functionMatch && !line.includes('export')) {
      // Check if this function is exported later in the file
      const functionName = functionMatch[1];
      const isExported = content.includes(`export { ${functionName}`) || 
                        content.includes(`export {${functionName}`) ||
                        content.includes(`export { ${functionName},`) ||
                        content.includes(`export {${functionName},`);
      
      if (isExported) {
        functions.push({
          name: functionName,
          line: i + 1,
          isPublicAPI: true
        });
      }
    }
  }
  
  return functions;
}

function hasJSDoc(content, lineNumber) {
  const lines = content.split('\n');
  
  // Look for JSDoc comment before the function (within 5 lines)
  for (let i = Math.max(0, lineNumber - 5); i < lineNumber - 1; i++) {
    const line = lines[i]?.trim();
    if (line?.startsWith('/**')) {
      return true;
    }
  }
  
  return false;
}

function findLongFunctions(content, maxLength) {
  const functions = [];
  const lines = content.split('\n');
  
  let currentFunction = null;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Simple function detection
    const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|(\w+)\s*(?::\s*\w+)?\s*=\s*(?:async\s+)?\(/);
    
    if (functionMatch && !currentFunction) {
      currentFunction = {
        name: functionMatch[1] || functionMatch[2],
        startLine: i + 1,
        endLine: null,
        length: 0
      };
      braceDepth = 0;
    }
    
    if (currentFunction) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceDepth += openBraces - closeBraces;
      
      if (braceDepth === 0 && openBraces > 0) {
        currentFunction.endLine = i + 1;
        currentFunction.length = currentFunction.endLine - currentFunction.startLine + 1;
        
        if (currentFunction.length > maxLength) {
          functions.push(currentFunction);
        }
        
        currentFunction = null;
      }
    }
  }
  
  return functions;
}

function hasDocumentation(content, startLine, endLine) {
  const lines = content.split('\n');
  
  // Check for comments within the function
  for (let i = startLine - 1; i < Math.min(endLine, lines.length); i++) {
    const line = lines[i]?.trim();
    if (line?.startsWith('//') || line?.startsWith('/*') || line?.startsWith('*')) {
      return true;
    }
  }
  
  // Check for JSDoc before the function
  return hasJSDoc(content, startLine);
}

function findNewDirectories() {
  try {
    // Get list of new directories from git
    const output = execSync('git diff --cached --name-only --diff-filter=A', {
      encoding: 'utf-8'
    });
    
    const newFiles = output.split('\n').filter(file => file.trim());
    const directories = new Set();
    
    for (const file of newFiles) {
      const dir = file.split('/').slice(0, -1).join('/');
      if (dir && !dir.includes('node_modules') && !dir.includes('.git')) {
        directories.add(dir);
      }
    }
    
    return Array.from(directories);
  } catch (error) {
    return [];
  }
}

// Run the check
checkDocumentation().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});