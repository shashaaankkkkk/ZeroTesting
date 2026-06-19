import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { RiPlayCircleLine, RiStopCircleLine, RiSave3Line, RiTerminalBoxLine, RiCloseLine } from 'react-icons/ri';
import { recorderApi } from '../api/recorder';
import { testcasesApi } from '../api/testcases';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useUIStore } from '../stores/uiStore';
import { usePolling } from '../hooks/usePolling';

export default function PlaywrightRecorderPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const [url, setUrl] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [recordedSteps, setRecordedSteps] = useState<any[]>([]);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
  });

  // Start recording mutation
  const startMutation = useMutation({
    mutationFn: (targetUrl: string) => recorderApi.start(targetUrl),
    onSuccess: (res: any) => {
      setSessionId(res.session_id);
      setStatus('recording');
      setRecordedSteps([]);
      addToast('success', 'Recording session started. Launching browser...');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to start recorder');
    },
  });

  // Stop recording mutation
  const stopMutation = useMutation({
    mutationFn: () => recorderApi.stop(sessionId!),
    onSuccess: (res: any) => {
      setStatus('stopped');
      setRecordedSteps(res.steps || []);
      setShowSaveModal(true);
      addToast('success', 'Recording stopped. Review captured steps.');
    },
    onError: (err: any) => {
      addToast('error', 'Failed to stop recorder');
    },
  });

  // Save as Test Case mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      testcasesApi.createAutomationTest(projectId!, {
        name: data.name,
        description: data.description,
        source: 'recorder',
        steps: recordedSteps.map((step, idx) => ({
          order: idx + 1,
          action: step.action,
          target: step.target,
          value: step.value || '',
          description: step.description || `Recorded step ${idx + 1}`,
        })) as any,
      }),
    onSuccess: (res) => {
      setShowSaveModal(false);
      addToast('success', 'Test case saved successfully');
      navigate(`/projects/${projectId}/automation-tests/${res.id}/builder`);
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to save test case');
    },
  });

  // Polling hook to fetch recorded steps and status while recording
  usePolling(
    async () => {
      if (!sessionId || status !== 'recording') return;
      try {
        const res = await recorderApi.steps(sessionId);
        setRecordedSteps(res.steps || []);

        const statusRes = await recorderApi.status(sessionId);
        if (statusRes.status === 'completed' || statusRes.status === 'failed') {
          setStatus('stopped');
          addToast('info', 'Session ended automatically');
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    },
    3000,
    status === 'recording'
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">Playwright Test Recorder</h2>
        <p className="text-xs text-gray-500 mb-6">
          Enter a URL and click "Start Recording". The platform will spin up a clean browser instance on the server, inject event listeners, and record your interactions.
        </p>

        {status === 'idle' && (
          <form
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              startMutation.mutate(url);
            }}
            className="flex items-end gap-3 max-w-xl"
          >
            <div className="flex-1">
              <Input
                label="Target URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://example.com/login"
                required
                type="url"
              />
            </div>
            <Button type="submit" loading={startMutation.isPending}>
              <RiPlayCircleLine size={16} /> Start Recording
            </Button>
          </form>
        )}

        {status === 'recording' && (
          <div className="flex items-center gap-4 bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-900">Recording active...</div>
              <div className="text-xs text-red-700">Target URL: {url}</div>
            </div>
            <Button variant="danger" onClick={() => stopMutation.mutate()} loading={stopMutation.isPending}>
              <RiStopCircleLine size={16} /> Stop Recording
            </Button>
          </div>
        )}

        {status === 'stopped' && (
          <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">Recording session complete</div>
              <div className="text-xs text-gray-500">{recordedSteps.length} steps captured.</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStatus('idle')}>
                <RiCloseLine size={16} /> Reset
              </Button>
              <Button onClick={() => setShowSaveModal(true)}>
                <RiSave3Line size={16} /> Save as Test Case
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Steps List */}
      {(status === 'recording' || recordedSteps.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <RiTerminalBoxLine size={16} /> Captured Steps
          </h3>

          {recordedSteps.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              {status === 'recording' ? 'Waiting for actions... Navigate and interact in the browser.' : 'No steps recorded.'}
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {recordedSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <span className="font-mono text-xs font-bold text-gray-400 bg-gray-200/60 w-5 h-5 rounded-full flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 uppercase">
                        {step.action}
                      </span>
                      <span className="text-xs text-gray-500">{step.description || 'Recorded interaction'}</span>
                    </div>
                    <div className="font-mono text-xs text-gray-600 space-y-0.5">
                      {step.target && (
                        <div><span className="text-gray-400">Target:</span> {step.target}</div>
                      )}
                      {step.value && (
                        <div><span className="text-gray-400">Value:</span> {step.value}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Modal */}
      <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="Save Automation Test Case">
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            saveMutation.mutate(saveForm);
          }}
          className="space-y-4"
        >
          <Input
            label="Test Name"
            value={saveForm.name}
            onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
            placeholder="e.g., Recorded E-commerce checkout flow"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={saveForm.description}
              onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description of the test case..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowSaveModal(false)} type="button">Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              Save & View
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
