import React from 'react';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <AnalyticsDashboard />
    </div>
  );
}

export const metadata = {
  title: 'Analytics - MCP Tools',
  description: 'Track your productivity and system performance with detailed analytics and insights.',
};