export interface Report {
  id: string;
  name: string;
  report_type: 'summary' | 'detailed';
  format: 'pdf' | 'csv';
  file_path: string;
  filters: Record<string, unknown>;
  total_runs: number;
  pass_rate: number | null;
  download_url: string | null;
  created_at: string;
}
