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
  RiLoader4Line,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiRefreshLine,
  RiLockLine,
  RiPlayCircleLine,
  RiTerminalBoxLine,
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

  const isLive = run.status === 'running' || run.status === 'pending';
  const progressPercent = run.total_steps > 0 ? Math.round(((run.passed_steps + run.failed_steps) / run.total_steps) * 100) : 0;

  // Browser Viewport Component
  const BrowserViewport = ({ children, title, statusBadge, isLive: vpLive, url }: {
    children: React.ReactNode;
    title: string;
    statusBadge?: React.ReactNode;
    isLive?: boolean;
    url?: string;
  }) => (
    <div className="rounded-xl overflow-hidden border border-gray-300 shadow-lg bg-white">
      {/* Chrome-style title bar */}
      <div className="bg-gradient-to-b from-gray-100 to-gray-200 px-4 py-2.5 flex items-center gap-3 border-b border-gray-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 border border-red-500/30" />
          <span className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/30" />
          <span className="w-3 h-3 rounded-full bg-green-400 border border-green-500/30" />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex items-center gap-1 text-gray-400">
            <RiArrowLeftLine size={14} />
            <RiArrowRightLine size={14} />
            <RiRefreshLine size={14} />
          </div>
          <div className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-600 flex items-center gap-1.5 font-mono truncate">
            <RiLockLine size={12} className="text-green-600 shrink-0" />
            <span className="truncate">{url || title}</span>
          </div>
        </div>
        {statusBadge}
      </div>
      {/* Viewport content */}
      <div className="relative bg-gray-50">
        {vpLive && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-red-600/90 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-gray-900">Run Details: {run.test_case_name}</h2>
              <Badge className={
                run.status === 'passed' ? 'bg-green-50 text-green-700 border border-green-100' :
                run.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
                run.status === 'running' ? 'bg-blue-50 text-blue-700 border border-blue-100 animate-pulse' :
                'bg-gray-100 text-gray-600'
              }>
                {run.status === 'running' && <RiLoader4Line size={12} className="animate-spin mr-1" />}
                {run.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><RiTimeLine /> {formatDuration(run.duration_ms)}</span>
              <span className="flex items-center gap-1"><RiGlobalLine /> {run.environment_name}</span>
              <span className="flex items-center gap-1">Steps: {run.passed_steps + run.failed_steps} / {run.total_steps}</span>
              <span>Started: {formatDate(run.started_at)}</span>
            </div>
          </div>

          {isLive && (
            <Button variant="danger" onClick={() => cancelMutation.mutate()} loading={cancelMutation.isPending}>
              <RiCloseCircleLine size={16} /> Cancel Run
            </Button>
          )}
        </div>

        {/* Execution progress bar */}
        {isLive && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
              <span>Execution progress</span>
              <span className="font-mono font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
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

      {/* Live Browser Viewport - Full Width when running */}
      {isLive && (
        <BrowserViewport
          title="Execution Simulator"
          isLive={true}
          url={run.environment_url || run.environment_name}
          statusBadge={
            <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-mono text-[9px] uppercase px-1.5 py-0.5 animate-pulse">
              Step {run.current_step || '—'} / {run.total_steps}
            </Badge>
          }
        >
          <div className="aspect-[16/9] flex items-center justify-center select-none bg-gray-900 relative overflow-hidden">
            {run.live_screenshot ? (
              <img
                src={`data:image/png;base64,${run.live_screenshot}`}
                alt="Live execution viewport"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-gray-400">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <RiPlayCircleLine size={28} className="absolute inset-0 m-auto text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-300">Connecting to execution browser...</p>
                  <p className="text-xs text-gray-500 mt-1">Waiting for first frame</p>
                </div>
              </div>
            )}
            {/* Scanning line animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-scan" />
            </div>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <RiTerminalBoxLine size={12} />
              Resolution: 1920 × 1080 · Headless Chromium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Real-time execution stream
            </span>
          </div>
        </BrowserViewport>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Step Results list */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RiTerminalBoxLine size={16} /> Execution Steps
            </h3>
            <div className="relative pl-8 border-l-2 border-gray-200 ml-4 space-y-3">
              {(run.step_results || []).map((stepResult: any, idx: number) => (
                <div
                  key={stepResult.id}
                  onClick={() => setSelectedStep(stepResult)}
                  className={`relative flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedStep?.id === stepResult.id
                      ? 'bg-blue-50/50 border-blue-300 shadow-sm ring-1 ring-blue-200/50'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {/* Timeline bubble */}
                  <span className={`absolute -left-[44px] top-3.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shrink-0 shadow-md text-[10px] font-bold text-white transition-all ${
                    selectedStep?.id === stepResult.id ? 'scale-110 ring-2 ring-blue-500/20' : ''
                  } ${
                    stepResult.status === 'passed' ? 'bg-green-500' :
                    stepResult.status === 'failed' ? 'bg-red-500' :
                    stepResult.status === 'skipped' ? 'bg-gray-400' :
                    'bg-yellow-500'
                  }`}>
                    {stepResult.status === 'passed' ? '✓' :
                     stepResult.status === 'failed' ? '✗' :
                     idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        stepResult.status === 'passed' ? 'bg-green-100 text-green-700' :
                        stepResult.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {stepResult.action}
                      </span>
                      <span className="text-xs text-gray-500 font-medium truncate">{stepResult.description || `Step ${idx + 1}`}</span>
                    </div>
                    {stepResult.target && (
                      <div className="text-[10px] font-mono text-gray-400 mt-1 truncate">→ {stepResult.target}</div>
                    )}
                    {stepResult.error_message && (
                      <div className="text-[10px] text-red-600 font-mono mt-1.5 bg-red-50 px-2 py-1 rounded border border-red-100/50 line-clamp-2">
                        {stepResult.error_message}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-[10px] text-gray-400 font-mono shrink-0">
                    {formatDuration(stepResult.duration_ms)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Browser Viewport Evidence */}
        <div className="lg:col-span-7">
          <div className="space-y-4">
            {/* Step Screenshot in browser viewport */}
            {selectedStep ? (
              <div className="space-y-4">
                {/* Step info bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                        selectedStep.status === 'passed' ? 'bg-green-500' :
                        selectedStep.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                      }`}>
                        {selectedStep.status === 'passed' ? <RiCheckboxCircleLine size={18} /> : <RiCloseCircleLine size={18} />}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <span className="font-mono uppercase text-xs bg-gray-100 px-1.5 py-0.5 rounded">{selectedStep.action}</span>
                          <Badge className={
                            selectedStep.status === 'passed' ? 'bg-green-50 text-green-700 border border-green-100' :
                            selectedStep.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
                            'bg-gray-100 text-gray-600'
                          }>
                            {selectedStep.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Duration: <span className="font-mono font-semibold">{selectedStep.duration_ms}ms</span>
                          {selectedStep.target && <span className="ml-3">Target: <span className="font-mono">{selectedStep.target}</span></span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedStep.error_message && (
                    <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700 font-mono break-all">
                      {selectedStep.error_message}
                    </div>
                  )}
                </div>

                {/* Browser Viewport with Screenshot */}
                {selectedStep.screenshot_path ? (
                  <BrowserViewport
                    title={`Step ${selectedStep.order} — ${selectedStep.action}`}
                    url={selectedStep.target || run.environment_url || 'about:blank'}
                    statusBadge={
                      <Badge className={`text-[9px] font-mono uppercase px-1.5 py-0.5 ${
                        selectedStep.status === 'passed' ? 'bg-green-50 text-green-700 border border-green-100' :
                        'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {selectedStep.status}
                      </Badge>
                    }
                  >
                    <div className="bg-white">
                      <img
                        src={getTicketUrl(`/api/v1/artifacts/download/?path=${encodeURIComponent(selectedStep.screenshot_path)}`, downloadTicket)}
                        alt="Step Screenshot"
                        className="w-full h-auto object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <RiImageLine size={12} />
                        Step {selectedStep.order} Screenshot · {selectedStep.action.toUpperCase()}
                      </span>
                      <span className="font-mono">{selectedStep.duration_ms}ms</span>
                    </div>
                  </BrowserViewport>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                    <RiImageLine size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400">No screenshot captured for this step</p>
                  </div>
                )}
              </div>
            ) : (
              /* Default: Video + Artifacts when no step is selected */
              <div className="space-y-4">
                {/* Browser Recording Video */}
                {!isLive && (() => {
                  const video = (run.artifacts || []).find((a: any) => a.artifact_type === 'video');
                  if (video) {
                    return (
                      <BrowserViewport
                        title="Execution Recording Playback"
                        url={run.environment_url || run.environment_name}
                        statusBadge={
                          <Badge className={`text-[9px] font-mono uppercase px-1.5 py-0.5 ${
                            run.status === 'passed' ? 'bg-green-50 text-green-700 border border-green-100' :
                            'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {run.status}
                          </Badge>
                        }
                      >
                        <div className="bg-black">
                          <video
                            src={getTicketUrl(video.download_url, downloadTicket)}
                            controls
                            className="w-full h-auto object-contain max-h-[500px]"
                          />
                        </div>
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <RiPlayCircleLine size={12} />
                            Full Execution Recording
                          </span>
                          <span>{formatDuration(run.duration_ms)}</span>
                        </div>
                      </BrowserViewport>
                    );
                  }
                  return (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                      <RiImageLine size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">No browser recording video available</p>
                    </div>
                  );
                })()}

                {/* Log Files & Reports */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                    <RiTerminalBoxLine size={14} /> Log Files & Reports
                  </h4>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white text-xs">
                    {(run.artifacts || []).filter((a: any) => a.artifact_type !== 'video' && a.artifact_type !== 'screenshot').map((art: any) => (
                      <div key={art.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
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

                <div className="text-center text-xs text-gray-400 py-2">
                  ← Select a step on the left to view its browser screenshot
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

      {/* CSS for scanning line animation */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
