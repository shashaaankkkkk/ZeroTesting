import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RiAddLine, RiDatabase2Line, RiDeleteBinLine, RiEditLine } from 'react-icons/ri';
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

export default function ObjectRepositoryPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingObject, setEditingObject] = useState<any>(null);

  const [form, setForm] = useState({
    name: '',
    element_type: 'button',
    locator_strategy: 'css',
    locator_value: '',
    description: '',
    page_url: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['objects', projectId, search, page],
    queryFn: () => testcasesApi.listObjects(projectId!, { search, page: page.toString() }),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => testcasesApi.createObject(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
      setShowCreate(false);
      resetForm();
      addToast('success', 'Repository object created');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to create object');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => testcasesApi.updateObject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
      setEditingObject(null);
      resetForm();
      addToast('success', 'Repository object updated');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to update object');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testcasesApi.deleteObject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
      addToast('success', 'Repository object deleted');
    },
    onError: () => {
      addToast('error', 'Failed to delete object');
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      element_type: 'button',
      locator_strategy: 'css',
      locator_value: '',
      description: '',
      page_url: '',
    });
  };

  const handleEdit = (obj: any) => {
    setEditingObject(obj);
    setForm({
      name: obj.name,
      element_type: obj.element_type,
      locator_strategy: obj.locator_strategy,
      locator_value: obj.locator_value,
      description: obj.description || '',
      page_url: obj.page_url || '',
    });
  };

  if (isLoading) return <LoadingSpinner />;

  const objects = data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search repository..." />
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <RiAddLine size={16} /> Add Object
        </Button>
      </div>

      {objects.length === 0 ? (
        <EmptyState
          icon={<RiDatabase2Line size={48} />}
          title="Object Repository Empty"
          description="Create reusable element locators. Referencing elements in test cases prevents script breaks when UI changes."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <RiAddLine size={16} /> Add Reusable Object
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-3">Object Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Locator Strategy</th>
                <th className="px-6 py-3">Locator Value</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {objects.map((obj: any) => (
                <tr key={obj.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{obj.name}</div>
                    {obj.description && (
                      <div className="text-xs text-gray-400 line-clamp-1">{obj.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-gray-100 text-gray-800 font-mono text-[10px] uppercase">
                      {obj.element_type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-blue-50 text-blue-800 font-mono text-[10px] uppercase">
                      {obj.locator_strategy}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600 truncate max-w-xs">{obj.locator_value}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDate(obj.created_at)}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(obj)}>
                      <RiEditLine size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this repository object?')) {
                          deleteMutation.mutate(obj.id);
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
        isOpen={showCreate || !!editingObject}
        onClose={() => {
          setShowCreate(false);
          setEditingObject(null);
          resetForm();
        }}
        title={editingObject ? 'Edit Object Locator' : 'Add Reusable Object Locator'}
      >
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            if (editingObject) {
              updateMutation.mutate({ id: editingObject.id, data: form });
            } else {
              createMutation.mutate(form);
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Object Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Submit Button"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Element Type"
              options={[
                { value: 'button', label: 'Button' },
                { value: 'input', label: 'Input Field' },
                { value: 'select', label: 'Dropdown Select' },
                { value: 'link', label: 'Link' },
                { value: 'text', label: 'Text' },
                { value: 'image', label: 'Image' },
                { value: 'checkbox', label: 'Checkbox' },
                { value: 'radio', label: 'Radio Button' },
                { value: 'other', label: 'Other' },
              ]}
              value={form.element_type}
              onChange={(e) => setForm({ ...form, element_type: e.target.value })}
            />
            <Select
              label="Locator Strategy"
              options={[
                { value: 'css', label: 'CSS Selector' },
                { value: 'xpath', label: 'XPath' },
                { value: 'id', label: 'ID' },
                { value: 'name', label: 'Name' },
                { value: 'text', label: 'Text' },
                { value: 'role', label: 'Role' },
                { value: 'test_id', label: 'Data Test ID' },
                { value: 'placeholder', label: 'Placeholder' },
                { value: 'label', label: 'Label' },
              ]}
              value={form.locator_strategy}
              onChange={(e) => setForm({ ...form, locator_strategy: e.target.value })}
            />
          </div>

          <Input
            label="Locator Value"
            value={form.locator_value}
            onChange={(e) => setForm({ ...form, locator_value: e.target.value })}
            placeholder="e.g., button[type='submit'] or #submit-id"
            required
          />

          <Input
            label="Page URL context (Optional)"
            value={form.page_url}
            onChange={(e) => setForm({ ...form, page_url: e.target.value })}
            placeholder="e.g., https://example.com/login"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., The primary call-to-action button on login page"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreate(false);
                setEditingObject(null);
                resetForm();
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              Save Object
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
