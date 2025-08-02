import type { QualityReport, QualityMetric } from '../types.js';

export interface DashboardData {
  overview: {
    qualityScore: number;
    grade: string;
    trend: string;
    lastScan: string;
  };
  metrics: {
    technicalDebt: number;
    securityIssues: number;
    performanceScore: number;
    testCoverage: number;
  };
  trends: Array<{
    date: string;
    score: number;
  }>;
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    count: number;
  }>;
}

export class DashboardReporter {
  generateDashboardData(
    report: QualityReport,
    metrics: QualityMetric[],
    trends: Array<{ timestamp: string; value: number }>
  ): DashboardData {
    return {
      overview: {
        qualityScore: report.overall.qualityScore,
        grade: report.overall.grade,
        trend: report.overall.trend,
        lastScan: report.generatedAt
      },
      metrics: {
        technicalDebt: report.technicalDebt.totalItems,
        securityIssues: report.security.vulnerabilityCount,
        performanceScore: report.performance.averageScore,
        testCoverage: report.coverage.percentage
      },
      trends: trends.map(trend => ({
        date: trend.timestamp,
        score: trend.value
      })),
      alerts: this.generateAlerts(report)
    };
  }

  private generateAlerts(report: QualityReport): DashboardData['alerts'] {
    const alerts: DashboardData['alerts'] = [];

    if (report.security.criticalCount > 0) {
      alerts.push({
        type: 'error',
        message: 'Critical security vulnerabilities found',
        count: report.security.criticalCount
      });
    }

    if (report.technicalDebt.totalItems > 50) {
      alerts.push({
        type: 'warning',
        message: 'High technical debt detected',
        count: report.technicalDebt.totalItems
      });
    }

    if (!report.performance.bundleCompliance) {
      alerts.push({
        type: 'warning',
        message: 'Performance budget violations',
        count: report.performance.failingBudgets
      });
    }

    if (report.coverage.percentage < 70) {
      alerts.push({
        type: 'info',
        message: 'Low test coverage',
        count: Math.round(report.coverage.percentage)
      });
    }

    return alerts;
  }
}