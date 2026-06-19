import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  RiTimeLine,
  RiGlobalLine,
  RiCloseCircleLine,
  RiCheckboxCircleLine,
  RiImageLine,
  RiAlertLine,
} from 'react-icons/ri';
import { executionsApi } from '../api/executions';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import { useUIStore } from '../stores/uiStore';
import { usePolling } from '../hooks/usePolling';
import { formatDate, formatDuration } from '../utils/formatters';

export default function ExecutionDetailPage() {
  const { runId } = useParams<{ id: string; runId: string }>();
  const { addToast } = useUIStore();
  const [selectedStep, setSelectedStep] = useState<any>(null);

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
            <div className="space-y-3">
              {(run.step_results || []).map((stepResult: any, idx: number) => (
                <div
                  key={stepResult.id}
                  onClick={() => setSelectedStep(stepResult)}
                  className={`flex items-start gap-4 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStep?.id === stepResult.id ? 'bg-blue-50/30 border-blue-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    stepResult.status === 'passed' ? 'bg-green-100 text-green-700' :
                    stepResult.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {stepResult.status === 'passed' ? <RiCheckboxCircleLine size={14} /> : <RiCloseCircleLine size={14} />}
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
                        src={`${import.meta.env.VITE_API_URL || '/api/v1'}/artifacts/download/?path=${encodeURIComponent(selectedStep.screenshot_path)}`}
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
                {/* Look for a video artifact */}
                {(() => {
                  const video = (run.artifacts || []).find((a: any) => a.artifact_type === 'video');
                  if (video) {
                    return (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1"><RiImageLine /> Browser Recording Video</h4>
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-black">
                          <video
                            src={video.download_url || undefined}
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
                })()}

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
                        <a
                          href={art.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Download
                        </a>
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
    </div>
  );
}
