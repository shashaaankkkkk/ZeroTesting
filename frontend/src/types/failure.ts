export type FailureStatus = 'open' | 'investigating' | 'fixed' | 'closed';

export interface FailureRecord {
  id: string;
  project: string;
  execution_run_id: string;
  test_case: string;
  test_case_name: string;
  environment: string;
  environment_name: string;
  failed_step: string | null;
  failed_step_order: number | null;
  expected_result: string;
  actual_result: string;
  screenshot_path: string | null;
  console_logs: string;
  network_logs: string;
  status: FailureStatus;
  notes: string;
  ai_summary: string;
  created_at: string;
  updated_at: string;
}
