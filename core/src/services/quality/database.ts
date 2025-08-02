import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
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

export class QualityDatabase {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Quality metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_metrics (
        id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        commit_hash TEXT NOT NULL,
        branch_name TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_unit TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      );
    `);

    // Technical debt items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS technical_debt_items (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        debt_type TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        author TEXT,
        commit_hash TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        resolution_commit TEXT,
        estimated_effort REAL,
        category TEXT
      );
    `);

    // Security vulnerabilities table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS security_vulnerabilities (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        version TEXT NOT NULL,
        vulnerability_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        solution TEXT,
        detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        false_positive BOOLEAN DEFAULT FALSE
      );
    `);

    // Performance budgets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS performance_budgets (
        id TEXT PRIMARY KEY,
        bundle_name TEXT NOT NULL,
        type TEXT NOT NULL,
        maximum_warning TEXT NOT NULL,
        maximum_error TEXT NOT NULL,
        current_size TEXT NOT NULL,
        is_compliant BOOLEAN NOT NULL,
        last_checked TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Code complexity metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_complexity_metrics (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        function_name TEXT NOT NULL,
        cyclomatic_complexity INTEGER NOT NULL,
        cognitive_complexity INTEGER NOT NULL,
        lines_of_code INTEGER NOT NULL,
        maintainability_index REAL NOT NULL,
        severity TEXT NOT NULL,
        measured_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Quality gates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_gates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        rules TEXT NOT NULL, -- JSON
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Quality reports table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_reports (
        id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        commit_hash TEXT NOT NULL,
        branch_name TEXT NOT NULL,
        generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        report_data TEXT NOT NULL -- JSON
      );
    `);

    // Dependency health table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dependency_health (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        current_version TEXT NOT NULL,
        latest_version TEXT NOT NULL,
        is_outdated BOOLEAN NOT NULL,
        security_vulnerabilities INTEGER NOT NULL,
        license_compliance BOOLEAN NOT NULL,
        maintenance_status TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        health_score REAL NOT NULL,
        checked_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_project_time 
      ON quality_metrics(project_name, timestamp);
      
      CREATE INDEX IF NOT EXISTS idx_technical_debt_file 
      ON technical_debt_items(file_path, resolved_at);
      
      CREATE INDEX IF NOT EXISTS idx_security_vulnerabilities_severity 
      ON security_vulnerabilities(severity, resolved_at);
      
      CREATE INDEX IF NOT EXISTS idx_performance_budgets_compliance 
      ON performance_budgets(is_compliant, last_checked);
      
      CREATE INDEX IF NOT EXISTS idx_complexity_severity 
      ON code_complexity_metrics(severity, measured_at);
      
      CREATE INDEX IF NOT EXISTS idx_quality_reports_project 
      ON quality_reports(project_name, generated_at);
      
      CREATE INDEX IF NOT EXISTS idx_dependency_health_score 
      ON dependency_health(health_score, checked_at);
    `);
  }

  // Quality Metrics operations
  async insertQualityMetric(metric: Omit<QualityMetric, 'id'>): Promise<string> {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO quality_metrics 
      (id, project_name, commit_hash, branch_name, metric_type, metric_name, 
       metric_value, metric_unit, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      metric.projectName,
      metric.commitHash,
      metric.branchName,
      metric.metricType,
      metric.metricName,
      metric.metricValue,
      metric.metricUnit || null,
      metric.timestamp,
      metric.metadata ? JSON.stringify(metric.metadata) : null
    );
    
    return id;
  }

  async getQualityMetrics(
    projectName: string,
    metricType?: string,
    limit: number = 100
  ): Promise<QualityMetric[]> {
    let query = `
      SELECT * FROM quality_metrics 
      WHERE project_name = ?
    `;
    const params: any[] = [projectName];

    if (metricType) {
      query += ` AND metric_type = ?`;
      params.push(metricType);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      projectName: row.project_name,
      commitHash: row.commit_hash,
      branchName: row.branch_name,
      metricType: row.metric_type,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricUnit: row.metric_unit,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  // Technical Debt operations
  async insertTechnicalDebtItem(item: Omit<TechnicalDebtItem, 'id'>): Promise<string> {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO technical_debt_items 
      (id, file_path, line_number, debt_type, message, severity, author, 
       commit_hash, created_at, resolved_at, resolution_commit, estimated_effort, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      item.filePath,
      item.lineNumber,
      item.debtType,
      item.message,
      item.severity,
      item.author || null,
      item.commitHash || null,
      item.createdAt,
      item.resolvedAt || null,
      item.resolutionCommit || null,
      item.estimatedEffort || null,
      item.category || null
    );
    
    return id;
  }

  async getTechnicalDebtItems(
    filePath?: string,
    resolved?: boolean
  ): Promise<TechnicalDebtItem[]> {
    let query = `SELECT * FROM technical_debt_items WHERE 1=1`;
    const params: any[] = [];

    if (filePath) {
      query += ` AND file_path = ?`;
      params.push(filePath);
    }

    if (resolved !== undefined) {
      if (resolved) {
        query += ` AND resolved_at IS NOT NULL`;
      } else {
        query += ` AND resolved_at IS NULL`;
      }
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
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
    }));
  }

  async resolveTechnicalDebtItem(id: string, resolutionCommit: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE technical_debt_items 
      SET resolved_at = CURRENT_TIMESTAMP, resolution_commit = ?
      WHERE id = ?
    `);
    stmt.run(resolutionCommit, id);
  }

  // Security Vulnerabilities operations
  async insertSecurityVulnerability(vuln: Omit<SecurityVulnerability, 'id'>): Promise<string> {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO security_vulnerabilities 
      (id, package_name, version, vulnerability_id, severity, title, description, 
       solution, detected_at, resolved_at, false_positive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      vuln.packageName,
      vuln.version,
      vuln.vulnerabilityId,
      vuln.severity,
      vuln.title,
      vuln.description,
      vuln.solution || null,
      vuln.detectedAt,
      vuln.resolvedAt || null,
      vuln.falsePositive
    );
    
    return id;
  }

  async getSecurityVulnerabilities(resolved?: boolean): Promise<SecurityVulnerability[]> {
    let query = `SELECT * FROM security_vulnerabilities WHERE 1=1`;
    const params: any[] = [];

    if (resolved !== undefined) {
      if (resolved) {
        query += ` AND resolved_at IS NOT NULL`;
      } else {
        query += ` AND resolved_at IS NULL`;
      }
    }

    query += ` ORDER BY detected_at DESC`;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      packageName: row.package_name,
      version: row.version,
      vulnerabilityId: row.vulnerability_id,
      severity: row.severity,
      title: row.title,
      description: row.description,
      solution: row.solution,
      detectedAt: row.detected_at,
      resolvedAt: row.resolved_at,
      falsePositive: Boolean(row.false_positive)
    }));
  }

  // Performance Budget operations
  async upsertPerformanceBudget(budget: Omit<PerformanceBudget, 'id'>): Promise<string> {
    // First try to find existing budget by bundle name and type
    const existingStmt = this.db.prepare(`
      SELECT id FROM performance_budgets 
      WHERE bundle_name = ? AND type = ?
    `);
    const existing = existingStmt.get(budget.bundleName, budget.type) as any;

    if (existing) {
      // Update existing
      const updateStmt = this.db.prepare(`
        UPDATE performance_budgets 
        SET maximum_warning = ?, maximum_error = ?, current_size = ?, 
            is_compliant = ?, last_checked = ?
        WHERE id = ?
      `);
      updateStmt.run(
        budget.maximumWarning,
        budget.maximumError,
        budget.currentSize,
        budget.isCompliant,
        budget.lastChecked,
        existing.id
      );
      return existing.id;
    } else {
      // Insert new
      const id = uuidv4();
      const insertStmt = this.db.prepare(`
        INSERT INTO performance_budgets 
        (id, bundle_name, type, maximum_warning, maximum_error, current_size, 
         is_compliant, last_checked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(
        id,
        budget.bundleName,
        budget.type,
        budget.maximumWarning,
        budget.maximumError,
        budget.currentSize,
        budget.isCompliant,
        budget.lastChecked
      );
      return id;
    }
  }

  async getPerformanceBudgets(): Promise<PerformanceBudget[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM performance_budgets 
      ORDER BY last_checked DESC
    `);
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      bundleName: row.bundle_name,
      type: row.type,
      maximumWarning: row.maximum_warning,
      maximumError: row.maximum_error,
      currentSize: row.current_size,
      isCompliant: Boolean(row.is_compliant),
      lastChecked: row.last_checked
    }));
  }

  // Quality Reports operations
  async saveQualityReport(report: Omit<QualityReport, 'id'>): Promise<string> {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO quality_reports 
      (id, project_name, commit_hash, branch_name, generated_at, report_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      report.projectName,
      report.commitHash,
      report.branchName,
      report.generatedAt,
      JSON.stringify(report)
    );
    
    return id;
  }

  async getLatestQualityReport(projectName: string): Promise<QualityReport | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM quality_reports 
      WHERE project_name = ? 
      ORDER BY generated_at DESC 
      LIMIT 1
    `);
    const row = stmt.get(projectName) as any;

    if (!row) return null;

    return JSON.parse(row.report_data);
  }

  // Utility methods
  async getQualityTrends(
    projectName: string,
    metricName: string,
    days: number = 30
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const stmt = this.db.prepare(`
      SELECT timestamp, metric_value as value
      FROM quality_metrics 
      WHERE project_name = ? AND metric_name = ?
        AND datetime(timestamp) >= datetime('now', '-${days} days')
      ORDER BY timestamp ASC
    `);
    
    return stmt.all(projectName, metricName) as Array<{ timestamp: string; value: number }>;
  }

  async getDashboardStats(projectName: string): Promise<{
    totalDebtItems: number;
    unresolvedDebtItems: number;
    securityVulnerabilities: number;
    budgetViolations: number;
    latestQualityScore: number | null;
  }> {
    const debtStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as unresolved
      FROM technical_debt_items
    `);
    const debtStats = debtStmt.get() as any;

    const securityStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM security_vulnerabilities
      WHERE resolved_at IS NULL
    `);
    const securityStats = securityStmt.get() as any;

    const budgetStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM performance_budgets
      WHERE is_compliant = FALSE
    `);
    const budgetStats = budgetStmt.get() as any;

    const qualityStmt = this.db.prepare(`
      SELECT metric_value
      FROM quality_metrics
      WHERE project_name = ? AND metric_name = 'overall_quality_score'
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    const qualityStats = qualityStmt.get(projectName) as any;

    return {
      totalDebtItems: debtStats.total,
      unresolvedDebtItems: debtStats.unresolved,
      securityVulnerabilities: securityStats.count,
      budgetViolations: budgetStats.count,
      latestQualityScore: qualityStats?.metric_value || null
    };
  }

  close(): void {
    this.db.close();
  }
}