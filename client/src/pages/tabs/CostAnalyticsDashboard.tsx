import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { AlertTriangle, TrendingDown, TrendingUp, DollarSign, BarChart3, PieChart } from 'lucide-react';

interface CostAnalyticsDashboardProps {
  projectId: number;
}

export default function CostAnalyticsDashboard({ projectId }: CostAnalyticsDashboardProps) {
  const [budget, setBudget] = useState<number>(5000);
  const [selectedProvider1, setSelectedProvider1] = useState<'veo3' | 'sora' | 'flow'>('veo3');
  const [selectedProvider2, setSelectedProvider2] = useState<'veo3' | 'sora' | 'flow'>('sora');

  // Fetch cost statistics
  const statsQuery = trpc.advancedFeatures.costAnalytics.getStats.useQuery({ projectId });
  const providerStatsQuery = trpc.advancedFeatures.costAnalytics.getProviderStats.useQuery({
    projectId,
    provider: selectedProvider1,
  });
  const trendsQuery = trpc.advancedFeatures.costAnalytics.getTrends.useQuery({
    projectId,
    days: 30,
  });
  const comparisonQuery = trpc.advancedFeatures.costAnalytics.compareProviders.useQuery({
    projectId,
    provider1: selectedProvider1,
    provider2: selectedProvider2,
  });
  const recommendationsQuery = trpc.advancedFeatures.costAnalytics.getRecommendations.useQuery({
    projectId,
  });
  const budgetQuery = trpc.advancedFeatures.costAnalytics.getBudgetStatus.useQuery({
    projectId,
    budget,
  });

  const stats = statsQuery.data;
  const budgetStatus = budgetQuery.data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Cost Analytics</h2>
        <p className="text-gray-400">Track and analyze video generation costs</p>
      </div>

      {/* Budget Alert */}
      {budgetStatus && (
        <Alert
          className={`border-l-4 ${
            budgetStatus.warningLevel === 'critical'
              ? 'border-red-500 bg-red-50'
              : budgetStatus.warningLevel === 'warning'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-green-500 bg-green-50'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {budgetStatus.warningLevel === 'critical'
              ? `Budget exceeded! Used ${budgetStatus.totalCost} of ${budgetStatus.budget} credits`
              : budgetStatus.warningLevel === 'warning'
              ? `Budget warning: ${budgetStatus.utilization.toFixed(1)}% used`
              : `Budget healthy: ${budgetStatus.remaining} credits remaining`}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCost || 0}</div>
            <p className="text-xs text-gray-500">credits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.generationCount || 0}</div>
            <p className="text-xs text-gray-500">total videos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Average Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageCost?.toFixed(0) || 0}</div>
            <p className="text-xs text-gray-500">per video</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Budget Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetStatus?.utilization.toFixed(1) || 0}%</div>
            <p className="text-xs text-gray-500">of budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats?.breakdown && (
                <div className="space-y-3">
                  {Object.entries(stats.breakdown).map(([provider, cost]: [string, any]) => (
                    <div key={provider} className="flex items-center justify-between">
                      <span className="capitalize text-gray-400">{provider}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-cyan-500 h-2 rounded-full"
                            style={{
                              width: `${(cost / (stats.totalCost || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-bold w-16 text-right">{cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats?.qualityBreakdown && (
                <div className="space-y-3">
                  {Object.entries(stats.qualityBreakdown).map(([quality, cost]: [string, any]) => (
                    <div key={quality} className="flex items-center justify-between">
                      <span className="capitalize text-gray-400">{quality}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{
                              width: `${(cost / (stats.totalCost || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-bold w-16 text-right">{cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          {recommendationsQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span>
                    Most cost-effective:{' '}
                    <span className="font-bold capitalize">
                      {recommendationsQuery.data.mostCostEffective}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span>
                    Most reliable:{' '}
                    <span className="font-bold capitalize">
                      {recommendationsQuery.data.mostReliable}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {providerStatsQuery.data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Total Cost</p>
                      <p className="text-2xl font-bold">
                        {providerStatsQuery.data.totalCost}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Generations</p>
                      <p className="text-2xl font-bold">
                        {providerStatsQuery.data.totalGenerations}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {providerStatsQuery.data.successRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Avg Duration</p>
                      <p className="text-2xl font-bold">
                        {providerStatsQuery.data.averageDuration.toFixed(1)}s
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <select
              value={selectedProvider1}
              onChange={(e) => setSelectedProvider1(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            >
              <option value="veo3">Veo3</option>
              <option value="sora">Sora</option>
              <option value="flow">Flow</option>
            </select>
            <span className="text-gray-400">vs</span>
            <select
              value={selectedProvider2}
              onChange={(e) => setSelectedProvider2(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            >
              <option value="veo3">Veo3</option>
              <option value="sora">Sora</option>
              <option value="flow">Flow</option>
            </select>
          </div>

          {comparisonQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle>Provider Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 capitalize">
                      {comparisonQuery.data.provider1}
                    </p>
                    <p className="text-2xl font-bold">
                      {comparisonQuery.data.provider1Cost}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 capitalize">
                      {comparisonQuery.data.provider2}
                    </p>
                    <p className="text-2xl font-bold">
                      {comparisonQuery.data.provider2Cost}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-800 rounded p-4">
                  <p className="text-sm text-gray-400">Savings</p>
                  <p className="text-2xl font-bold text-green-500">
                    {comparisonQuery.data.savings} credits
                  </p>
                  <p className="text-sm text-gray-400">
                    {comparisonQuery.data.savingsPercent.toFixed(1)}% cheaper
                  </p>
                  <p className="text-sm text-cyan-400 mt-2">
                    Winner: <span className="capitalize font-bold">
                      {comparisonQuery.data.winner}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Cost Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {trendsQuery.data && trendsQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {trendsQuery.data.slice(-7).map((trend: any) => (
                    <div key={trend.date.toString()} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        {new Date(trend.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, (trend.dailyCost / 500) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-bold w-16 text-right">
                          {trend.dailyCost} credits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No cost data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Project Budget (credits)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          {budgetStatus && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400">Used</p>
                <p className="text-lg font-bold">{budgetStatus.totalCost}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Remaining</p>
                <p className="text-lg font-bold text-green-500">
                  {budgetStatus.remaining}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Utilization</p>
                <p className="text-lg font-bold">
                  {budgetStatus.utilization.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
