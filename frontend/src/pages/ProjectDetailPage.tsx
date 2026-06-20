import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RiAddLine, RiGlobalLine, RiDeleteBinLine } from 'react-icons/ri';
import { projectsApi } from '../api/projects';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner'; // wait, it's under components/ui/LoadingSpinner.tsx. Let's fix that.
import { useUIStore } from '../stores/uiStore';
import { ENV_TYPE_LABELS } from '../utils/constants';
import { getStatusColor } from '../utils/formatters';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [envForm, setEnvForm] = useState({ name: '', base_url: '', env_type: 'development' });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['project-stats', id],
    queryFn: () => projectsApi.stats(id!),
    enabled: !!id,
  });

  const { data: environments } = useQuery({
    queryKey: ['environments', id],
    queryFn: () => projectsApi.listEnvironments(id!),
    enabled: !!id,
  });

  const createEnvMutation = useMutation({
    mutationFn: (data: typeof envForm) => projectsApi.createEnvironment(id!, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', id] });
      setShowEnvModal(false);
      setEnvForm({ name: '', base_url: '', env_type: 'development' });
      addToast('success', 'Environment created');
    },
  });

  const deleteEnvMutation = useMutation({
    mutationFn: (envId: string) => projectsApi.deleteEnvironment(envId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', id] });
      addToast('success', 'Environment deleted');
    },
  });

  if (isLoading) return <LoadingSpinner />; // Wait, let's make sure LoadingSpinner import works. It's imported as '../components/ui/LoadingSpinner' or from '../components/ui/LoadingSpinner'. Oh, in projectsPage it's '../components/ui/LoadingSpinner'. Let's check below.
  if (!project) return <p>Project not found</p>;

  const statItems = [
    { label: 'Environments', value: stats?.total_environments || 0 },
    { label: 'Automation Tests', value: stats?.total_automation_tests || 0 },
    { label: 'Executions', value: stats?.total_executions || 0 },
    { label: 'Open Failures', value: stats?.open_failures || 0 },
    { label: 'Pass Rate', value: `${stats?.pass_rate || 0}%` },
  ];

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{project.name}</h2>
        {project.description && <p className="text-sm text-gray-500">{project.description}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statItems.map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Environments */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Environments</h3>
          <Button size="sm" onClick={() => setShowEnvModal(true)}>
            <RiAddLine size={14} /> Add Environment
          </Button>
        </div>
        {environments && environments.length > 0 ? (
          <div className="space-y-2">
            {environments.map((env: any) => (
              <div key={env.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <RiGlobalLine size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{env.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{env.base_url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(env.env_type === 'production' ? 'high' : 'active')}>
                    {ENV_TYPE_LABELS[env.env_type] || env.env_type}
                  </Badge>
                  <button
                    onClick={() => deleteEnvMutation.mutate(env.id)}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <RiDeleteBinLine size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No environments configured yet</p>
        )}
      </div>

      <Modal isOpen={showEnvModal} onClose={() => setShowEnvModal(false)} title="Add Environment">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createEnvMutation.mutate(envForm);
          }}
          className="space-y-4"
        >
          <Input
            label="Environment Name"
            value={envForm.name}
            onChange={(e) => setEnvForm({ ...envForm, name: e.target.value })}
            placeholder="e.g., Staging"
            required
          />
          <Input
            label="Base URL"
            value={envForm.base_url}
            onChange={(e) => setEnvForm({ ...envForm, base_url: e.target.value })}
            placeholder="e.g., https://staging.company.com"
            required
          />
          <Select
            label="Type"
            value={envForm.env_type}
            onChange={(e) => setEnvForm({ ...envForm, env_type: e.target.value })}
            options={[
              { value: 'development', label: 'Development' },
              { value: 'staging', label: 'Staging' },
              { value: 'production', label: 'Production' },
              { value: 'localhost', label: 'Localhost' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowEnvModal(false)} type="button">Cancel</Button>
            <Button type="submit" loading={createEnvMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
