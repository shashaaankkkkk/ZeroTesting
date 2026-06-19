import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiFolder3Line, RiCodeSSlashLine, RiPlayCircleLine, RiCheckboxCircleLine, RiAlertLine } from 'react-icons/ri';
import { executionsApi } from '../api/executions';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, formatDuration, getStatusColor } from '../utils/formatters';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: executionsApi.dashboardStats,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['recent-executions'],
    queryFn: executionsApi.recentExecutions,
  });

  const { data: recentFailures } = useQuery({
    queryKey: ['recent-failures'],
    queryFn: executionsApi.recentFailures,
  });

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: () => executionsApi.trends(30),
  });

  if (statsLoading) return <LoadingSpinner />;

  const statCards = [
    { label: 'Projects', value: stats?.total_projects || 0, icon: RiFolder3Line, color: 'text-blue-600 bg-blue-50' },
    { label: 'Test Cases', value: stats?.total_test_cases || 0, icon: RiCodeSSlashLine, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Executions', value: stats?.total_executions || 0, icon: RiPlayCircleLine, color: 'text-green-600 bg-green-50' },
    { label: 'Pass Rate', value: `${stats?.pass_rate || 0}%`, icon: RiCheckboxCircleLine, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Failed Runs', value: stats?.failed_runs || 0, icon: RiAlertLine, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon size={18} />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Execution Trends (30 days)</h2>
          {trends && trends.length > 0 ? (
            <div className="space-y-2">
              {trends.slice(-10).map((point: any) => (
                <div key={point.date} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-gray-500 text-xs">{new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <div className="flex-1 flex gap-1 h-5">
                    {point.passed > 0 && (
                      <div className="bg-green-500 rounded-sm" style={{ width: `${(point.passed / point.total) * 100}%` }} />
                    )}
                    {point.failed > 0 && (
                      <div className="bg-red-500 rounded-sm" style={{ width: `${(point.failed / point.total) * 100}%` }} />
                    )}
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{point.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No execution data yet</p>
          )}
        </div>

        {/* Recent Executions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Executions</h2>
          </div>
          {recentRuns && recentRuns.length > 0 ? (
            <div className="space-y-2">
              {recentRuns.slice(0, 8).map((run: any) => (
                <div key={run.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{run.test_case_name}</p>
                    <p className="text-xs text-gray-400">{run.environment_name} · {formatDate(run.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatDuration(run.duration_ms)}</span>
                    <Badge className={getStatusColor(run.status)}>{run.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No executions yet</p>
          )}
        </div>
      </div>

      {/* Recent Failures */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Failures</h2>
        {recentFailures && recentFailures.length > 0 ? (
          <div className="space-y-2">
            {recentFailures.slice(0, 5).map((run: any) => (
              <div key={run.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{run.test_case_name}</p>
                  <p className="text-xs text-gray-400">{run.environment_name} · {formatDate(run.created_at)}</p>
                </div>
                <Badge className={getStatusColor(run.status)}>{run.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No failures — great job! 🎉</p>
        )}
      </div>
    </div>
  );
}
