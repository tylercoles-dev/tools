/**
 * Quality Database - PostgreSQL implementation with Kysely
 */

import { Kysely, sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnectionManager, createDatabaseConfig } from '../../utils/database.js';
import type { DatabaseConfig } from '../../utils/database.js';
import type {
  QualityMetric,
  TechnicalDebtItem,
  SecurityVulnerability,
  PerformanceBudget,
  CodeComplexityMetric,
  QualityGateConfig,
  QualityReport,
  DependencyHealth
} from './types.js';

// Database schema interfaces
export interface QualityDatabase {
  quality_metrics: {
    id?: string;
    project_name: string;
    commit_hash: string;
    branch_name: string;
    metric_type: string;
    metric_name: string;
    metric_value: number;
    metric_unit: string | null;
    timestamp: string;
    metadata: string | null;
  };
  technical_debt_items: {
    id?: string;
    file_path: string;
    line_number: number;
    debt_type: string;
    message: string;
    severity: string;
    author: string | null;
    commit_hash: string | null;
    created_at: string;
    resolved_at: string | null;
    resolution_commit: string | null;
    estimated_effort: number | null;
    category: string | null;
  };
  security_vulnerabilities: {
    id?: string;
    package_name: string;
    version: string;
    vulnerability_id: string;
    severity: string;
    title: string;
    description: string;
    solution: string | null;
    detected_at: string;
    resolved_at: string | null;
    false_positive: boolean;
  };
  performance_budgets: {
    id?: string;
    bundle_name: string;
    type: string;
    maximum_warning: string;
    maximum_error: string;
    current_size: string;
    is_compliant: boolean;
    last_checked: string;
  };
  code_complexity_metrics: {
    id?: string;
    file_path: string;
    function_name: string;
    cyclomatic_complexity: number;
    cognitive_complexity: number;
    lines_of_code: number;
    maintainability_index: number;
    severity: string;
    measured_at: string;
  };
  quality_gates: {
    id?: string;
    name: string;
    enabled: boolean;
    rules: string; // JSON
    created_at: string;
    updated_at: string;
  };
  quality_reports: {
    id?: string;
    project_name: string;
    commit_hash: string;
    branch_name: string;
    generated_at: string;
    report_data: string; // JSON
  };
  dependency_health: {
    id?: string;
    package_name: string;
    current_version: string;
    latest_version: string;
    is_outdated: boolean;
    security_vulnerabilities: number;
    license_compliance: boolean;
    maintenance_status: string;
    last_updated: string;
    health_score: number;
    checked_at: string;
  };
}

export class QualityDatabase {
  private dbManager: DatabaseConnectionManager<QualityDatabase>;

  constructor(config?: Partial<DatabaseConfig>) {
    const dbConfig = createDatabaseConfig({
      database: 'quality_db',
      ...config
    });
    this.dbManager = new DatabaseConnectionManager<QualityDatabase>(dbConfig);
  }

  async initialize(): Promise<void> {
    await this.dbManager.initialize();
    // Tables are created by migrations - just test the connection
    await this.testConnection();
  }

  get db(): Kysely<QualityDatabase> {
    return this.dbManager.kysely;
  }

  private async testConnection(): Promise<void> {
    try {
      await this.db.selectFrom('quality_metrics').select('id').limit(1).execute();
      console.log('✅ Quality database connection verified successfully');
    } catch (error) {
      console.error('❌ Quality database connection failed. Ensure migration service has completed:', error);
      throw new Error('Quality database not available. Migration service may not have completed successfully.');
    }
  }

  // Quality Metrics operations
  async insertQualityMetric(metric: Omit<QualityMetric, 'id'>): Promise<string> {
    const result = await this.db
      .insertInto('quality_metrics')
      .values({
        project_name: metric.projectName,
        commit_hash: metric.commitHash,
        branch_name: metric.branchName,
        metric_type: metric.metricType,
        metric_name: metric.metricName,
        metric_value: metric.metricValue,
        metric_unit: metric.metricUnit || null,
        timestamp: metric.timestamp,
        metadata: metric.metadata ? JSON.stringify(metric.metadata) : null
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    
    return result.id!;
  }

  async getQualityMetrics(
    projectName: string,
    metricType?: string,
    limit: number = 100
  ): Promise<QualityMetric[]> {
    let query = this.db
      .selectFrom('quality_metrics')
      .selectAll()
      .where('project_name', '=', projectName);

    if (metricType) {
      query = query.where('metric_type', '=', metricType);
    }

    query = query.orderBy('timestamp', 'desc').limit(limit);

    const rows = await query.execute();

    return rows.map(row => ({
      id: row.id!,
      projectName: row.project_name,
      commitHash: row.commit_hash,
      branchName: row.branch_name,
      metricType: row.metric_type,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricUnit: row.metric_unit,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    })) as QualityMetric[];
  }

  // Technical Debt operations
  async insertTechnicalDebtItem(item: Omit<TechnicalDebtItem, 'id'>): Promise<string> {
    const result = await this.db
      .insertInto('technical_debt_items')
      .values({
        file_path: item.filePath,
        line_number: item.lineNumber,
        debt_type: item.debtType,
        message: item.message,
        severity: item.severity,
        author: item.author || null,
        commit_hash: item.commitHash || null,
        created_at: item.createdAt,
        resolved_at: item.resolvedAt || null,
        resolution_commit: item.resolutionCommit || null,
        estimated_effort: item.estimatedEffort || null,
        category: item.category || null
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    
    return result.id!;
  }

  async getTechnicalDebtItems(
    filePath?: string,
    resolved?: boolean
  ): Promise<TechnicalDebtItem[]> {
    let query = this.db.selectFrom('technical_debt_items').selectAll();

    if (filePath) {
      query = query.where('file_path', '=', filePath);
    }

    if (resolved !== undefined) {
      if (resolved) {
        query = query.where('resolved_at', 'is not', null);
      } else {
        query = query.where('resolved_at', 'is', null);
      }
    }

    query = query.orderBy('created_at', 'desc');

    const rows = await query.execute();

    return rows.map(row => ({
      id: row.id!,
      filePath: row.file_path,
      lineNumber: row.line_number,
      debtType: row.debt_type,
      message: row.message,
      severity: row.severity,
      author: row.author,
      commitHash: row.commit_hash,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      resolutionCommit: row.resolution_commit,
      estimatedEffort: row.estimated_effort,
      category: row.category
    })) as TechnicalDebtItem[];
  }

  async resolveTechnicalDebtItem(id: string, resolutionCommit: string): Promise<void> {
    await this.db
      .updateTable('technical_debt_items')
      .set({ 
        resolved_at: sql`CURRENT_TIMESTAMP`, 
        resolution_commit: resolutionCommit 
      })
      .where('id', '=', id)
      .execute();
  }

  // Security Vulnerabilities operations
  async insertSecurityVulnerability(vuln: Omit<SecurityVulnerability, 'id'>): Promise<string> {
    const result = await this.db
      .insertInto('security_vulnerabilities')
      .values({
        package_name: vuln.packageName,
        version: vuln.version,
        vulnerability_id: vuln.vulnerabilityId,
        severity: vuln.severity,
        title: vuln.title,
        description: vuln.description,
        solution: vuln.solution || null,
        detected_at: vuln.detectedAt,
        resolved_at: vuln.resolvedAt || null,
        false_positive: vuln.falsePositive
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    
    return result.id!;
  }

  async getSecurityVulnerabilities(resolved?: boolean): Promise<SecurityVulnerability[]> {
    let query = this.db.selectFrom('security_vulnerabilities').selectAll();

    if (resolved !== undefined) {
      if (resolved) {
        query = query.where('resolved_at', 'is not', null);
      } else {
        query = query.where('resolved_at', 'is', null);
      }
    }

    query = query.orderBy('detected_at', 'desc');

    const rows = await query.execute();

    return rows.map(row => ({
      id: row.id!,
      packageName: row.package_name,
      version: row.version,
      vulnerabilityId: row.vulnerability_id,
      severity: row.severity,
      title: row.title,
      description: row.description,
      solution: row.solution,
      detectedAt: row.detected_at,
      resolvedAt: row.resolved_at,
      falsePositive: row.false_positive
    })) as SecurityVulnerability[];
  }

  // Performance Budget operations
  async upsertPerformanceBudget(budget: Omit<PerformanceBudget, 'id'>): Promise<string> {
    // First try to find existing budget by bundle name and type
    const existing = await this.db
      .selectFrom('performance_budgets')
      .select('id')
      .where('bundle_name', '=', budget.bundleName)
      .where('type', '=', budget.type)
      .executeTakeFirst();

    if (existing) {
      // Update existing
      await this.db
        .updateTable('performance_budgets')
        .set({
          maximum_warning: budget.maximumWarning,
          maximum_error: budget.maximumError,
          current_size: budget.currentSize,
          is_compliant: budget.isCompliant,
          last_checked: budget.lastChecked
        })
        .where('id', '=', existing.id)
        .execute();
      return existing.id!;
    } else {
      // Insert new
      const result = await this.db
        .insertInto('performance_budgets')
        .values({
          bundle_name: budget.bundleName,
          type: budget.type,
          maximum_warning: budget.maximumWarning,
          maximum_error: budget.maximumError,
          current_size: budget.currentSize,
          is_compliant: budget.isCompliant,
          last_checked: budget.lastChecked
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return result.id!;
    }
  }

  async getPerformanceBudgets(): Promise<PerformanceBudget[]> {
    const rows = await this.db
      .selectFrom('performance_budgets')
      .selectAll()
      .orderBy('last_checked', 'desc')
      .execute();

    return rows.map(row => ({
      id: row.id!,
      bundleName: row.bundle_name,
      type: row.type,
      maximumWarning: row.maximum_warning,
      maximumError: row.maximum_error,
      currentSize: row.current_size,
      isCompliant: row.is_compliant,
      lastChecked: row.last_checked
    })) as PerformanceBudget[];
  }

  // Code Complexity Metrics operations
  async insertCodeComplexityMetric(metric: Omit<CodeComplexityMetric, 'id'>): Promise<string> {
    const result = await this.db
      .insertInto('code_complexity_metrics')
      .values({
        file_path: metric.filePath,
        function_name: metric.functionName,
        cyclomatic_complexity: metric.cyclomaticComplexity,
        cognitive_complexity: metric.cognitiveComplexity,
        lines_of_code: metric.linesOfCode,
        maintainability_index: metric.maintainabilityIndex,
        severity: metric.severity,
        measured_at: metric.measuredAt
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    
    return result.id!;
  }

  async getCodeComplexityMetrics(
    filePath?: string,
    severity?: string,
    limit: number = 100
  ): Promise<CodeComplexityMetric[]> {
    let query = this.db.selectFrom('code_complexity_metrics').selectAll();

    if (filePath) {
      query = query.where('file_path', '=', filePath);
    }
    if (severity) {
      query = query.where('severity', '=', severity);
    }

    query = query.orderBy('measured_at', 'desc').limit(limit);

    const rows = await query.execute();

    return rows.map(row => ({
      id: row.id!,
      filePath: row.file_path,
      functionName: row.function_name,
      cyclomaticComplexity: row.cyclomatic_complexity,
      cognitiveComplexity: row.cognitive_complexity,
      linesOfCode: row.lines_of_code,
      maintainabilityIndex: row.maintainability_index,
      severity: row.severity,
      measuredAt: row.measured_at
    })) as CodeComplexityMetric[];
  }

  // Quality Gate operations
  async createQualityGate(gate: Omit<QualityGateConfig, 'id'>): Promise<string> {
    const result = await this.db
      .insertInto('quality_gates')
      .values({
        name: gate.name,
        enabled: gate.enabled,
        rules: JSON.stringify(gate.rules),
        created_at: gate.createdAt,
        updated_at: gate.updatedAt
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    
    return result.id!;
  }

  async getQualityGate(id: string): Promise<QualityGateConfig | null> {
    const row = await this.db
      .selectFrom('quality_gates')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) return null;

    return {
      id: row.id!,
      name: row.name,
      enabled: row.enabled,
      rules: JSON.parse(row.rules as string),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } as QualityGateConfig;
  }

  async getAllQualityGates(): Promise<QualityGateConfig[]> {
    const rows = await this.db
      .selectFrom('quality_gates')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(row => ({
      id: row.id!,
      name: row.name,
      enabled: row.enabled,
      rules: JSON.parse(row.rules as string),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })) as QualityGateConfig[];
  }

  async updateQualityGate(id: string, updates: Partial<QualityGateConfig>): Promise<QualityGateConfig> {
    const setValues: any = { ...updates };
    if (setValues.rules) {
      setValues.rules = JSON.stringify(setValues.rules);
    }
    if (setValues.updatedAt) {
      setValues.updated_at = setValues.updatedAt;
      delete setValues.updatedAt;
    }

    const result = await this.db
      .updateTable('quality_gates')
      .set({ ...setValues, updated_at: sql`CURRENT_TIMESTAMP` })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id!,
      name: result.name,
      enabled: result.enabled,
      rules: JSON.parse(result.rules as string),
      createdAt: result.created_at,
      updatedAt: result.updated_at
    } as QualityGateConfig;
  }

  async deleteQualityGate(id: string): Promise<void> {
    await this.db
      .deleteFrom('quality_gates')
      .where('id', '=', id)
      .execute();
  }

  // Dependency Health operations
  async upsertDependencyHealth(health: Omit<DependencyHealth, 'id'>): Promise<string> {
    // First try to find existing record by package name
    const existing = await this.db
      .selectFrom('dependency_health')
      .select('id')
      .where('package_name', '=', health.packageName)
      .executeTakeFirst();

    if (existing) {
      // Update existing
      await this.db
        .updateTable('dependency_health')
        .set({
          current_version: health.currentVersion,
          latest_version: health.latestVersion,
          is_outdated: health.isOutdated,
          security_vulnerabilities: health.securityVulnerabilities,
          license_compliance: health.licenseCompliance,
          maintenance_status: health.maintenanceStatus,
          last_updated: health.lastUpdated,
          health_score: health.healthScore,
          checked_at: health.checkedAt
        })
        .where('id', '=', existing.id)
        .execute();
      return existing.id!;
    } else {
      // Insert new
      const result = await this.db
        .insertInto('dependency_health')
        .values({
          package_name: health.packageName,
          current_version: health.currentVersion,
          latest_version: health.latestVersion,
          is_outdated: health.isOutdated,
          security_vulnerabilities: health.securityVulnerabilities,
          license_compliance: health.licenseCompliance,
          maintenance_status: health.maintenanceStatus,
          last_updated: health.lastUpdated,
          health_score: health.healthScore,
          checked_at: health.checkedAt
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return result.id!;
    }
  }

  async getDependencyHealth(packageName?: string): Promise<DependencyHealth[]> {
    let query = this.db.selectFrom('dependency_health').selectAll();

    if (packageName) {
      query = query.where('package_name', '=', packageName);
    }

    query = query.orderBy('health_score', 'asc'); // Show worst health first

    const rows = await query.execute();

    return rows.map(row => ({
      id: row.id!,
      packageName: row.package_name,
      currentVersion: row.current_version,
      latestVersion: row.latest_version,
      isOutdated: row.is_outdated,
      securityVulnerabilities: row.security_vulnerabilities,
      licenseCompliance: row.license_compliance,
      maintenanceStatus: row.maintenance_status,
      lastUpdated: row.last_updated,
      healthScore: row.health_score,
      checkedAt: row.checked_at
    })) as DependencyHealth[];
  }

  async getOutdatedDependencies(): Promise<DependencyHealth[]> {
    const rows = await this.db
      .selectFrom('dependency_health')
      .selectAll()
      .where('is_outdated', '=', true)
      .orderBy('health_score', 'asc')
      .execute();

    return rows.map(row => ({
      id: row.id!,
      packageName: row.package_name,
      currentVersion: row.current_version,
      latestVersion: row.latest_version,
      isOutdated: row.is_outdated,
      securityVulnerabilities: row.security_vulnerabilities,
      licenseCompliance: row.license_compliance,
      maintenanceStatus: row.maintenance_status,
      lastUpdated: row.last_updated,
      healthScore: row.health_score,
      checkedAt: row.checked_at
    })) as DependencyHealth[];
  }

  // Quality Reports operations
  async saveQualityReport(report: Omit<QualityReport, 'id'>): Promise<string> {
    const result = await this.db
      .insertInto('quality_reports')
      .values({
        project_name: report.projectName,
        commit_hash: report.commitHash,
        branch_name: report.branchName,
        generated_at: report.generatedAt,
        report_data: JSON.stringify(report)
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    
    return result.id!;
  }

  async getLatestQualityReport(projectName: string): Promise<QualityReport | null> {
    const row = await this.db
      .selectFrom('quality_reports')
      .selectAll()
      .where('project_name', '=', projectName)
      .orderBy('generated_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    if (!row) return null;

    return JSON.parse(row.report_data as string);
  }

  async getQualityReports(projectName: string, limit: number = 10): Promise<QualityReport[]> {
    const rows = await this.db
      .selectFrom('quality_reports')
      .selectAll()
      .where('project_name', '=', projectName)
      .orderBy('generated_at', 'desc')
      .limit(limit)
      .execute();

    return rows.map(row => JSON.parse(row.report_data as string));
  }

  // Utility methods
  async getQualityTrends(
    projectName: string,
    metricName: string,
    days: number = 30
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const results = await this.db
      .selectFrom('quality_metrics')
      .select(['timestamp', 'metric_value as value'])
      .where('project_name', '=', projectName)
      .where('metric_name', '=', metricName)
      .where('timestamp', '>=', sql<string>`CURRENT_TIMESTAMP - INTERVAL '${sql.raw(days.toString())} days'`)
      .orderBy('timestamp', 'asc')
      .execute();
    
    return results.map(r => ({
      timestamp: r.timestamp,
      value: Number(r.value)
    }));
  }

  async getDashboardStats(projectName: string): Promise<{
    totalDebtItems: number;
    unresolvedDebtItems: number;
    securityVulnerabilities: number;
    budgetViolations: number;
    highComplexityFunctions: number;
    outdatedDependencies: number;
    latestQualityScore: number | null;
  }> {
    const [debtStats, securityStats, budgetStats, complexityStats, dependencyStats, qualityStats] = await Promise.all([
      this.db
        .selectFrom('technical_debt_items')
        .select([
          sql`COUNT(*)`.as('total'),
          sql`COUNT(CASE WHEN resolved_at IS NULL THEN 1 END)`.as('unresolved')
        ])
        .executeTakeFirstOrThrow(),
      
      this.db
        .selectFrom('security_vulnerabilities')
        .select(sql`COUNT(*)`.as('count'))
        .where('resolved_at', 'is', null)
        .executeTakeFirstOrThrow(),
      
      this.db
        .selectFrom('performance_budgets')
        .select(sql`COUNT(*)`.as('count'))
        .where('is_compliant', '=', false)
        .executeTakeFirstOrThrow(),

      this.db
        .selectFrom('code_complexity_metrics')
        .select(sql`COUNT(*)`.as('count'))
        .where('severity', 'in', ['high', 'critical'])
        .executeTakeFirstOrThrow(),

      this.db
        .selectFrom('dependency_health')
        .select(sql`COUNT(*)`.as('count'))
        .where('is_outdated', '=', true)
        .executeTakeFirstOrThrow(),
      
      this.db
        .selectFrom('quality_metrics')
        .select('metric_value')
        .where('project_name', '=', projectName)
        .where('metric_name', '=', 'overall_quality_score')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .executeTakeFirst()
    ]);

    return {
      totalDebtItems: Number(debtStats.total),
      unresolvedDebtItems: Number(debtStats.unresolved),
      securityVulnerabilities: Number(securityStats.count),
      budgetViolations: Number(budgetStats.count),
      highComplexityFunctions: Number(complexityStats.count),
      outdatedDependencies: Number(dependencyStats.count),
      latestQualityScore: qualityStats ? Number(qualityStats.metric_value) : null
    };
  }

  async close(): Promise<void> {
    await this.dbManager.close();
  }
}