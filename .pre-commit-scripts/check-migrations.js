#!/usr/bin/env node

/**
 * Pre-commit hook for database migration checking
 * Ensures database changes follow migration best practices
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATION_RULES = {
  requireSequentialNaming: true,    // Migration files should be sequentially named
  requireRollback: true,           // Migration files should include rollback instructions
  maxMigrationSize: 100,           // Max lines per migration file
  requireDocumentation: true       // Migration files should be documented
};

async function checkMigrations() {
  try {
    console.log('🗄️ Checking database migration files...');

    // Get staged files that might be migrations
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=AM', {
      encoding: 'utf-8'
    }).split('\n').filter(file => file.trim());

    const migrationFiles = stagedFiles.filter(file => 
      file.includes('migration') || 
      file.includes('schema') || 
      file.includes('database/') ||
      file.endsWith('.sql') ||
      (file.includes('db') && (file.endsWith('.ts') || file.endsWith('.js')))
    );

    if (migrationFiles.length === 0) {
      console.log('✅ No migration files staged');
      return true;
    }

    console.log(`Checking ${migrationFiles.length} migration-related files...`);

    const issues = [];
    const warnings = [];

    for (const filePath of migrationFiles) {
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const fileBaseName = path.basename(filePath);
      
      // Check for SQL migration files
      if (filePath.endsWith('.sql')) {
        await checkSQLMigration(filePath, content, issues, warnings);
      }
      
      // Check for TypeScript/JavaScript migration files
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        await checkJSMigration(filePath, content, issues, warnings);
      }

      // Check schema changes
      if (filePath.includes('schema')) {
        await checkSchemaChanges(filePath, content, issues, warnings);
      }
    }

    // Check migration sequence
    if (MIGRATION_RULES.requireSequentialNaming) {
      checkMigrationSequence(migrationFiles, issues);
    }

    console.log('\n📊 Migration Check Summary:');
    console.log(`  Migration Files: ${migrationFiles.length}`);
    console.log(`  Issues: ${issues.length}`);
    console.log(`  Warnings: ${warnings.length}`);

    if (issues.length > 0) {
      console.error('\n❌ Migration issues found:');
      issues.forEach(issue => {
        console.error(`  🚨 ${issue.file}: ${issue.message}`);
      });

      console.error('\n💡 Migration best practices:');
      console.error('  1. Always include rollback/down migrations');
      console.error('  2. Test migrations on a copy of production data');
      console.error('  3. Make migrations atomic and reversible');
      console.error('  4. Avoid breaking changes in data structure');
      console.error('  5. Document complex migrations thoroughly');
      
      return false;
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ Migration recommendations:');
      warnings.forEach(warning => {
        console.log(`  ⚡ ${warning.file}: ${warning.message}`);
      });
      console.log('\n💡 Consider addressing these recommendations');
    }

    console.log('\n✅ Migration check passed');
    return true;

  } catch (error) {
    console.error('❌ Migration check failed:', error.message);
    return false;
  }
}

async function checkSQLMigration(filePath, content, issues, warnings) {
  const lines = content.split('\n');
  
  // Check for rollback section
  if (MIGRATION_RULES.requireRollback) {
    const hasRollback = content.toLowerCase().includes('-- rollback') ||
                       content.toLowerCase().includes('-- down') ||
                       content.toLowerCase().includes('-- revert');
    
    if (!hasRollback) {
      issues.push({
        file: filePath,
        message: 'SQL migration missing rollback instructions (add -- rollback section)'
      });
    }
  }

  // Check for dangerous operations
  const dangerousOperations = [
    'DROP TABLE',
    'DROP COLUMN',
    'DROP DATABASE',
    'TRUNCATE',
    'DELETE FROM'
  ];

  for (const op of dangerousOperations) {
    if (content.toUpperCase().includes(op)) {
      warnings.push({
        file: filePath,
        message: `Contains potentially dangerous operation: ${op}`
      });
    }
  }

  // Check migration size
  if (lines.length > MIGRATION_RULES.maxMigrationSize) {
    warnings.push({
      file: filePath,
      message: `Large migration file (${lines.length} lines). Consider breaking into smaller migrations.`
    });
  }

  // Check for documentation
  if (MIGRATION_RULES.requireDocumentation) {
    const hasDocumentation = content.includes('--') && 
                             (content.toLowerCase().includes('purpose:') ||
                              content.toLowerCase().includes('description:') ||
                              content.toLowerCase().includes('what:'));
    
    if (!hasDocumentation) {
      warnings.push({
        file: filePath,
        message: 'Migration lacks documentation. Add comments explaining the purpose.'
      });
    }
  }

  // Check for transaction usage
  const hasTransaction = content.toUpperCase().includes('BEGIN') && 
                        content.toUpperCase().includes('COMMIT');
  
  if (!hasTransaction) {
    warnings.push({
      file: filePath,
      message: 'Consider wrapping migration in explicit transaction (BEGIN...COMMIT)'
    });
  }
}

async function checkJSMigration(filePath, content, issues, warnings) {
  // Check for up/down methods
  const hasUpMethod = content.includes('up(') || content.includes('up:');
  const hasDownMethod = content.includes('down(') || content.includes('down:');

  if (MIGRATION_RULES.requireRollback && hasUpMethod && !hasDownMethod) {
    issues.push({
      file: filePath,
      message: 'Migration has up() method but missing down() method for rollback'
    });
  }

  // Check for async/await usage
  if (!content.includes('async') && (content.includes('query') || content.includes('execute'))) {
    warnings.push({
      file: filePath,
      message: 'Consider using async/await for database operations'
    });
  }

  // Check for error handling
  if (!content.includes('try') && !content.includes('catch')) {
    warnings.push({
      file: filePath,
      message: 'Consider adding error handling with try/catch blocks'
    });
  }

  // Check migration size
  const lines = content.split('\n');
  if (lines.length > MIGRATION_RULES.maxMigrationSize) {
    warnings.push({
      file: filePath,
      message: `Large migration file (${lines.length} lines). Consider breaking into smaller migrations.`
    });
  }
}

async function checkSchemaChanges(filePath, content, issues, warnings) {
  // Check for breaking changes in schema
  const breakingChanges = [
    'DROP TABLE',
    'DROP COLUMN',
    'ALTER COLUMN',
    'RENAME COLUMN',
    'RENAME TABLE'
  ];

  for (const change of breakingChanges) {
    if (content.toUpperCase().includes(change)) {
      warnings.push({
        file: filePath,
        message: `Schema contains potentially breaking change: ${change}`
      });
    }
  }

  // Check for proper indexing
  if (content.toUpperCase().includes('CREATE TABLE') && 
      !content.toUpperCase().includes('INDEX') && 
      !content.toUpperCase().includes('PRIMARY KEY')) {
    warnings.push({
      file: filePath,
      message: 'New table should consider adding appropriate indexes'
    });
  }

  // Check for foreign key constraints
  if (content.toUpperCase().includes('REFERENCES') && 
      !content.toUpperCase().includes('ON DELETE') && 
      !content.toUpperCase().includes('ON UPDATE')) {
    warnings.push({
      file: filePath,
      message: 'Foreign key constraints should specify ON DELETE/UPDATE behavior'
    });
  }
}

function checkMigrationSequence(migrationFiles, issues) {
  // Simple check for timestamp-based migration naming
  const timestampMigrations = migrationFiles
    .filter(file => /\d{8}_\d{6}/.test(path.basename(file)) || /\d{13}/.test(path.basename(file)))
    .sort();

  if (timestampMigrations.length > 1) {
    for (let i = 1; i < timestampMigrations.length; i++) {
      const prevFile = path.basename(timestampMigrations[i - 1]);
      const currentFile = path.basename(timestampMigrations[i]);
      
      const prevTimestamp = extractTimestamp(prevFile);
      const currentTimestamp = extractTimestamp(currentFile);
      
      if (prevTimestamp && currentTimestamp && currentTimestamp <= prevTimestamp) {
        issues.push({
          file: timestampMigrations[i],
          message: `Migration timestamp should be newer than previous migration (${prevFile})`
        });
      }
    }
  }
}

function extractTimestamp(filename) {
  // Extract timestamp from various migration naming patterns
  const patterns = [
    /(\d{8}_\d{6})/, // YYYYMMDD_HHMMSS
    /(\d{13})/,      // Unix timestamp with milliseconds
    /(\d{10})/       // Unix timestamp
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

// Run the check
checkMigrations().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});