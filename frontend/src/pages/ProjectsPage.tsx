import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RiAddLine, RiFolder3Line, RiArrowRightLine } from 'react-icons/ri';
import { projectsApi } from '../api/projects';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import SearchInput from '../components/ui/SearchInput';
import { useUIStore } from '../stores/uiStore';
import { formatDate } from '../utils/formatters';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => projectsApi.list({ search }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      addToast('success', 'Project created successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to create project');
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const projects = data?.results || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." />
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <RiAddLine size={16} /> New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<RiFolder3Line size={48} />}
          title="No projects yet"
          description="Create your first project to start organizing your test cases."
          action={<Button onClick={() => setShowCreate(true)}><RiAddLine size={16} /> Create Project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <RiFolder3Line size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{project.name}</h3>
                    <p className="text-xs text-gray-400">{formatDate(project.created_at)}</p>
                  </div>
                </div>
                <RiArrowRightLine size={16} className="text-gray-300 group-hover:text-blue-400" />
              </div>
              {project.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex gap-4 text-xs text-gray-400">
                <span>{project.environment_count || 0} environments</span>
                <span>{project.test_case_count || 0} tests</span>
                <span>{project.execution_count || 0} runs</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Project">
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <Input
            label="Project Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., E-commerce Platform"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)} type="button">Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
