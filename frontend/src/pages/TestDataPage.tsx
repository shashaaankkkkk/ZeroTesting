import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RiAddLine, RiDatabaseLine, RiDeleteBinLine, RiEditLine } from 'react-icons/ri';
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

export default function TestDataPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);

  const [form, setForm] = useState({
    key: '',
    value: '',
    data_type: 'static',
    generator: '',
    description: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['test-data', projectId, search, page],
    queryFn: () => testcasesApi.listTestData(projectId!, { search, page: page.toString() }),
    enabled: !!projectId,
  });

  const { data: generatorsData } = useQuery({
    queryKey: ['generators'],
    queryFn: () => testcasesApi.listGenerators(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => testcasesApi.createTestData(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-data'] });
      setShowCreate(false);
      resetForm();
      addToast('success', 'Test parameter created');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to create test data');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => testcasesApi.updateTestData(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-data'] });
      setEditingData(null);
      resetForm();
      addToast('success', 'Test parameter updated');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to update test data');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testcasesApi.deleteTestData(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-data'] });
      addToast('success', 'Test parameter deleted');
    },
    onError: () => {
      addToast('error', 'Failed to delete test data');
    },
  });

  const resetForm = () => {
    setForm({
      key: '',
      value: '',
      data_type: 'static',
      generator: '',
      description: '',
    });
  };

  const handleEdit = (dataItem: any) => {
    setEditingData(dataItem);
    setForm({
      key: dataItem.key,
      value: dataItem.value || '',
      data_type: dataItem.data_type,
      generator: dataItem.generator || '',
      description: dataItem.description || '',
    });
  };

  if (isLoading) return <LoadingSpinner />;

  const testData = data?.results || [];
  const generators = generatorsData?.generators || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search parameters..." />
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <RiAddLine size={16} /> Add Test Data
        </Button>
      </div>

      {testData.length === 0 ? (
        <EmptyState
          icon={<RiDatabaseLine size={48} />}
          title="No Test Data"
          description="Create reusable test parameters. Static values or dynamic generators like random email can be used in visual builder inputs via {{parameter_key}}."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <RiAddLine size={16} /> Add Parameter
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-3">Parameter Key</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Value / Generator</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {testData.map((dataItem: any) => (
                <tr key={dataItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-800">
                    {"{{" + dataItem.key + "}}"}
                    {dataItem.description && (
                      <div className="text-[10px] font-sans font-normal text-gray-400 mt-0.5">{dataItem.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={dataItem.data_type === 'dynamic' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-gray-100 text-gray-800'}>
                      {dataItem.data_type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-600">
                    {dataItem.data_type === 'dynamic' ? (
                      <span className="text-purple-600 font-mono text-xs bg-purple-50/50 border border-purple-100/50 px-1.5 py-0.5 rounded">
                        Generator: {dataItem.generator}
                      </span>
                    ) : (
                      dataItem.value
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDate(dataItem.created_at)}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(dataItem)}>
                      <RiEditLine size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this parameter?')) {
                          deleteMutation.mutate(dataItem.id);
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showCreate || !!editingData}
        onClose={() => {
          setShowCreate(false);
          setEditingData(null);
          resetForm();
        }}
        title={editingData ? 'Edit Test Parameter' : 'Add Test Parameter'}
      >
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            if (editingData) {
              updateMutation.mutate({ id: editingData.id, data: form });
            } else {
              createMutation.mutate(form);
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Parameter Key"
            value={form.key}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            placeholder="e.g., admin_email"
            required
            disabled={!!editingData}
          />
          <span className="text-[10px] text-gray-400 mt-1 block">Only alphanumeric and underscore characters are allowed.</span>

          <Select
            label="Type"
            options={[
              { value: 'static', label: 'Static Value' },
              { value: 'dynamic', label: 'Dynamic Generator' },
            ]}
            value={form.data_type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, data_type: e.target.value, value: '', generator: '' })}
          />

          {form.data_type === 'static' ? (
            <Input
              label="Value"
              value={form.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, value: e.target.value })}
              placeholder="e.g., test-value-123"
              required
            />
          ) : (
            <Select
              label="Generator"
              options={[
                { value: '', label: 'Select Generator' },
                ...generators.map((g: any) => ({ value: g, label: g.replace(/_/g, ' ') })),
              ]}
              value={form.generator}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, generator: e.target.value })}
              required
            />
          )}

          <Input
            label="Description (Optional)"
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g., Standard email for sign-in tests"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreate(false);
                setEditingData(null);
                resetForm();
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              Save Parameter
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
