import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiFolder2Line,
  RiStackLine,
  RiFileList2Line,
} from 'react-icons/ri';
import { testcasesApi } from '../api/testcases';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useUIStore } from '../stores/uiStore';
import { formatDate } from '../utils/formatters';

export default function GroupsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['testcase-groups', projectId],
    queryFn: () => testcasesApi.listGroups(projectId!),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (groupData: any) => testcasesApi.createGroup(projectId!, groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testcase-groups'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      addToast('success', 'Group created successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.name?.[0] || err.response?.data?.message || 'Failed to create group');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testcasesApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testcase-groups'] });
      addToast('success', 'Group deleted successfully');
    },
    onError: () => {
      addToast('error', 'Failed to delete group');
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const groups = data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Test Case Groups</h1>
          <p className="text-xs text-gray-500 mt-1">Organize and manage sets of business test cases for batch execution and bulk automation.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <RiAddLine size={16} /> Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<RiStackLine size={48} className="text-gray-400" />}
          title="No groups found"
          description="Create groups to run sets of business test cases together, import them from Excel, or generate bulk AI automation."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <RiAddLine size={16} /> Create Group
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group: any) => (
            <div
              key={group.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <RiFolder2Line size={20} />
                    <Link
                      to={`/projects/${projectId}/groups/${group.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 text-base"
                    >
                      {group.name}
                    </Link>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this group?')) {
                        deleteMutation.mutate(group.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                  >
                    <RiDeleteBinLine size={16} />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                  {group.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-5 text-xs text-gray-400">
                <div className="flex items-center gap-1.5 font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                  <RiFileList2Line size={14} className="text-gray-400" />
                  <span>{group.test_case_count} Test Cases</span>
                </div>
                <span>Created {formatDate(group.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setForm({ name: '', description: '' });
        }}
        title="Create Test Case Group"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <Input
            label="Group Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Smoke Tests, Checkout Flow"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide a brief explanation of what this group covers..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowCreate(false);
                setForm({ name: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
