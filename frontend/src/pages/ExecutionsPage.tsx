import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RiFolderShieldLine, RiEyeLine } from 'react-icons/ri';
import { executionsApi } from '../api/executions';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import SearchInput from '../components/ui/SearchInput';
import Badge from '../components/ui/Badge';
import { formatDate, formatDuration } from '../utils/formatters';

export default function ExecutionsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['executions', projectId, search, page],
    queryFn: () => executionsApi.list(projectId!, { search, page: page.toString() }),
    enabled: !!projectId,
  });

  if (isLoading) return <LoadingSpinner />;

  const runs = data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search execution history..." />
        </div>
      </div>

      {runs.length === 0 ? (
        <EmptyState
          icon={<RiFolderShieldLine size={48} />}
          title="No Execution Runs yet"
          description="Runs list displays histories of launched automation executions."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-3">Run ID / Test Case</th>
                <th className="px-6 py-3">Environment</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Triggered By</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Executed At</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {runs.map((run: any) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{run.test_case_name || 'Automation Test'}</div>
                    <div className="text-xs font-mono text-gray-400">{run.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                      {run.environment_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={
                      run.status === 'passed' ? 'bg-green-50 text-green-700 border border-green-100' :
                      run.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
                      run.status === 'running' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      'bg-gray-100 text-gray-600'
                    }>
                      {run.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{run.triggered_by_name || 'System'}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{formatDuration(run.duration_ms)}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDate(run.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/projects/${projectId}/executions/${run.id}`}>
                      <Button variant="secondary" size="sm">
                        <RiEyeLine size={14} className="mr-1" /> View Details
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <span className="text-xs text-gray-500">Page {page} of {data.total_pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
