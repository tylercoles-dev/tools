import { z } from 'zod';

/**
 * Quality Metric Types and Schemas
 */

export const QualityMetricTypeSchema = z.enum([
  'technical_debt',
  'security',
  'performance',
  'coverage',
  'complexity',
  'duplication',
  'dependencies'
]);

export const SeverityLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const DebtTypeSchema = z.enum(['TODO', 'FIXME', 'HACK', 'XXX', 'NOTE', 'OPTIMIZE']);

export const QualityMetricSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  commitHash: z.string(),
  branchName: z.string(),
  metricType: QualityMetricTypeSchema,
  metricName: z.string(),
  metricValue: z.number(),
  metricUnit: z.string().optional(),
  timestamp: z.string().default(() => new Date().toISOString()),
  metadata: z.record(z.any()).optional()
});

export const TechnicalDebtItemSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  lineNumber: z.number(),
  debtType: DebtTypeSchema,
  message: z.string(),
  severity: SeverityLevelSchema,
  author: z.string().optional(),
  commitHash: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  resolvedAt: z.string().optional(),
  resolutionCommit: z.string().optional(),
  estimatedEffort: z.number().optional(), // hours
  category: z.string().optional()
});

export const SecurityVulnerabilitySchema = z.object({
  id: z.string(),
  packageName: z.string(),
  version: z.string(),
  vulnerabilityId: z.string(),
  severity: SeverityLevelSchema,
  title: z.string(),
  description: z.string(),
  solution: z.string().optional(),
  detectedAt: z.string().default(() => new Date().toISOString()),
  resolvedAt: z.string().optional(),
  falsePositive: z.boolean().default(false)
});

export const PerformanceBudgetSchema = z.object({
  id: z.string(),
  bundleName: z.string(),
  type: z.enum(['bundle', 'asset', 'script', 'style']),
  maximumWarning: z.string(), // e.g., "500kb"
  maximumError: z.string(), // e.g., "1mb"
  currentSize: z.string(),
  isCompliant: z.boolean(),
  lastChecked: z.string().default(() => new Date().toISOString())
});

export const CodeComplexityMetricSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  functionName: z.string(),
  cyclomaticComplexity: z.number(),
  cognitiveComplexity: z.number(),
  linesOfCode: z.number(),
  maintainabilityIndex: z.number(),
  severity: SeverityLevelSchema,
  measuredAt: z.string().default(() => new Date().toISOString())
});

export const QualityGateConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().default(true),
  rules: z.array(z.object({
    metricType: QualityMetricTypeSchema,
    metricName: z.string(),
    operator: z.enum(['<', '<=', '>', '>=', '==', '!=']),
    threshold: z.number(),
    severity: SeverityLevelSchema,
    blockMerge: z.boolean().default(false)
  })),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString())
});

export const QualityReportSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  commitHash: z.string(),
  branchName: z.string(),
  generatedAt: z.string().default(() => new Date().toISOString()),
  overall: z.object({
    qualityScore: z.number().min(0).max(100),
    grade: z.enum(['A', 'B', 'C', 'D', 'F']),
    trend: z.enum(['improving', 'stable', 'declining'])
  }),
  technicalDebt: z.object({
    totalItems: z.number(),
    newItems: z.number(),
    resolvedItems: z.number(),
    totalEffortHours: z.number(),
    scoreImpact: z.number(),
    breakdown: z.record(z.number())
  }),
  security: z.object({
    vulnerabilityCount: z.number(),
    criticalCount: z.number(),
    highCount: z.number(),
    mediumCount: z.number(),
    lowCount: z.number(),
    scoreImpact: z.number()
  }),
  performance: z.object({
    bundleCompliance: z.boolean(),
    averageScore: z.number(),
    failingBudgets: z.number(),
    scoreImpact: z.number()
  }),
  coverage: z.object({
    percentage: z.number(),
    uncoveredFiles: z.number(),
    trend: z.enum(['improving', 'stable', 'declining']),
    scoreImpact: z.number()
  }),
  recommendations: z.array(z.object({
    type: QualityMetricTypeSchema,
    priority: SeverityLevelSchema,
    title: z.string(),
    description: z.string(),
    estimatedEffort: z.number().optional(),
    impact: z.number() // expected score improvement
  }))
});

export const DependencyHealthSchema = z.object({
  id: z.string(),
  packageName: z.string(),
  currentVersion: z.string(),
  latestVersion: z.string(),
  isOutdated: z.boolean(),
  securityVulnerabilities: z.number(),
  licenseCompliance: z.boolean(),
  maintenanceStatus: z.enum(['active', 'deprecated', 'abandoned']),
  lastUpdated: z.string(),
  healthScore: z.number().min(0).max(100),
  checkedAt: z.string().default(() => new Date().toISOString())
});

// Export TypeScript types
export type QualityMetricType = z.infer<typeof QualityMetricTypeSchema>;
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;
export type DebtType = z.infer<typeof DebtTypeSchema>;
export type QualityMetric = z.infer<typeof QualityMetricSchema>;
export type TechnicalDebtItem = z.infer<typeof TechnicalDebtItemSchema>;
export type SecurityVulnerability = z.infer<typeof SecurityVulnerabilitySchema>;
export type PerformanceBudget = z.infer<typeof PerformanceBudgetSchema>;
export type CodeComplexityMetric = z.infer<typeof CodeComplexityMetricSchema>;
export type QualityGateConfig = z.infer<typeof QualityGateConfigSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;
export type DependencyHealth = z.infer<typeof DependencyHealthSchema>;

// Scanner configuration types
export interface ScannerConfig {
  technicalDebt: {
    enabled: boolean;
    patterns: {
      todo: string[];
      fixme: string[];
      hack: string[];
      xxx: string[];
    };
    excludeFiles: string[];
    severityMappings: Record<string, SeverityLevel>;
  };
  security: {
    enabled: boolean;
    auditLevel: 'low' | 'moderate' | 'high' | 'critical';
    excludePackages: string[];
    autoFix: boolean;
  };
  complexity: {
    enabled: boolean;
    cyclomaticThreshold: number;
    cognitiveThreshold: number;
    excludeFiles: string[];
  };
  performance: {
    enabled: boolean;
    budgets: PerformanceBudget[];
    analyzeBundles: boolean;
  };
}

// Quality score calculation weights
export interface QualityScoreWeights {
  technicalDebt: number;
  security: number;
  performance: number;
  coverage: number;
  complexity: number;
  dependencies: number;
}

export const DEFAULT_QUALITY_WEIGHTS: QualityScoreWeights = {
  technicalDebt: 0.2,
  security: 0.3,
  performance: 0.15,
  coverage: 0.15,
  complexity: 0.1,
  dependencies: 0.1
};