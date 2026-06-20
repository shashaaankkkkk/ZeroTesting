import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiAddLine,
  RiFoldersLine,
} from 'react-icons/ri';
import { testcasesApi } from '../api/testcases';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { useUIStore } from '../stores/uiStore';
import { formatDate } from '../utils/formatters';

export default function GroupDetailPage() {
  const { id: projectId, groupId } = useParams<{ id: string; groupId: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [showAddCases, setShowAddCases] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // 1. Fetch Group Details
  const { data: group, isLoading: isGroupLoading } = useQuery({
    queryKey: ['testcase-group', groupId],
    queryFn: () => testcasesApi.getGroup(groupId!),
    enabled: !!groupId,
  });

  // 2. Fetch Project Automation Test Cases (to add existing cases to group)
  const { data: projectCasesData, isLoading: isCasesLoading } = useQuery({
    queryKey: ['automation-tests-all', projectId],
    queryFn: () => testcasesApi.listAutomationTests(projectId!, { page_size: '1000' }),
    enabled: showAddCases && !!projectId,
  });

  // 3. Mutation to Update Group (Add/Remove Test Cases)
  const updateGroupMutation = useMutation({
    mutationFn: (data: { test_case_ids: string[] }) => testcasesApi.updateGroup(groupId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testcase-group'] });
      setShowAddCases(false);
      setSelectedCaseIds([]);
      addToast('success', 'Group updated successfully');
    },
    onError: () => {
      addToast('error', 'Failed to update group');
    },
  });

  const handleRemoveCase = (caseId: string) => {
    if (!group) return;
    const currentIds = group.test_cases.map((c: any) => c.id);
    const updatedIds = currentIds.filter(id => id !== caseId);
    updateGroupMutation.mutate({ test_case_ids: updatedIds });
  };

  const handleAddCasesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    const currentIds = group.test_cases.map((c: any) => c.id);
    const uniqueNewIds = selectedCaseIds.filter(id => !currentIds.includes(id));
    updateGroupMutation.mutate({ test_case_ids: [...currentIds, ...uniqueNewIds] });
  };

  if (isGroupLoading) return <LoadingSpinner />;
  if (!group) return <EmptyState title="Group not found" description="The group you are looking for does not exist." />;

  // Filter project test cases to show only those NOT in this group
  const groupCaseIds = new Set(group.test_cases.map((c: any) => c.id));
  const availableCases = projectCasesData?.results?.filter((c: any) => !groupCaseIds.has(c.id)) || [];

  return (
    <div className="space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to={`/projects/${projectId}/groups`} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
          <RiArrowLeftLine /> Groups
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{group.name}</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 bg-white p-6 rounded-xl border border-gray-200">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-500">{group.description || 'No description provided.'}</p>
          <div className="text-xs text-gray-400">
            Created on {formatDate(group.created_at)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setShowAddCases(true)}>
            <RiAddLine size={16} /> Add Test Cases
          </Button>
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-sm">Member Test Cases ({group.test_cases.length})</span>
        </div>

        {group.test_cases.length === 0 ? (
          <EmptyState
            icon={<RiFoldersLine size={48} className="text-gray-300" />}
            title="No test cases in this group"
            description="Add existing project automated test cases to get started."
            action={
              <Button size="sm" onClick={() => setShowAddCases(true)}>
                <RiAddLine size={14} /> Add Test Cases
              </Button>
            }
          />
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Tags</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {group.test_cases.map((tc: any) => (
                <tr key={tc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{tc.name}</td>
                  <td className="px-6 py-4 text-gray-500 truncate max-w-xs">{tc.description || 'No description'}</td>
                  <td className="px-6 py-4">
                    <Badge className={
                      tc.source === 'ai' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      tc.source === 'recorder' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      'bg-gray-50 text-gray-600 border border-gray-100'
                    }>
                      {tc.source}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tc.tags && tc.tags.length > 0 ? (
                        tc.tags.map((tag: string) => (
                          <Badge key={tag} className="bg-gray-50 text-gray-600 border border-gray-100 text-xs">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCase(tc.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Remove from group"
                    >
                      <RiDeleteBinLine size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Cases Modal */}
      <Modal
        isOpen={showAddCases}
        onClose={() => {
          setShowAddCases(false);
          setSelectedCaseIds([]);
        }}
        title="Add Test Cases to Group"
        size="lg"
      >
        {isCasesLoading ? (
          <LoadingSpinner />
        ) : availableCases.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            All project automated test cases are already in this group.
          </div>
        ) : (
          <form onSubmit={handleAddCasesSubmit} className="space-y-4">
            <p className="text-xs text-gray-500 mb-2">Select the automated test cases you want to add to "{group.name}":</p>
            <div className="max-h-[350px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {availableCases.map((tc: any) => (
                <label key={tc.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCaseIds.includes(tc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCaseIds([...selectedCaseIds, tc.id]);
                      } else {
                        setSelectedCaseIds(selectedCaseIds.filter(id => id !== tc.id));
                      }
                    }}
                    className="mt-1 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="text-sm">
                    <div className="font-semibold text-gray-800">
                      {tc.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {tc.description || 'No description'} | Source: {tc.source}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setShowAddCases(false);
                  setSelectedCaseIds([]);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={updateGroupMutation.isPending} disabled={selectedCaseIds.length === 0}>
                Add Selected Cases ({selectedCaseIds.length})
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

