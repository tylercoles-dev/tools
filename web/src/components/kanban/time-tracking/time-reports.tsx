'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Clock,
  DollarSign,
  Calendar,
  Download,
  Filter,
  TrendingUp,
  Target,
  Users,
  PieChart
} from 'lucide-react';
import type { TimeEntry } from './time-tracker';

interface TimeReport {
  date_range: {
    from: string;
    to: string;
  };
  total_time_minutes: number;
  billable_time_minutes: number;
  total_earnings: number;
  entries_count: number;
  cards_worked_on: number;
  average_session_minutes: number;
  by_card: Array<{
    card_id: string;
    card_title: string;
    total_minutes: number;
    billable_minutes: number;
    earnings: number;
    entries_count: number;
  }>;
  by_day: Array<{
    date: string;
    total_minutes: number;
    billable_minutes: number;
    earnings: number;
    entries_count: number;
  }>;
  by_user: Array<{
    user_name: string;
    total_minutes: number;
    billable_minutes: number;
    earnings: number;
    entries_count: number;
  }>;
}

interface TimeReportsProps {
  boardId?: string;
  report?: TimeReport;
  onGenerateReport: (dateRange: { from: string; to: string }) => void;
  onExportReport: (format: 'csv' | 'pdf') => void;
}

export function TimeReports({
  boardId,
  report,
  onGenerateReport,
  onExportReport,
}: TimeReportsProps) {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0], // Today
  });

  const handleGenerateReport = () => {
    onGenerateReport(dateRange);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getUtilizationRate = (): number => {
    if (!report || report.total_time_minutes === 0) return 0;
    return (report.billable_time_minutes / report.total_time_minutes) * 100;
  };

  const getAverageHourlyRate = (): number => {
    if (!report || report.billable_time_minutes === 0) return 0;
    return (report.total_earnings / (report.billable_time_minutes / 60));
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Time Tracking Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <Button onClick={handleGenerateReport}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Total Time</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatDuration(report.total_time_minutes)}
                </div>
                <div className="text-sm text-gray-500">
                  {report.entries_count} entries
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Billable Time</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatDuration(report.billable_time_minutes)}
                </div>
                <div className="text-sm text-gray-500">
                  {Math.round(getUtilizationRate())}% utilization
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Earnings</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.total_earnings)}
                </div>
                <div className="text-sm text-gray-500">
                  ${getAverageHourlyRate().toFixed(0)}/hr avg
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Cards</span>
                </div>
                <div className="text-2xl font-bold">
                  {report.cards_worked_on}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDuration(report.average_session_minutes)} avg session
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Reports */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Detailed Reports</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onExportReport('csv')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onExportReport('pdf')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="by-card">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="by-card">By Card</TabsTrigger>
                  <TabsTrigger value="by-day">By Day</TabsTrigger>
                  <TabsTrigger value="by-user">By User</TabsTrigger>
                </TabsList>

                <TabsContent value="by-card" className="space-y-4">
                  <div className="space-y-3">
                    {report.by_card.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No card data available</p>
                      </div>
                    ) : (
                      report.by_card
                        .sort((a, b) => b.total_minutes - a.total_minutes)
                        .map((card) => {
                          const utilizationRate = card.total_minutes > 0 
                            ? (card.billable_minutes / card.total_minutes) * 100 
                            : 0;
                          
                          return (
                            <div
                              key={card.card_id}
                              className="p-4 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium">{card.card_title}</h4>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                    <span>{card.entries_count} entries</span>
                                    <span>{formatDuration(card.total_minutes)}</span>
                                    {card.earnings > 0 && (
                                      <span className="text-green-600">
                                        {formatCurrency(card.earnings)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {Math.round(utilizationRate)}% billable
                                </Badge>
                              </div>
                              
                              {card.total_minutes > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Billable vs Total Time</span>
                                    <span>
                                      {formatDuration(card.billable_minutes)} / {formatDuration(card.total_minutes)}
                                    </span>
                                  </div>
                                  <Progress value={utilizationRate} className="h-2" />
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="by-day" className="space-y-4">
                  <div className="space-y-3">
                    {report.by_day.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No daily data available</p>
                      </div>
                    ) : (
                      report.by_day
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((day) => {
                          const utilizationRate = day.total_minutes > 0 
                            ? (day.billable_minutes / day.total_minutes) * 100 
                            : 0;
                          
                          return (
                            <div
                              key={day.date}
                              className="p-4 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-medium">
                                    {new Date(day.date).toLocaleDateString([], {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </h4>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                    <span>{day.entries_count} entries</span>
                                    <span>{formatDuration(day.total_minutes)}</span>
                                    {day.earnings > 0 && (
                                      <span className="text-green-600">
                                        {formatCurrency(day.earnings)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {Math.round(utilizationRate)}% billable
                                </Badge>
                              </div>
                              
                              {day.total_minutes > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Billable vs Total Time</span>
                                    <span>
                                      {formatDuration(day.billable_minutes)} / {formatDuration(day.total_minutes)}
                                    </span>
                                  </div>
                                  <Progress value={utilizationRate} className="h-2" />
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="by-user" className="space-y-4">
                  <div className="space-y-3">
                    {report.by_user.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No user data available</p>
                      </div>
                    ) : (
                      report.by_user
                        .sort((a, b) => b.total_minutes - a.total_minutes)
                        .map((user) => {
                          const utilizationRate = user.total_minutes > 0 
                            ? (user.billable_minutes / user.total_minutes) * 100 
                            : 0;
                          const avgHourlyRate = user.billable_minutes > 0 
                            ? (user.earnings / (user.billable_minutes / 60))
                            : 0;
                          
                          return (
                            <div
                              key={user.user_name}
                              className="p-4 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium">{user.user_name}</h4>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                    <span>{user.entries_count} entries</span>
                                    <span>{formatDuration(user.total_minutes)}</span>
                                    {user.earnings > 0 && (
                                      <>
                                        <span className="text-green-600">
                                          {formatCurrency(user.earnings)}
                                        </span>
                                        <span>${avgHourlyRate.toFixed(0)}/hr</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {Math.round(utilizationRate)}% billable
                                </Badge>
                              </div>
                              
                              {user.total_minutes > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Billable vs Total Time</span>
                                    <span>
                                      {formatDuration(user.billable_minutes)} / {formatDuration(user.total_minutes)}
                                    </span>
                                  </div>
                                  <Progress value={utilizationRate} className="h-2" />
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {!report && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Generate Time Report
            </h3>
            <p className="text-gray-500 mb-4">
              Select a date range and generate a comprehensive time tracking report
            </p>
            <Button onClick={handleGenerateReport}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}