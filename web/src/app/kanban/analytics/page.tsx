'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Users, 
  Target,
  Clock,
  ArrowLeft,
  Download,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { KanbanActivityFeed, KanbanAnalyticsDashboard } from '@/components/kanban';

export default function KanbanAnalyticsPage() {
  const handleExportData = () => {
    // Implement data export functionality
    console.log('Exporting analytics data...');
  };

  const handleRefreshAll = () => {
    // Implement global refresh functionality
    console.log('Refreshing all analytics...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/kanban" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Kanban Analytics</h1>
                  <p className="text-sm text-gray-500">Performance insights and activity tracking</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefreshAll}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh All
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Feed
            </TabsTrigger>
            <TabsTrigger value="productivity" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Productivity
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Efficiency</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">87%</p>
                <p className="text-sm text-gray-500">Average completion rate</p>
              </Card>
              
              <Card className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Cycle Time</h3>
                <p className="text-3xl font-bold text-green-600 mb-2">3.2d</p>
                <p className="text-sm text-gray-500">Average time to complete</p>
              </Card>
              
              <Card className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Velocity</h3>
                <p className="text-3xl font-bold text-purple-600 mb-2">24</p>
                <p className="text-sm text-gray-500">Cards completed this week</p>
              </Card>
            </div>

            <KanbanAnalyticsDashboard className="w-full" />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <KanbanActivityFeed 
                  limit={50}
                  showRefresh={true}
                  className="h-full"
                />
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cards Created</span>
                      <Badge variant="outline">12</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cards Moved</span>
                      <Badge variant="outline">28</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Comments Added</span>
                      <Badge variant="outline">15</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Time Logged</span>
                      <Badge variant="outline">42h</Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Top Contributors</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Alice Johnson', actions: 32, color: 'bg-blue-500' },
                      { name: 'Bob Smith', actions: 28, color: 'bg-green-500' },
                      { name: 'Carol Davis', actions: 19, color: 'bg-purple-500' },
                      { name: 'David Wilson', actions: 15, color: 'bg-orange-500' }
                    ].map((user, index) => (
                      <div key={user.name} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-white text-sm font-medium`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.actions} actions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="productivity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">User Performance</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Alice Johnson', completed: 15, inProgress: 3, efficiency: 94 },
                    { name: 'Bob Smith', completed: 12, inProgress: 2, efficiency: 89 },
                    { name: 'Carol Davis', completed: 10, inProgress: 4, efficiency: 78 },
                    { name: 'David Wilson', completed: 8, inProgress: 1, efficiency: 92 }
                  ].map((user) => (
                    <div key={user.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{user.name}</h4>
                        <Badge variant={user.efficiency > 90 ? 'default' : user.efficiency > 80 ? 'secondary' : 'outline'}>
                          {user.efficiency}% efficiency
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="text-green-600 font-medium">{user.completed}</span> completed
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">{user.inProgress}</span> in progress
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Team Metrics</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Velocity Trend</span>
                      <Badge variant="default" className="bg-green-500">+15%</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-green-500 h-3 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Quality Score</span>
                      <Badge variant="default" className="bg-blue-500">92%</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">On-time Delivery</span>
                      <Badge variant="default" className="bg-purple-500">87%</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-purple-500 h-3 rounded-full" style={{ width: '87%' }}></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Throughput</h3>
                <p className="text-2xl font-bold text-blue-600">8.5</p>
                <p className="text-xs text-gray-500">cards/day</p>
              </Card>
              
              <Card className="p-6 text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Lead Time</h3>
                <p className="text-2xl font-bold text-green-600">4.2d</p>
                <p className="text-xs text-gray-500">average</p>
              </Card>
              
              <Card className="p-6 text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-2">WIP Limit</h3>
                <p className="text-2xl font-bold text-orange-600">12/15</p>
                <p className="text-xs text-gray-500">current/limit</p>
              </Card>
              
              <Card className="p-6 text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Blocked Items</h3>
                <p className="text-2xl font-bold text-red-600">2</p>
                <p className="text-xs text-gray-500">cards blocked</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Performance charts would be integrated here</p>
                  <p className="text-sm mt-1">Showing velocity, burndown, and cumulative flow diagrams</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}