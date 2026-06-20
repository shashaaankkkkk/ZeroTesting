import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RiAlertLine,
  RiEyeLine,
  RiCheckDoubleLine,
  RiTerminalWindowLine,
  RiSparkling2Line,
} from 'react-icons/ri';
import { failuresApi } from '../api/failures';
import { executionsApi } from '../api/executions';
import { aiApi } from '../api/ai';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import SearchInput from '../components/ui/SearchInput';
import Badge from '../components/ui/Badge';
import { useUIStore } from '../stores/uiStore';
import { formatDate } from '../utils/formatters';

const getTicketUrl = (url: string | null, ticket: string) => {
  if (!url) return '';
  if (url.includes('ticket=')) return url;
  if (!ticket) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ticket=${encodeURIComponent(ticket)}`;
};

export default function FailuresPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedFailure, setSelectedFailure] = useState<any>(null);
  const [downloadTicket, setDownloadTicket] = useState<string>('');

  useEffect(() => {
    if (selectedFailure) {
      executionsApi.createTicket()
        .then((res) => setDownloadTicket(res.ticket))
        .catch(() => {});
    }
  }, [selectedFailure?.id]);

  const [form, setForm] = useState({
    status: 'open',
    notes: '',
  });

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiApi.status(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['failures', projectId, search, status, page],
    queryFn: () => failuresApi.list(projectId!, { search, status, page: page.toString() }),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => failuresApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failures'] });
      if (selectedFailure) {
        // Refresh detail view
        failuresApi.get(selectedFailure.id).then((refreshed: any) => setSelectedFailure(refreshed));
      }
      addToast('success', 'Failure status updated');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to update failure');
    },
  });

  const aiSummaryMutation = useMutation({
    mutationFn: (fail: any) =>
      aiApi.failureSummary({
        expected: fail.expected_result,
        actual: fail.actual_result,
        error_message: fail.error_message || '',
        console_logs: fail.console_logs || '',
      }),
    onSuccess: (res: any) => {
      // Temporarily update summary locally in selection
      setSelectedFailure((prev: any) => ({ ...prev, ai_summary: res.summary }));
      addToast('success', 'AI failure analysis generated');
    },
    onError: () => {
      addToast('error', 'AI analysis failed');
    },
  });

  const handleOpenDetail = (fail: any) => {
    setSelectedFailure(fail);
    setForm({
      status: fail.status,
      notes: fail.notes || '',
    });
  };

  if (isLoading) return <LoadingSpinner />;

  const failures = data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search failures..." />
        </div>
        <Select
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'open', label: 'Open' },
            { value: 'investigating', label: 'Investigating' },
            { value: 'fixed', label: 'Fixed' },
            { value: 'closed', label: 'Closed' },
          ]}
          value={status}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
        />
      </div>

      {failures.length === 0 ? (
        <EmptyState
          icon={<RiAlertLine size={48} />}
          title="No Failure Records"
          description="Failures are automatically logged here when a visual automation test execution fails."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-3">Failure ID</th>
                <th className="px-6 py-3">Test Case</th>
                <th className="px-6 py-3">Environment</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Logged Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {failures.map((fail: any) => (
                <tr key={fail.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700">{fail.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{fail.test_case_name}</td>
                  <td className="px-6 py-4 text-gray-600">{fail.environment_name}</td>
                  <td className="px-6 py-4">
                    <Badge className={
                      fail.status === 'open' ? 'bg-red-50 text-red-700 border border-red-100' :
                      fail.status === 'investigating' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                      fail.status === 'fixed' ? 'bg-green-50 text-green-700 border border-green-100' :
                      'bg-gray-100 text-gray-600'
                    }>
                      {fail.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDate(fail.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenDetail(fail)}>
                      <RiEyeLine size={14} className="mr-1" /> Investigate
                    </Button>
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

      {/* Investigate Detail Modal */}
      {selectedFailure && (
        <Modal isOpen={!!selectedFailure} onClose={() => setSelectedFailure(null)} title="Investigate Test Failure" size="xl">
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500 border-b border-gray-100 pb-3">
              <div><span className="font-semibold text-gray-700">Test:</span> {selectedFailure.test_case_name}</div>
              <div><span className="font-semibold text-gray-700">Environment:</span> {selectedFailure.environment_name}</div>
              <div><span className="font-semibold text-gray-700">Run ID:</span> <Link to={`/projects/${projectId}/executions/${selectedFailure.execution_run}`} className="text-blue-600 hover:underline">{selectedFailure.execution_run?.slice(0, 8)}</Link></div>
              <div><span className="font-semibold text-gray-700">Date:</span> {formatDate(selectedFailure.created_at)}</div>
            </div>

            {/* AI Analysis Panel */}
            {aiStatus?.enabled && (
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-2">
                <div className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                  <RiSparkling2Line className="text-purple-600" /> Gemini AI Failure Analysis
                </div>
                {selectedFailure.ai_summary ? (
                  <p className="text-xs text-purple-900 leading-relaxed italic">"{selectedFailure.ai_summary}"</p>
                ) : (
                  <div>
                    <p className="text-[11px] text-purple-700 mb-2">No summary available. Get a natural language analysis explaining this failure.</p>
                    <Button size="sm" onClick={() => aiSummaryMutation.mutate(selectedFailure)} loading={aiSummaryMutation.isPending}>
                      <RiSparkling2Line /> Analyze with AI
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                <div className="text-xs font-bold text-gray-500 mb-1">EXPECTED RESULT</div>
                <div className="text-xs font-mono text-gray-700 break-all">{selectedFailure.expected_result}</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg">
                <div className="text-xs font-bold text-red-500 mb-1">ACTUAL RESULT</div>
                <div className="text-xs font-mono text-red-700 break-all">{selectedFailure.actual_result}</div>
              </div>
            </div>

            {selectedFailure.screenshot_path && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700">Failure Screenshot</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={getTicketUrl(`/api/v1/artifacts/download/?path=${encodeURIComponent(selectedFailure.screenshot_path)}`, downloadTicket)}
                    alt="Failure Screenshot"
                    className="w-full h-auto object-contain max-h-[300px]"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.className = 'hidden';
                    }}
                  />
                </div>
              </div>
            )}

            {selectedFailure.console_logs && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-700 flex items-center gap-1"><RiTerminalWindowLine /> Console / CLI Logs</div>
                <pre className="bg-gray-950 text-gray-100 font-mono text-[10px] p-3 rounded-lg overflow-auto max-h-40">{selectedFailure.console_logs}</pre>
              </div>
            )}

            {/* Notes & Status Form */}
            <form
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                updateMutation.mutate({ id: selectedFailure.id, data: form });
              }}
              className="space-y-4 border-t border-gray-100 pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1">
                  <Select
                    label="Failure Status"
                    options={[
                      { value: 'open', label: 'Open' },
                      { value: 'investigating', label: 'Investigating' },
                      { value: 'fixed', label: 'Fixed' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                    value={form.status}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, status: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Investigation Notes"
                    value={form.notes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Describe issue (e.g. element selector broke)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setSelectedFailure(null)} type="button">Cancel</Button>
                <Button type="submit" loading={updateMutation.isPending}>
                  <RiCheckDoubleLine size={16} /> Save Status
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
