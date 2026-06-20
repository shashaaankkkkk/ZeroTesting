import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RiAddLine,
  RiPlayCircleLine,
  RiCodeSSlashLine,
  RiDeleteBinLine,
  RiRobot2Line,
} from 'react-icons/ri';
import { testcasesApi } from '../api/testcases';
import { projectsApi } from '../api/projects';
import { executionsApi } from '../api/executions';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import SearchInput from '../components/ui/SearchInput';
import Badge from '../components/ui/Badge';
import { useUIStore } from '../stores/uiStore';
import { formatDate } from '../utils/formatters';

export default function AutomationTestsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [selectedEnv, setSelectedEnv] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    source: 'manual',
  });

  const { data: envs } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => projectsApi.listEnvironments(projectId!),
    enabled: !!projectId,
  });



  const { data, isLoading } = useQuery({
    queryKey: ['automation-tests', projectId, search, page],
    queryFn: () =>
      testcasesApi.listAutomationTests(projectId!, {
        search,
        page: page.toString(),
      }),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => testcasesApi.createAutomationTest(projectId!, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['automation-tests'] });
      setShowCreate(false);
      resetForm();
      addToast('success', 'Automation test case created');
      navigate(`/projects/${projectId}/automation-tests/${res.id}/builder`);
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to create automation test');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testcasesApi.deleteAutomationTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-tests'] });
      addToast('success', 'Automation test case deleted');
    },
    onError: () => {
      addToast('error', 'Failed to delete automation test');
    },
  });

  const runMutation = useMutation({
    mutationFn: ({ testId, envId }: { testId: string; envId: string }) =>
      executionsApi.trigger(testId, envId),
    onSuccess: (res: any) => {
      setShowRunModal(false);
      addToast('success', 'Execution triggered successfully');
      navigate(`/projects/${projectId}/executions/${res.id}`);
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to run test');
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      source: 'manual',
    });
  };

  if (isLoading) return <LoadingSpinner />;

  const tests = data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search automation tests..." />
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <RiAddLine size={16} /> New Automation Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <EmptyState
          icon={<RiRobot2Line size={48} />}
          title="No automation tests yet"
          description="Create a visual no-code automation flow from scratch."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <RiAddLine size={16} /> Create Automation Test
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Steps</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {tests.map((test: any) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{test.name}</div>
                    {test.description && (
                      <div className="text-xs text-gray-400 line-clamp-1">{test.description}</div>
                    )}
                  </td>

                  <td className="px-6 py-4 text-gray-700 font-semibold">{test.step_count || 0} steps</td>
                  <td className="px-6 py-4">
                    <Badge className={
                      test.source === 'recorder' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      test.source === 'ai' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                      'bg-blue-50 text-blue-700 border border-blue-100'
                    }>
                      {test.source}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDate(test.created_at)}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedTest(test);
                        if (envs && envs.length > 0) {
                          setSelectedEnv(envs[0].id);
                        }
                        setShowRunModal(true);
                      }}
                    >
                      <RiPlayCircleLine size={14} /> Run
                    </Button>
                    <Link to={`/projects/${projectId}/automation-tests/${test.id}/builder`}>
                      <Button variant="secondary" size="sm">
                        <RiCodeSSlashLine size={14} /> Builder
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this test?')) {
                          deleteMutation.mutate(test.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <RiDeleteBinLine size={14} />
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

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="New Automation Test">
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <Input
            label="Automation Test Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Auth - Successful Tenant Creation"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional test description..."
            />
          </div>



          <Select
            label="Source"
            options={[
              { value: 'manual', label: 'Manual Builder' },
              { value: 'recorder', label: 'Playwright Recorder' },
              { value: 'ai', label: 'AI Generated' },
            ]}
            value={form.source}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, source: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)} type="button">Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Test</Button>
          </div>
        </form>
      </Modal>

      {/* Run Test Modal */}
      <Modal isOpen={showRunModal} onClose={() => setShowRunModal(false)} title="Run Automation Test">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Select the environment to run the test case <span className="font-semibold text-gray-900">"{selectedTest?.name}"</span>:
          </p>

          {envs && envs.length === 0 ? (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              No environments configured for this project. Please configure an environment in project details.
            </div>
          ) : (
            <Select
              label="Target Environment"
              options={(envs || []).map((e: any) => ({
                value: e.id,
                label: `${e.name} (${e.base_url})`,
              }))}
              value={selectedEnv}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedEnv(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowRunModal(false)}>Cancel</Button>
            <Button
              onClick={() => runMutation.mutate({ testId: selectedTest.id, envId: selectedEnv })}
              disabled={!selectedEnv || runMutation.isPending}
              loading={runMutation.isPending}
            >
              Start Execution
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
