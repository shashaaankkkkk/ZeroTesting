import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RiAddLine, RiFileChartLine, RiDownload2Line } from 'react-icons/ri';
import { reportsApi } from '../api/reports';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { useUIStore } from '../stores/uiStore';
import { formatDate } from '../utils/formatters';

export default function ReportsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    report_type: 'summary',
    format: 'pdf',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => reportsApi.list(projectId!),
    enabled: !!projectId,
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => reportsApi.generate(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowCreate(false);
      addToast('success', 'Report generation triggered successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to generate report');
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (id: string) => reportsApi.download(id),
    onSuccess: (data: any, variables) => {
      const blob = new Blob([data as any]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const reportName = `Report-${variables}.${form.format === 'pdf' ? 'pdf' : 'csv'}`;
      link.setAttribute('download', reportName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('success', 'Report download started');
    },
    onError: () => {
      addToast('error', 'Download failed');
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const reports = data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <RiAddLine size={16} /> Generate Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<RiFileChartLine size={48} />}
          title="No Reports Generated"
          description="Build summary or detailed execution metrics in PDF/CSV format."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <RiAddLine size={16} /> Generate First Report
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-3">Report Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Format</th>
                <th className="px-6 py-3">Pass Rate</th>
                <th className="px-6 py-3">Runs Tracked</th>
                <th className="px-6 py-3">Generated At</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {reports.map((report: any) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{report.name}</td>
                  <td className="px-6 py-4">
                    <Badge className="bg-gray-100 text-gray-800 capitalize">{report.report_type}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-blue-50 text-blue-800 uppercase font-mono text-[10px]">{report.format}</Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-green-600">
                    {report.pass_rate !== null ? `${report.pass_rate}%` : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">{report.total_runs || 0} runs</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDate(report.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadMutation.mutate(report.id)}
                      loading={downloadMutation.isPending && downloadMutation.variables === report.id}
                    >
                      <RiDownload2Line size={14} className="mr-1" /> Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Report Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Generate Test Report">
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            generateMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <Select
            label="Report Type"
            options={[
              { value: 'summary', label: 'Summary Metrics Report' },
              { value: 'detailed', label: 'Detailed Step Failure Report' },
            ]}
            value={form.report_type}
            onChange={(e) => setForm({ ...form, report_type: e.target.value })}
          />

          <Select
            label="File Format"
            options={[
              { value: 'pdf', label: 'PDF Document' },
              { value: 'csv', label: 'CSV Spreadsheet' },
            ]}
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)} type="button">Cancel</Button>
            <Button type="submit" loading={generateMutation.isPending}>
              Generate Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
