import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  RiTimeLine,
  RiGlobalLine,
  RiCloseCircleLine,
  RiCheckboxCircleLine,
  RiImageLine,
  RiAlertLine,
  RiFileCopyLine,
  RiEyeLine,
} from 'react-icons/ri';
import { executionsApi } from '../api/executions';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useUIStore } from '../stores/uiStore';
import { usePolling } from '../hooks/usePolling';
import { formatDate, formatDuration } from '../utils/formatters';

const getTicketUrl = (url: string | null, ticket: string) => {
  if (!url) return '';
  if (url.includes('ticket=')) return url;
  if (!ticket) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ticket=${encodeURIComponent(ticket)}`;
};

export default function ExecutionDetailPage() {
  const { runId } = useParams<{ id: string; runId: string }>();
  const { addToast } = useUIStore();
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [viewingLog, setViewingLog] = useState<{ name: string; content: string } | null>(null);
  const [loadingLogId, setLoadingLogId] = useState<string | null>(null);
  const [downloadTicket, setDownloadTicket] = useState<string>('');

  useEffect(() => {
    executionsApi.createTicket()
      .then((res) => setDownloadTicket(res.ticket))
      .catch(() => {});
  }, [runId]);

  const handleViewLog = async (art: any) => {
    setLoadingLogId(art.id);
    try {
      const url = getTicketUrl(art.download_url, downloadTicket);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch log content');
      }
      const text = await response.text();
      let formattedContent = text;
      try {
        const json = JSON.parse(text);
        formattedContent = JSON.stringify(json, null, 2);
      } catch (e) {
        // Keep as text
      }
      setViewingLog({ name: art.file_name, content: formattedContent });
    } catch (err) {
      addToast('error', 'Failed to load log file');
    } finally {
      setLoadingLogId(null);
    }
  };

  // Fetch Execution details
  const { data: run, isLoading, refetch } = useQuery({
    queryKey: ['execution', runId],
    queryFn: () => executionsApi.get(runId!),
    enabled: !!runId,
  });

  // Cancel execution mutation
  const cancelMutation = useMutation({
    mutationFn: () => executionsApi.cancel(runId!),
    onSuccess: () => {
      refetch();
      addToast('success', 'Execution cancelled successfully');
    },
    onError: () => {
      addToast('error', 'Failed to cancel execution');
    },
  });

  // Poll status while execution is running or pending
  usePolling(
    () => {
      if (run && (run.status === 'running' || run.status === 'pending')) {
        refetch();
      }
    },
    2000,
    run && (run.status === 'running' || run.status === 'pending')
  );

  if (isLoading) return <LoadingSpinner />;
  if (!run) return <div className="text-center py-12 text-sm text-gray-500">Execution not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">Run Details: {run.test_case_name}</h2>
            <Badge className={
              run.status === 'passed' ? 'bg-green-50 text-green-700 border border-green-100' :
              run.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
              run.status === 'running' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
              'bg-gray-100 text-gray-600'
            }>
              {run.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><RiTimeLine /> {formatDuration(run.duration_ms)}</span>
            <span className="flex items-center gap-1"><RiGlobalLine /> {run.environment_name}</span>
            <span className="flex items-center gap-1">Steps: {run.passed_steps} / {run.total_steps}</span>
            <span>Started: {formatDate(run.started_at)}</span>
          </div>
        </div>

        {(run.status === 'running' || run.status === 'pending') && (
          <Button variant="danger" onClick={() => cancelMutation.mutate()} loading={cancelMutation.isPending}>
            <RiCloseCircleLine size={16} /> Cancel Run
          </Button>
        )}
      </div>

      {run.error_message && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
          <RiAlertLine size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold mb-1">Execution Error</div>
            <pre className="font-mono text-xs break-all whitespace-pre-wrap">{run.error_message}</pre>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Step Results list */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Execution Steps</h3>
            <div className="relative pl-8 border-l border-gray-200 ml-4 space-y-4">
              {(run.step_results || []).map((stepResult: any, idx: number) => (
                <div
                  key={stepResult.id}
                  onClick={() => setSelectedStep(stepResult)}
                  className={`relative flex items-start gap-4 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStep?.id === stepResult.id ? 'bg-blue-50/30 border-blue-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Timeline connector step index bubble */}
                  <span className={`absolute -left-[44px] top-3.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shrink-0 shadow-md text-[10px] font-bold text-white transition-all ${
                    selectedStep?.id === stepResult.id ? 'scale-110 ring-2 ring-blue-500/20' : ''
                  } ${
                    stepResult.status === 'passed' ? 'bg-green-500' :
                    stepResult.status === 'failed' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}>
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-700 bg-gray-200 px-1 rounded uppercase">
                        {stepResult.action}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">{stepResult.description || `Step ${idx + 1}`}</span>
                    </div>
                    {stepResult.target && (
                      <div className="text-[11px] font-mono text-gray-500 mt-1 truncate">Target: {stepResult.target}</div>
                    )}
                    {stepResult.error_message && (
                      <div className="text-xs text-red-600 font-mono mt-2 bg-red-50 p-2 rounded border border-red-100/50 break-all">
                        {stepResult.error_message}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs text-gray-400 font-mono shrink-0">
                    {formatDuration(stepResult.duration_ms)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Step Evidence panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[400px]">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">Step Evidence / Artifacts</h3>
            {selectedStep ? (
              <div className="space-y-4">
                <div className="text-xs space-y-1">
                  <div><span className="text-gray-400 font-semibold">Action:</span> <span className="font-mono">{selectedStep.action}</span></div>
                  <div><span className="text-gray-400 font-semibold">Status:</span> <span className="font-mono font-bold capitalize">{selectedStep.status}</span></div>
                  <div><span className="text-gray-400 font-semibold">Duration:</span> <span className="font-mono">{selectedStep.duration_ms} ms</span></div>
                </div>

                {selectedStep.screenshot_path ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700 flex items-center gap-1"><RiImageLine /> Screenshot</div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={getTicketUrl(`/api/v1/artifacts/download/?path=${encodeURIComponent(selectedStep.screenshot_path)}`, downloadTicket)}
                        alt="Step Screenshot"
                        className="w-full h-auto object-contain max-h-[300px]"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.className = 'hidden';
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center justify-center gap-1">
                    <RiImageLine size={24} /> No screenshot captured for this step
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Live execution browser simulator */}
                {(run.status === 'running' || run.status === 'pending') ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                        Live Browser Viewport (Simulator)
                      </h4>
                      {run.current_step && run.current_step > 0 ? (
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-mono text-[9px] uppercase px-1.5 py-0.5">
                          Running Step {run.current_step} of {run.total_steps}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="relative border border-blue-200 rounded-xl overflow-hidden shadow-sm bg-gray-900 aspect-[16/9] flex items-center justify-center select-none">
                      {run.live_screenshot ? (
                        <img
                          src={`data:image/jpeg;base64,${run.live_screenshot}`}
                          alt="Live simulation viewport"
                          className="w-full h-auto max-w-full block"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-xs text-blue-200 py-16">
                          <LoadingSpinner message="Connecting to execution browser..." />
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-lg text-[10px] text-blue-600 flex justify-between">
                      <span>Status: {run.status}</span>
                      <span>Real-time execution updates</span>
                    </div>
                  </div>
                ) : (
                  /* Look for a video artifact */
                  (() => {
                    const video = (run.artifacts || []).find((a: any) => a.artifact_type === 'video');
                    if (video) {
                      return (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1"><RiImageLine /> Browser Recording Video</h4>
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-black">
                            <video
                              src={getTicketUrl(video.download_url, downloadTicket)}
                              controls
                              className="w-full h-auto object-contain max-h-[300px]"
                            />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center gap-1.5">
                        <RiImageLine size={24} /> No browser recording video available
                      </div>
                    );
                  })()
                )}

                {/* Other artifacts (logs, timeline, etc.) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-700">Log Files & Reports</h4>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white text-xs">
                    {(run.artifacts || []).filter((a: any) => a.artifact_type !== 'video' && a.artifact_type !== 'screenshot').map((art: any) => (
                      <div key={art.id} className="flex items-center justify-between p-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{art.file_name}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-mono">{art.artifact_type.replace('_', ' ')} · {(art.file_size / 1024).toFixed(1)} KB</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewLog(art)}
                            disabled={loadingLogId !== null}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {loadingLogId === art.id ? 'Loading...' : 'View'}
                          </button>
                          <span className="text-gray-300">|</span>
                          <a
                            href={getTicketUrl(art.download_url, downloadTicket)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                    {(run.artifacts || []).filter((a: any) => a.artifact_type !== 'video' && a.artifact_type !== 'screenshot').length === 0 && (
                      <p className="py-4 text-center text-xs text-gray-400">No logs or other artifacts generated.</p>
                    )}
                  </div>
                </div>

                <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-100">
                  Select a step on the left to view the screenshot and error logs for that specific step.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Log Content Modal */}
      {viewingLog && (
        <Modal
          isOpen={!!viewingLog}
          onClose={() => setViewingLog(null)}
          title={`Log Content: ${viewingLog.name}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500 font-mono">Format: {viewingLog.name.endsWith('.json') ? 'JSON' : 'Plain Text'}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(viewingLog.content);
                  addToast('success', 'Log content copied to clipboard');
                }}
              >
                <RiFileCopyLine size={14} className="mr-1" /> Copy Log
              </Button>
            </div>
            <pre className="bg-gray-950 text-gray-100 font-mono text-[11px] p-4 rounded-xl overflow-auto max-h-[60vh] border border-gray-800 whitespace-pre-wrap select-all leading-relaxed shadow-inner">
              {viewingLog.content}
            </pre>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setViewingLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
