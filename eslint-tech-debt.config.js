/**
 * ESLint Configuration for Technical Debt Detection
 * Custom rules to detect and report technical debt markers
 */

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '**/*.min.js',
      '**/*.map'
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      'tech-debt': {
        rules: {
          'no-todo-comments': {
            meta: {
              type: 'suggestion',
              docs: {
                description: 'Disallow TODO comments in production code',
                category: 'Technical Debt'
              },
              schema: [
                {
                  type: 'object',
                  properties: {
                    terms: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    location: {
                      type: 'string',
                      enum: ['start', 'anywhere']
                    },
                    allowWarning: {
                      type: 'boolean'
                    }
                  }
                }
              ]
            },
            create(context) {
              const options = context.options[0] || {};
              const terms = options.terms || ['TODO', 'todo', 'Todo'];
              const location = options.location || 'anywhere';
              const allowWarning = options.allowWarning !== false;

              const regex = location === 'start' 
                ? new RegExp(`^\\s*(?://|/\\*|\\*)\\s*(${terms.join('|')})\\b`, 'i')
                : new RegExp(`\\b(${terms.join('|')})\\b`, 'i');

              return {
                Program() {
                  const sourceCode = context.getSourceCode();
                  const comments = sourceCode.getAllComments();

                  comments.forEach(comment => {
                    const match = comment.value.match(regex);
                    if (match) {
                      const severity = allowWarning ? 'warn' : 'error';
                      context.report({
                        node: comment,
                        message: `${match[1]} comment found: "${comment.value.trim()}". Consider creating an issue or resolving immediately.`,
                        severity
                      });
                    }
                  });
                }
              };
            }
          },

          'no-fixme-comments': {
            meta: {
              type: 'problem',
              docs: {
                description: 'Disallow FIXME/HACK/XXX comments in production code',
                category: 'Technical Debt'
              },
              schema: [
                {
                  type: 'object',
                  properties: {
                    terms: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              ]
            },
            create(context) {
              const options = context.options[0] || {};
              const terms = options.terms || ['FIXME', 'fixme', 'HACK', 'hack', 'XXX', 'xxx'];
              const regex = new RegExp(`\\b(${terms.join('|')})\\b`, 'i');

              return {
                Program() {
                  const sourceCode = context.getSourceCode();
                  const comments = sourceCode.getAllComments();

                  comments.forEach(comment => {
                    const match = comment.value.match(regex);
                    if (match) {
                      context.report({
                        node: comment,
                        message: `${match[1]} comment found: "${comment.value.trim()}". This indicates urgent technical debt that must be resolved.`
                      });
                    }
                  });
                }
              };
            }
          },

          'complexity-threshold': {
            meta: {
              type: 'suggestion',
              docs: {
                description: 'Enforce maximum cyclomatic complexity',
                category: 'Technical Debt'
              },
              schema: [
                {
                  type: 'object',
                  properties: {
                    max: { type: 'integer', minimum: 1 }
                  }
                }
              ]
            },
            create(context) {
              const options = context.options[0] || {};
              const max = options.max || 10;

              function calculateComplexity(node) {
                let complexity = 1; // Base complexity

                function visit(node) {
                  switch (node.type) {
                    case 'IfStatement':
                    case 'ConditionalExpression':
                    case 'SwitchCase':
                    case 'WhileStatement':
                    case 'DoWhileStatement':
                    case 'ForStatement':
                    case 'ForInStatement':
                    case 'ForOfStatement':
                    case 'CatchClause':
                      complexity++;
                      break;
                    case 'LogicalExpression':
                      if (node.operator === '&&' || node.operator === '||') {
                        complexity++;
                      }
                      break;
                  }

                  // Recursively visit child nodes
                  for (const key in node) {
                    if (node[key] && typeof node[key] === 'object') {
                      if (Array.isArray(node[key])) {
                        node[key].forEach(child => {
                          if (child && child.type) visit(child);
                        });
                      } else if (node[key].type) {
                        visit(node[key]);
                      }
                    }
                  }
                }

                visit(node);
                return complexity;
              }

              return {
                FunctionDeclaration(node) {
                  const complexity = calculateComplexity(node);
                  if (complexity > max) {
                    context.report({
                      node,
                      message: `Function '${node.id?.name || 'anonymous'}' has complexity ${complexity} (max: ${max}). Consider breaking it down.`
                    });
                  }
                },
                FunctionExpression(node) {
                  const complexity = calculateComplexity(node);
                  if (complexity > max) {
                    const name = node.id?.name || 
                               (node.parent?.type === 'MethodDefinition' ? node.parent.key.name : 'anonymous');
                    context.report({
                      node,
                      message: `Function '${name}' has complexity ${complexity} (max: ${max}). Consider breaking it down.`
                    });
                  }
                },
                ArrowFunctionExpression(node) {
                  const complexity = calculateComplexity(node);
                  if (complexity > max) {
                    context.report({
                      node,
                      message: `Arrow function has complexity ${complexity} (max: ${max}). Consider breaking it down.`
                    });
                  }
                }
              };
            }
          },

          'no-console-production': {
            meta: {
              type: 'suggestion',
              docs: {
                description: 'Disallow console statements in production code',
                category: 'Technical Debt'
              },
              schema: []
            },
            create(context) {
              const isProduction = process.env.NODE_ENV === 'production';
              
              return {
                MemberExpression(node) {
                  if (isProduction && 
                      node.object.name === 'console' && 
                      node.property.name !== 'error') {
                    context.report({
                      node,
                      message: 'Console statement should not be used in production code. Use proper logging instead.'
                    });
                  }
                }
              };
            }
          },

          'max-function-length': {
            meta: {
              type: 'suggestion',
              docs: {
                description: 'Enforce maximum function length',
                category: 'Technical Debt'
              },
              schema: [
                {
                  type: 'object',
                  properties: {
                    max: { type: 'integer', minimum: 1 }
                  }
                }
              ]
            },
            create(context) {
              const options = context.options[0] || {};
              const max = options.max || 50;

              function checkFunctionLength(node) {
                const startLine = node.loc.start.line;
                const endLine = node.loc.end.line;
                const length = endLine - startLine + 1;

                if (length > max) {
                  const name = node.id?.name || 
                             (node.parent?.type === 'MethodDefinition' ? node.parent.key.name : 'anonymous');
                  context.report({
                    node,
                    message: `Function '${name}' is ${length} lines long (max: ${max}). Consider breaking it into smaller functions.`
                  });
                }
              }

              return {
                FunctionDeclaration: checkFunctionLength,
                FunctionExpression: checkFunctionLength,
                ArrowFunctionExpression: checkFunctionLength
              };
            }
          },

          'no-magic-numbers': {
            meta: {
              type: 'suggestion',
              docs: {
                description: 'Disallow magic numbers',
                category: 'Technical Debt'
              },
              schema: [
                {
                  type: 'object',
                  properties: {
                    ignore: {
                      type: 'array',
                      items: { type: 'number' }
                    }
                  }
                }
              ]
            },
            create(context) {
              const options = context.options[0] || {};
              const ignore = options.ignore || [-1, 0, 1, 2];

              return {
                Literal(node) {
                  if (typeof node.value === 'number' && 
                      !ignore.includes(node.value) &&
                      node.parent.type !== 'Property' &&
                      node.parent.type !== 'ArrayExpression') {
                    context.report({
                      node,
                      message: `Magic number ${node.value} should be replaced with a named constant.`
                    });
                  }
                }
              };
            }
          }
        }
      }
    },
    rules: {
      // Technical debt detection rules
      'tech-debt/no-todo-comments': ['warn', {
        terms: ['TODO', 'todo', 'Todo', 'TO-DO'],
        location: 'anywhere',
        allowWarning: true
      }],
      'tech-debt/no-fixme-comments': ['error', {
        terms: ['FIXME', 'fixme', 'HACK', 'hack', 'XXX', 'xxx', '!!!']
      }],
      'tech-debt/complexity-threshold': ['warn', { max: 10 }],
      'tech-debt/no-console-production': 'warn',
      'tech-debt/max-function-length': ['warn', { max: 50 }],
      'tech-debt/no-magic-numbers': ['warn', { 
        ignore: [-1, 0, 1, 2, 100, 1000] 
      }],

      // Standard ESLint rules for code quality
      'no-unused-vars': 'warn',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn'
    }
  }
];

// Export configuration for Node.js environments
module.exports = {
  extends: ['@typescript-eslint/recommended'],
  plugins: ['@typescript-eslint'],
  rules: {
    // Include the same rules as above for CommonJS compatibility
    'no-unused-vars': 'warn',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',
    'prefer-const': 'warn',
    'no-var': 'error',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
};