import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RiArrowLeftLine,
  RiUploadCloud2Line,
  RiFileExcelLine,
  RiRobotLine,
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
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // 1. Fetch Group Details
  const { data: group, isLoading: isGroupLoading } = useQuery({
    queryKey: ['testcase-group', groupId],
    queryFn: () => testcasesApi.getGroup(groupId!),
    enabled: !!groupId,
  });

  // 2. Fetch Project Business Test Cases (to add existing cases to group)
  const { data: projectCasesData, isLoading: isCasesLoading } = useQuery({
    queryKey: ['business-tests-all', projectId],
    queryFn: () => testcasesApi.listBusinessTests(projectId!, { page_size: '1000' }),
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

  // 4. Excel Import directly into Group
  const importMutation = useMutation({
    mutationFn: (file: File) => testcasesApi.importExcel(projectId!, file, groupId),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['testcase-group'] });
      setShowUpload(false);
      addToast(
        'success',
        `Imported successfully: ${res.created} created, ${res.updated} updated into this group`
      );
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Excel import failed');
    },
  });

  // 5. Bulk Automation Generation
  const generateAutomationMutation = useMutation({
    mutationFn: () => testcasesApi.generateGroupAutomation(groupId!),
    onMutate: () => {
      setIsBulkGenerating(true);
    },
    onSuccess: (res: any) => {
      setIsBulkGenerating(false);
      addToast('success', res.message || 'Bulk AI automation generation started in background');
    },
    onError: (err: any) => {
      setIsBulkGenerating(false);
      addToast('error', err.response?.data?.error || 'Failed to start bulk automation generation');
    },
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

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
          <Button variant="secondary" onClick={() => setShowUpload(true)}>
            <RiUploadCloud2Line size={16} /> Import Excel
          </Button>
          <Button variant="secondary" onClick={() => setShowAddCases(true)}>
            <RiAddLine size={16} /> Add Test Cases
          </Button>
          <Button
            onClick={() => generateAutomationMutation.mutate()}
            loading={isBulkGenerating}
            disabled={group.test_cases.length === 0}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <RiRobotLine size={16} /> Generate Automated Tests
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
            description="Add existing project cases or upload them from Excel to get started."
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
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Module</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {group.test_cases.map((tc: any) => (
                <tr key={tc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700">{tc.tc_id}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{tc.title}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {tc.module}
                    {tc.sub_module && <span className="text-gray-300"> / </span>}
                    {tc.sub_module}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={
                      tc.priority === 'critical' ? 'bg-red-50 text-red-700 border border-red-100' :
                      tc.priority === 'high' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                      tc.priority === 'medium' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      'bg-gray-50 text-gray-600 border border-gray-100'
                    }>
                      {tc.priority}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={
                      tc.status === 'active' ? 'bg-green-50 text-green-700 border border-green-100' :
                      tc.status === 'draft' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                      'bg-gray-100 text-gray-600'
                    }>
                      {tc.status}
                    </Badge>
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
            All project business test cases are already in this group.
          </div>
        ) : (
          <form onSubmit={handleAddCasesSubmit} className="space-y-4">
            <p className="text-xs text-gray-500 mb-2">Select the business test cases you want to add to "{group.name}":</p>
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
                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1 rounded">{tc.tc_id}</span>
                      {tc.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Module: {tc.module} {tc.sub_module ? `/ ${tc.sub_module}` : ''} | Priority: {tc.priority}
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

      {/* Excel Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Import Excel into Group">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Upload an Excel file containing business test cases. These will be added to the project and linked directly to this group.
            <span className="block font-mono bg-gray-50 p-2 mt-2 border border-gray-100 rounded text-[11px] text-gray-600">
              Module | Sub Module | TC ID | Title | Preconditions | Steps | Expected Result | Priority | Status
            </span>
          </p>

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100/50 transition-colors relative">
            <RiFileExcelLine size={36} className="text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Click to upload Excel</span>
            <span className="text-xs text-gray-400 mt-1">supports .xlsx, .xls</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={importMutation.isPending}
            />
          </div>

          {importMutation.isPending && (
            <div className="flex items-center gap-2 justify-center text-sm text-blue-600">
              <LoadingSpinner message="Parsing Excel file and importing to group..." />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
