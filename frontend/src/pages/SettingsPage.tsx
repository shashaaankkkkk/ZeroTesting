import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiSettings4Line, RiSparkling2Line, RiServerLine } from 'react-icons/ri';
import { aiApi } from '../api/ai';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function SettingsPage() {
  const { data: aiStatus, isLoading } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiApi.status(),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-2xl bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
        <RiSettings4Line size={20} className="text-gray-500" />
        <h2 className="text-base font-bold text-gray-900">Platform Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Gemini AI Status section */}
        <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <RiSparkling2Line className="text-purple-600" /> Gemini AI Service Integration
            </div>
            <p className="text-xs text-gray-500">
              Converts natural language descriptions into automated step workflows and automatically summarizes test failures.
            </p>
          </div>
          <Badge className={aiStatus?.enabled ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-150 text-gray-600'}>
            {aiStatus?.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {/* Server status details */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><RiServerLine /> Deployment Info</div>
          <div className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-gray-600">
            <div><span className="text-gray-400">Environment:</span> Development / MVP</div>
            <div><span className="text-gray-400">API Prefix:</span> {import.meta.env.VITE_API_URL || '/api/v1'}</div>
            <div><span className="text-gray-400">Storage Backend:</span> Local Volumes</div>
            <div><span className="text-gray-400">Orchestrator:</span> Celery (Redis)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
