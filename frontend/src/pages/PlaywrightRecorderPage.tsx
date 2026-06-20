import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  RiPlayCircleLine,
  RiStopCircleLine,
  RiSave3Line,
  RiTerminalBoxLine,
  RiCloseLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiRefreshLine,
  RiEditLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiLoader4Line,
} from 'react-icons/ri';
import { recorderApi } from '../api/recorder';
import { testcasesApi } from '../api/testcases';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
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
  const [screenshot, setScreenshot] = useState<string>('');
  
  // Interactive control inputs
  const [typeValue, setTypeValue] = useState('');
  const [addressBarUrl, setAddressBarUrl] = useState('');

  // Step editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState({
    action: '',
    target: '',
    value: '',
    description: '',
  });

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
  });

  // Start recording mutation
  const startMutation = useMutation({
    mutationFn: (targetUrl: string) => recorderApi.start(targetUrl),
    onSuccess: (res: any, variables: string) => {
      setSessionId(res.session_id);
      setStatus('recording');
      setRecordedSteps([]);
      setScreenshot('');
      setAddressBarUrl(variables);
      addToast('success', 'Recording session started. Launching cloud browser...');
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
      if (res.steps && res.steps.length > 0) {
        setRecordedSteps(res.steps);
      }
      setShowSaveModal(true);
      addToast('success', 'Recording stopped. Review captured steps.');
    },
    onError: (err: any) => {
      addToast('error', 'Failed to stop recorder');
    },
  });

  // Interaction command mutation
  const interactMutation = useMutation({
    mutationFn: (data: { action: string; x?: number; y?: number; text?: string; key?: string; url?: string }) =>
      recorderApi.sendInteraction(sessionId!, data),
    onSuccess: (res: any) => {
      // Set screenshot instantly
      if (res.screenshot) {
        setScreenshot(res.screenshot);
      }
      // Force refresh of steps immediately
      if (sessionId) {
        recorderApi.steps(sessionId).then(stepsRes => {
          setRecordedSteps(stepsRes.steps || []);
        });
      }
    },
    onError: (err: any) => {
      addToast('error', 'Failed to send interaction command');
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

  // Polling hook to fetch recorded steps, screenshots and status
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

        const screenshotRes = await recorderApi.getScreenshot(sessionId);
        setScreenshot(screenshotRes.screenshot || '');
      } catch (err) {
        console.error('Polling error', err);
      }
    },
    1500,
    status === 'recording'
  );

  const handleViewportClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (status !== 'recording' || interactMutation.isPending) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Map viewport coordinates relative to 1280x720 resolution
    const mappedX = Math.round((clickX / rect.width) * 1280);
    const mappedY = Math.round((clickY / rect.height) * 720);

    interactMutation.mutate({ action: 'click', x: mappedX, y: mappedY });
  };

  const handleSendType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeValue) return;
    interactMutation.mutate({ action: 'type', text: typeValue });
    setTypeValue('');
  };

  const handleAddressBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressBarUrl) return;
    interactMutation.mutate({ action: 'navigate', url: addressBarUrl });
  };

  const startStepEdit = (index: number, step: any) => {
    setEditingIndex(index);
    setEditingForm({
      action: step.action,
      target: step.target || '',
      value: step.value || '',
      description: step.description || '',
    });
  };

  const saveStepEdit = (index: number) => {
    const updated = [...recordedSteps];
    updated[index] = {
      ...updated[index],
      ...editingForm,
    };
    setRecordedSteps(updated);
    setEditingIndex(null);
    if (sessionId) {
      recorderApi.updateSteps(sessionId, updated).then(() => {
        addToast('success', 'Step updated successfully');
      }).catch(() => {
        addToast('error', 'Failed to sync step update to server');
      });
    } else {
      addToast('success', 'Step updated successfully');
    }
  };

  const deleteStep = (index: number) => {
    const updated = recordedSteps.filter((_, idx) => idx !== index);
    setRecordedSteps(updated);
    if (sessionId) {
      recorderApi.updateSteps(sessionId, updated).then(() => {
        addToast('success', 'Step deleted successfully');
      }).catch(() => {
        addToast('error', 'Failed to sync step deletion to server');
      });
    } else {
      addToast('success', 'Step deleted successfully');
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">Playwright Test Recorder</h2>
        <p className="text-xs text-gray-500 mb-6">
          Spin up a clean browser instance on the server, inject event listeners, and control it below. Clicks and keyboard events will be translated and recorded as structured test steps.
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
              <Button variant="secondary" onClick={() => { setStatus('idle'); setScreenshot(''); }}>
                <RiCloseLine size={16} /> Reset
              </Button>
              <Button onClick={() => setShowSaveModal(true)}>
                <RiSave3Line size={16} /> Save as Test Case
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Workspace */}
      {status !== 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive Viewport */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
              {/* Back / Forward / Refresh controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => interactMutation.mutate({ action: 'back' })}
                  disabled={status !== 'recording' || interactMutation.isPending}
                  className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                  title="Back"
                >
                  <RiArrowLeftLine size={16} />
                </button>
                <button
                  onClick={() => interactMutation.mutate({ action: 'forward' })}
                  disabled={status !== 'recording' || interactMutation.isPending}
                  className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                  title="Forward"
                >
                  <RiArrowRightLine size={16} />
                </button>
                <button
                  onClick={() => interactMutation.mutate({ action: 'reload' })}
                  disabled={status !== 'recording' || interactMutation.isPending}
                  className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                  title="Reload"
                >
                  <RiRefreshLine size={16} />
                </button>
              </div>

              {/* Address bar URL navigation */}
              <form onSubmit={handleAddressBarSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={addressBarUrl}
                  onChange={(e) => setAddressBarUrl(e.target.value)}
                  disabled={status !== 'recording' || interactMutation.isPending}
                  className="flex-1 bg-white border border-gray-300 rounded px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter URL to navigate..."
                />
                <button type="submit" className="hidden">Navigate</button>
              </form>
            </div>

            {/* Keyboard typing inputs toolbar */}
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-4">
              <form onSubmit={handleSendType} className="flex items-center gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  value={typeValue}
                  onChange={(e) => setTypeValue(e.target.value)}
                  disabled={status !== 'recording' || interactMutation.isPending}
                  className="flex-1 bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Type text in focused field..."
                />
                <Button size="sm" type="submit" disabled={status !== 'recording' || !typeValue || interactMutation.isPending}>
                  Send Type
                </Button>
              </form>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => interactMutation.mutate({ action: 'press', key: 'Enter' })}
                  disabled={status !== 'recording' || interactMutation.isPending}
                >
                  Press Enter
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => interactMutation.mutate({ action: 'press', key: 'Tab' })}
                  disabled={status !== 'recording' || interactMutation.isPending}
                >
                  Press Tab
                </Button>
              </div>
            </div>

            {/* Viewport Display */}
            <div className="relative border-b border-gray-200 bg-gray-900/5 aspect-[16/9] flex items-center justify-center select-none overflow-auto">
              {screenshot ? (
                <img
                  src={`data:image/jpeg;base64,${screenshot}`}
                  alt="Live viewport screenshot"
                  onClick={handleViewportClick}
                  className={`w-full h-auto cursor-pointer border border-gray-300 max-w-full block ${
                    interactMutation.isPending ? 'opacity-80' : ''
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-16">
                  <LoadingSpinner message="Waiting for browser viewport frame..." />
                </div>
              )}

              {/* Loader Overlay */}
              {interactMutation.isPending && (
                <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center bg-white/90 px-4 py-3 rounded-lg border border-gray-200 shadow-lg text-xs text-blue-600 font-semibold gap-1.5">
                    <RiLoader4Line size={24} className="animate-spin text-blue-600" />
                    Executing action...
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-4 py-2 bg-gray-50 text-[10px] text-gray-500 flex justify-between">
              <span>Resolution: 1280 x 720</span>
              <span>Click viewport to interact. Text typing is forwarded to the active input focus.</span>
            </div>
          </div>

          {/* Right Column: Steps Editor */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RiTerminalBoxLine size={16} /> Captured Steps ({recordedSteps.length})
            </h3>

            {recordedSteps.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Waiting for actions... Navigate and interact in the browser to start capturing.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {recordedSteps.map((step, idx) => {
                  const isEditing = editingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col gap-2 p-3 rounded-lg text-xs border transition-colors ${
                        isEditing
                          ? 'bg-blue-50/50 border-blue-300'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-gray-400 bg-gray-200/60 w-4 h-4 rounded-full flex items-center justify-center">
                            {idx + 1}
                          </span>
                          {!isEditing ? (
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-mono text-[9px] uppercase px-1 py-0">
                              {step.action}
                            </Badge>
                          ) : (
                            <select
                              value={editingForm.action}
                              onChange={(e) => setEditingForm({ ...editingForm, action: e.target.value })}
                              className="bg-white border border-gray-300 rounded px-1 py-0.5 text-[11px]"
                            >
                              <option value="click">click</option>
                              <option value="fill">fill</option>
                              <option value="select">select</option>
                              <option value="navigate">navigate</option>
                              <option value="wait">wait</option>
                            </select>
                          )}
                          {!isEditing && (
                            <span className="text-gray-500 truncate font-medium max-w-[150px]" title={step.description}>
                              {step.description || 'Recorded interaction'}
                            </span>
                          )}
                        </div>

                        {/* Edit & Delete operations */}
                        <div className="flex items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveStepEdit(idx)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Save changes"
                              >
                                <RiCheckLine size={14} />
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                                title="Cancel"
                              >
                                <RiCloseLine size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startStepEdit(idx, step)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                title="Edit step"
                              >
                                <RiEditLine size={14} />
                              </button>
                              <button
                                onClick={() => deleteStep(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="Delete step"
                              >
                                <RiDeleteBinLine size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Edit Fields */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1 border-t border-blue-200/50">
                          <div>
                            <label className="block text-[10px] text-gray-400 font-medium mb-0.5">Target (Selector)</label>
                            <input
                              type="text"
                              value={editingForm.target}
                              onChange={(e) => setEditingForm({ ...editingForm, target: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 font-medium mb-0.5">Value (Text/URL)</label>
                            <input
                              type="text"
                              value={editingForm.value}
                              onChange={(e) => setEditingForm({ ...editingForm, value: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 font-medium mb-0.5">Description</label>
                            <input
                              type="text"
                              value={editingForm.description}
                              onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        /* Read-only view */
                        <div className="font-mono text-[10px] text-gray-600 bg-black/5 px-2 py-1 rounded space-y-0.5 overflow-x-auto">
                          {step.target && (
                            <div><span className="text-gray-400 font-semibold">Target:</span> {step.target}</div>
                          )}
                          {step.value && (
                            <div><span className="text-gray-400 font-semibold">Value:</span> {step.value}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
