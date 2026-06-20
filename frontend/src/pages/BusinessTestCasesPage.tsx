import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RiAddLine,
  RiUploadCloud2Line,
  RiFileExcelLine,
  RiDeleteBinLine,
  RiEditLine,
  RiRobotLine,
  RiStackLine,
} from 'react-icons/ri';
import { testcasesApi } from '../api/testcases';
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

export default function BusinessTestCasesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingCase, setEditingCase] = useState<any>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk actions state
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState('');
  const [newGroupNameForAdd, setNewGroupNameForAdd] = useState('');
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // Excel group options
  const [uploadGroupId, setUploadGroupId] = useState('');
  const [uploadGroupName, setUploadGroupName] = useState('');

  // Single AI generation state
  const [generatingSingleId, setGeneratingSingleId] = useState<string | null>(null);

  const [form, setForm] = useState({
    tc_id: '',
    title: '',
    module: '',
    sub_module: '',
    preconditions: '',
    steps: '',
    expected_result: '',
    priority: 'medium',
    status: 'active',
  });

  // Fetch Business Test Cases
  const { data, isLoading } = useQuery({
    queryKey: ['business-tests', projectId, search, priority, status, page],
    queryFn: () =>
      testcasesApi.listBusinessTests(projectId!, {
        search,
        priority,
        status,
        page: page.toString(),
      }),
    enabled: !!projectId,
  });

  // Fetch Groups
  const { data: groupsData } = useQuery({
    queryKey: ['testcase-groups', projectId],
    queryFn: () => testcasesApi.listGroups(projectId!),
    enabled: !!projectId,
  });
  const groupsList = groupsData?.results || [];

  // Reset selection on page/search/filter change
  useEffect(() => {
    setSelectedIds([]);
  }, [page, search, priority, status]);

  const createMutation = useMutation({
    mutationFn: (data: any) => testcasesApi.createBusinessTest(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-tests'] });
      setShowCreate(false);
      resetForm();
      addToast('success', 'Test case created successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to create test case');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      testcasesApi.updateBusinessTest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-tests'] });
      setEditingCase(null);
      addToast('success', 'Test case updated successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to update test case');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testcasesApi.deleteBusinessTest(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['business-tests'] });
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      addToast('success', 'Test case deleted successfully');
    },
    onError: () => {
      addToast('error', 'Failed to delete test case');
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ file, groupId, groupName }: { file: File; groupId?: string; groupName?: string }) =>
      testcasesApi.importExcel(projectId!, file, groupId, groupName),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['business-tests'] });
      queryClient.invalidateQueries({ queryKey: ['testcase-groups'] });
      setShowUpload(false);
      setUploadGroupId('');
      setUploadGroupName('');
      addToast(
        'success',
        `Imported successfully: ${res.created} created, ${res.updated} updated`
      );
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Excel import failed');
    },
  });

  // Bulk add to group mutations
  const addToGroupMutation = useMutation({
    mutationFn: ({ groupId, testCaseIds }: { groupId: string; testCaseIds: string[] }) =>
      testcasesApi.addTestCasesToGroup(groupId, testCaseIds),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['testcase-group'] });
      queryClient.invalidateQueries({ queryKey: ['testcase-groups'] });
      setShowAddToGroupModal(false);
      setTargetGroupId('');
      setNewGroupNameForAdd('');
      setSelectedIds([]);
      addToast('success', res.message || 'Added to group successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.error || 'Failed to add test cases to group');
    }
  });

  const createGroupAndAddMutation = useMutation({
    mutationFn: async ({ name, testCaseIds }: { name: string; testCaseIds: string[] }) => {
      const newGroup = await testcasesApi.createGroup(projectId!, {
        name,
        description: `Created from selected business test cases`,
      });
      return testcasesApi.addTestCasesToGroup(newGroup.id, testCaseIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testcase-groups'] });
      setShowAddToGroupModal(false);
      setTargetGroupId('');
      setNewGroupNameForAdd('');
      setSelectedIds([]);
      addToast('success', 'Group created and test cases added successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.name?.[0] || err.response?.data?.message || 'Failed to create group');
    }
  });

  // Bulk Automation Generation
  const bulkGenerateMutation = useMutation({
    mutationFn: (testCaseIds: string[]) => testcasesApi.bulkGenerateAutomation(projectId!, testCaseIds),
    onMutate: () => {
      setIsBulkGenerating(true);
    },
    onSuccess: (res: any) => {
      setIsBulkGenerating(false);
      setSelectedIds([]);
      addToast('success', res.message || 'AI step generation started in background');
    },
    onError: (err: any) => {
      setIsBulkGenerating(false);
      addToast('error', err.response?.data?.error || 'Failed to start AI step generation');
    }
  });

  // Single automation generate mutation
  const singleGenerateMutation = useMutation({
    mutationFn: (id: string) => testcasesApi.generateSingleAutomation(id),
    onMutate: (id) => {
      setGeneratingSingleId(id);
    },
    onSuccess: () => {
      setGeneratingSingleId(null);
      addToast('success', 'Automated test generated successfully');
    },
    onError: (err: any) => {
      setGeneratingSingleId(null);
      addToast('error', err.response?.data?.error || 'Failed to generate automated test case');
    }
  });

  const resetForm = () => {
    setForm({
      tc_id: '',
      title: '',
      module: '',
      sub_module: '',
      preconditions: '',
      steps: '',
      expected_result: '',
      priority: 'medium',
      status: 'active',
    });
  };

  const handleEdit = (tc: any) => {
    setEditingCase(tc);
    setForm({
      tc_id: tc.tc_id,
      title: tc.title,
      module: tc.module,
      sub_module: tc.sub_module || '',
      preconditions: tc.preconditions || '',
      steps: tc.steps || '',
      expected_result: tc.expected_result || '',
      priority: tc.priority,
      status: tc.status,
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate({ file, groupId: uploadGroupId, groupName: uploadGroupName });
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const testCases = data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search test cases..." />
          </div>
          <Select
            options={[
              { value: '', label: 'All Priorities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            value={priority}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'deprecated', label: 'Deprecated' },
            ]}
            value={status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowUpload(true)}>
            <RiUploadCloud2Line size={16} /> Import Excel
          </Button>
          <Button onClick={() => { resetForm(); setShowCreate(true); }}>
            <RiAddLine size={16} /> Create Case
          </Button>
        </div>
      </div>

      {/* Multi-Select Action Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.length} test cases selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAddToGroupModal(true)}
            >
              <RiStackLine size={14} /> Add to Group
            </Button>
            <Button
              size="sm"
              onClick={() => bulkGenerateMutation.mutate(selectedIds)}
              loading={isBulkGenerating}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <RiRobotLine size={14} /> Bulk Generate Automated Tests
            </Button>
          </div>
        </div>
      )}

      {testCases.length === 0 ? (
        <EmptyState
          icon={<RiFileExcelLine size={48} />}
          title="No business test cases"
          description="Upload an Excel sheet or create a manual business test case to get started."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <RiAddLine size={16} /> Add Test Case
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={testCases.length > 0 && selectedIds.length === testCases.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(testCases.map((tc: any) => tc.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Module</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {testCases.map((tc: any) => (
                <tr key={tc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, tc.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== tc.id));
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                    />
                  </td>
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
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDate(tc.updated_at)}</td>
                  <td className="px-6 py-4 text-right space-x-1.5 flex justify-end items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => singleGenerateMutation.mutate(tc.id)}
                      loading={generatingSingleId === tc.id}
                      title="Generate AI Automated Test"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <RiRobotLine size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(tc)}>
                      <RiEditLine size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this test case?')) {
                          deleteMutation.mutate(tc.id);
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showCreate || !!editingCase}
        onClose={() => {
          setShowCreate(false);
          setEditingCase(null);
          resetForm();
        }}
        title={editingCase ? 'Edit Business Test Case' : 'Create Business Test Case'}
        size="lg"
      >
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            if (editingCase) {
              updateMutation.mutate({ id: editingCase.id, data: form });
            } else {
              createMutation.mutate(form);
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Test Case ID"
              value={form.tc_id}
              onChange={(e) => setForm({ ...form, tc_id: e.target.value })}
              placeholder="e.g., TC-001"
              required
            />
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Verify tenant registration"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Module"
              value={form.module}
              onChange={(e) => setForm({ ...form, module: e.target.value })}
              placeholder="e.g., Auth"
              required
            />
            <Input
              label="Sub Module"
              value={form.sub_module}
              onChange={(e) => setForm({ ...form, sub_module: e.target.value })}
              placeholder="e.g., Login (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preconditions</label>
            <textarea
              value={form.preconditions}
              onChange={(e) => setForm({ ...form, preconditions: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Preconditions..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Steps</label>
            <textarea
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter test steps (one per line)..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Result</label>
            <textarea
              value={form.expected_result}
              onChange={(e) => setForm({ ...form, expected_result: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Expected result..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              value={form.priority}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, priority: e.target.value })}
            />
            <Select
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft' },
                { value: 'deprecated', label: 'Deprecated' },
              ]}
              value={form.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, status: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreate(false);
                setEditingCase(null);
                resetForm();
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              Save Test Case
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Import Excel File">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Upload an Excel file containing your business test cases. The file should have the following headers:
            <span className="block font-mono bg-gray-50 p-2 mt-2 border border-gray-100 rounded text-[11px] text-gray-600">
              Module | Sub Module | TC ID | Title | Preconditions | Steps | Expected Result | Priority | Status
            </span>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Import into Existing Group (Optional)</label>
            <select
              value={uploadGroupId}
              onChange={(e) => {
                setUploadGroupId(e.target.value);
                if (e.target.value) setUploadGroupName('');
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            >
              <option value="">-- No Group (Import to project directly) --</option>
              {groupsList.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <Input
              label="Or Import into New Group (Optional)"
              value={uploadGroupName}
              onChange={(e) => {
                setUploadGroupName(e.target.value);
                if (e.target.value) setUploadGroupId('');
              }}
              placeholder="Create and link to new group..."
              className="mb-4"
            />
          </div>

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
              <LoadingSpinner message="Parsing Excel file..." />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add To Group Modal */}
      <Modal
        isOpen={showAddToGroupModal}
        onClose={() => {
          setShowAddToGroupModal(false);
          setTargetGroupId('');
          setNewGroupNameForAdd('');
        }}
        title="Add Selected Cases to Group"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (targetGroupId) {
              addToGroupMutation.mutate({ groupId: targetGroupId, testCaseIds: selectedIds });
            } else if (newGroupNameForAdd) {
              createGroupAndAddMutation.mutate({ name: newGroupNameForAdd, testCaseIds: selectedIds });
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Existing Group</label>
            <select
              value={targetGroupId}
              onChange={(e) => {
                setTargetGroupId(e.target.value);
                if (e.target.value) setNewGroupNameForAdd('');
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose a group --</option>
              {groupsList.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name} ({g.test_case_count} cases)</option>
              ))}
            </select>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs font-semibold">OR CREATE NEW GROUP</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <Input
            label="New Group Name"
            value={newGroupNameForAdd}
            onChange={(e) => {
              setNewGroupNameForAdd(e.target.value);
              if (e.target.value) setTargetGroupId('');
            }}
            placeholder="e.g., Auth Flow, Regression Set"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowAddToGroupModal(false);
                setTargetGroupId('');
                setNewGroupNameForAdd('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={addToGroupMutation.isPending || createGroupAndAddMutation.isPending}
              disabled={!targetGroupId && !newGroupNameForAdd}
            >
              Confirm Add
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
