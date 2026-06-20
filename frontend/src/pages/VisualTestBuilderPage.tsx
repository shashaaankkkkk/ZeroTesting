import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiDeleteBinLine,
  RiEditLine,
  RiAddLine,
  RiFileCopyLine,
  RiSparkling2Line,
  RiTerminalBoxLine,
  RiDatabaseLine,
  RiCodeSSlashLine,
} from 'react-icons/ri';
import { testcasesApi } from '../api/testcases';
import { aiApi } from '../api/ai';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useUIStore } from '../stores/uiStore';
import Badge from '../components/ui/Badge';
import { STEP_ACTION_LABELS } from '../utils/constants';

export default function VisualTestBuilderPage() {
  const { id: projectId, testId } = useParams<{ id: string; testId: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [editingStep, setEditingStep] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  const [form, setForm] = useState({
    action: 'navigate',
    target: '',
    value: '',
    description: '',
    wait_timeout: 30000,
    object_ref_id: '',
  });

  // Fetch AI Status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiApi.status(),
  });

  // Fetch Test Case details
  const { data: testCase, isLoading: isTestLoading } = useQuery({
    queryKey: ['automation-test', testId],
    queryFn: () => testcasesApi.getAutomationTest(testId!),
    enabled: !!testId,
  });

  // Fetch Script
  const { data: scriptData, refetch: refetchScript } = useQuery({
    queryKey: ['automation-script', testId],
    queryFn: () => testcasesApi.getScript(testId!),
    enabled: !!testId,
  });

  // Fetch Object Repository (to reference reusable UI elements)
  const { data: objects } = useQuery({
    queryKey: ['objects', projectId],
    queryFn: () => testcasesApi.listObjects(projectId!, { limit: '100' }),
    enabled: !!projectId,
  });

  const addStepMutation = useMutation({
    mutationFn: (data: any) => testcasesApi.addStep(testId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-test', testId] });
      refetchScript();
      setShowAddModal(false);
      resetForm();
      addToast('success', 'Step added');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to add step');
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => testcasesApi.updateStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-test', testId] });
      refetchScript();
      setEditingStep(null);
      resetForm();
      addToast('success', 'Step updated');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to update step');
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: (id: string) => testcasesApi.deleteStep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-test', testId] });
      refetchScript();
      addToast('success', 'Step deleted');
    },
    onError: () => {
      addToast('error', 'Failed to delete step');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (stepIds: string[]) => testcasesApi.reorderSteps(testId!, stepIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-test', testId] });
      refetchScript();
      addToast('success', 'Steps reordered');
    },
  });

  const aiMutation = useMutation({
    mutationFn: (prompt: string) => aiApi.generateSteps(prompt),
    onSuccess: async (res: any) => {
      // Create each step sequentially
      for (const step of res.steps) {
        await testcasesApi.addStep(testId!, {
          action: step.action,
          target: step.target,
          value: step.value || '',
          description: step.description || '',
          wait_timeout: step.wait_timeout || 30000,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['automation-test', testId] });
      refetchScript();
      setShowAiModal(false);
      setAiPrompt('');
      addToast('success', 'Steps generated with AI');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'AI generation failed');
    },
  });

  const resetForm = () => {
    setForm({
      action: 'navigate',
      target: '',
      value: '',
      description: '',
      wait_timeout: 30000,
      object_ref_id: '',
    });
  };

  const handleEdit = (step: any) => {
    setEditingStep(step);
    setForm({
      action: step.action,
      target: step.target || '',
      value: step.value || '',
      description: step.description || '',
      wait_timeout: step.wait_timeout,
      object_ref_id: step.object_ref || '',
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!testCase?.steps) return;
    const steps = [...testCase.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    // Swap
    const temp = steps[index];
    steps[index] = steps[targetIndex];
    steps[targetIndex] = temp;

    reorderMutation.mutate(steps.map((s: any) => s.id));
  };

  const copyToClipboard = () => {
    if (scriptData?.script) {
      navigator.clipboard.writeText(scriptData.script);
      addToast('success', 'Script copied to clipboard');
    }
  };

  if (isTestLoading) return <LoadingSpinner />;

  const steps = testCase?.steps || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 bg-white p-4 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{testCase?.name}</h2>
          <p className="text-xs text-gray-500">{testCase?.description || 'Visual automation builder'}</p>
        </div>
        <div className="flex gap-2">
          {aiStatus?.enabled && (
            <Button
              variant="secondary"
              onClick={() => {
                if (testCase?.business_test_case_detail) {
                  const b = testCase.business_test_case_detail;
                  const template = `Title: ${b.title}\nModule: ${b.module}${b.sub_module ? ' / ' + b.sub_module : ''}\nPreconditions: ${b.preconditions || 'None'}\nManual Steps:\n${b.steps}\nExpected Result: ${b.expected_result}`;
                  setAiPrompt(template);
                }
                setShowAiModal(true);
              }}
            >
              <RiSparkling2Line size={16} className="text-purple-600 mr-1" /> Generate with AI
            </Button>
          )}
          <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
            <RiAddLine size={16} /> Add Step
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Step Editor & Builder */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <RiTerminalBoxLine size={16} /> Automation Steps
            </h3>

            {steps.length === 0 ? (
              <EmptyState
                icon={<RiTerminalBoxLine size={48} />}
                title="No steps yet"
                description="Click 'Add Step' to add a manual interaction, or use the AI generator."
              />
            ) : (
              <div className="space-y-3">
                {steps.map((step: any, index: number) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center gap-1 mt-1 text-gray-400">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="hover:text-blue-600 disabled:opacity-30"
                      >
                        <RiArrowUpLine size={16} />
                      </button>
                      <span className="text-xs font-mono font-bold text-gray-400">{index + 1}</span>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === steps.length - 1}
                        className="hover:text-blue-600 disabled:opacity-30"
                      >
                        <RiArrowDownLine size={16} />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-mono text-[10px] uppercase">
                          {STEP_ACTION_LABELS[step.action] || step.action}
                        </Badge>
                        {step.object_ref_detail && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                            <RiDatabaseLine size={12} /> {step.object_ref_detail.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 font-semibold">{step.description}</span>
                      </div>
                      <div className="mt-2 text-xs font-mono text-gray-600 break-all space-y-1">
                        {step.target && (
                          <div>
                            <span className="text-gray-400">Target:</span> {step.target}
                          </div>
                        )}
                        {step.value && (
                          <div>
                            <span className="text-gray-400">Value:</span> {step.value}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(step)}>
                        <RiEditLine size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this step?')) {
                            deleteStepMutation.mutate(step.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <RiDeleteBinLine size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Playwright script preview */}
        <div className="lg:col-span-5">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 text-gray-100 h-[calc(100vh-200px)] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                <RiCodeSSlashLine size={16} /> Generated Playwright Script
              </h3>
              <Button size="sm" variant="ghost" onClick={copyToClipboard} className="text-gray-400 hover:text-white hover:bg-gray-800">
                <RiFileCopyLine size={14} /> Copy
              </Button>
            </div>
            <pre className="flex-1 overflow-auto font-mono text-xs text-green-400 leading-relaxed bg-gray-950 p-4 rounded-lg select-all">
              {scriptData?.script || '# Add steps to view script'}
            </pre>
          </div>
        </div>
      </div>

      {/* Add / Edit Step Modal */}
      <Modal
        isOpen={showAddModal || !!editingStep}
        onClose={() => {
          setShowAddModal(false);
          setEditingStep(null);
          resetForm();
        }}
        title={editingStep ? 'Edit Automation Step' : 'Add Automation Step'}
      >
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            const data = { ...form };
            if (!data.object_ref_id) delete (data as any).object_ref_id;
            if (editingStep) {
              updateStepMutation.mutate({ id: editingStep.id, data });
            } else {
              addStepMutation.mutate(data);
            }
          }}
          className="space-y-4"
        >
          <Select
            label="Action"
            options={[
              { value: 'navigate', label: 'Navigate to URL' },
              { value: 'click', label: 'Click Element' },
              { value: 'fill', label: 'Fill Input' },
              { value: 'select', label: 'Select Dropdown Option' },
              { value: 'upload', label: 'Upload File' },
              { value: 'wait', label: 'Wait (ms)' },
              { value: 'verify_text', label: 'Verify Element Text' },
              { value: 'verify_url', label: 'Verify URL' },
              { value: 'verify_element', label: 'Verify Element Exists' },
              { value: 'screenshot', label: 'Take Screenshot' },
            ]}
            value={form.action}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, action: e.target.value })}
          />

          <Select
            label="Bind Repository Object (Optional)"
            options={[
              { value: '', label: 'None (Use Custom Target)' },
              ...(objects?.results || []).map((obj: any) => ({
                value: obj.id,
                label: `[${obj.element_type}] ${obj.name} (${obj.locator_value})`,
              })),
            ]}
            value={form.object_ref_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, object_ref_id: e.target.value })}
          />

          {!form.object_ref_id && ['navigate', 'click', 'fill', 'select', 'upload', 'verify_text', 'verify_url', 'verify_element'].includes(form.action) && (
            <Input
              label={form.action === 'navigate' || form.action === 'verify_url' ? 'URL' : 'Target Locator (CSS/XPath)'}
              value={form.target}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, target: e.target.value })}
              placeholder={form.action === 'navigate' ? 'https://example.com' : 'e.g., button[type="submit"]'}
              required={!form.object_ref_id}
            />
          )}

          {['fill', 'select', 'verify_text'].includes(form.action) && (
            <Input
              label="Value"
              value={form.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, value: e.target.value })}
              placeholder="e.g., John Doe"
              required
            />
          )}

          {form.action === 'wait' && (
            <Input
              label="Timeout (ms)"
              type="number"
              value={form.wait_timeout}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, wait_timeout: parseInt(e.target.value) })}
              required
            />
          )}

          <Input
            label="Description / Note"
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g., Click standard sign-in button"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setEditingStep(null);
                resetForm();
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" loading={addStepMutation.isPending || updateStepMutation.isPending}>
              Save Step
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAiModal} onClose={() => setShowAiModal(false)} title="Generate Test Flow with Gemini AI">
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            aiMutation.mutate(aiPrompt);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Describe the test sequence</label>
            <textarea
              value={aiPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Navigate to https://example.com, click login button, fill username with test@company.com, and click submit."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAiModal(false)} type="button">Cancel</Button>
            <Button type="submit" loading={aiMutation.isPending}>
              Generate & Append Steps
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
