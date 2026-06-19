export type RunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error' | 'cancelled';
export type StepResultStatus = 'passed' | 'failed' | 'error' | 'skipped';

export interface ExecutionRun {
  id: string;
  test_case: string;
  test_case_name: string;
  environment: string;
  environment_name: string;
  environment_url?: string;
  triggered_by_name: string;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  error_message?: string;
  celery_task_id?: string;
  step_results?: ExecutionStepResult[];
  artifacts?: Artifact[];
  created_at: string;
}

export interface ExecutionStepResult {
  id: string;
  order: number;
  status: StepResultStatus;
  action: string;
  target: string;
  expected: string;
  actual: string;
  error_message: string;
  screenshot_path: string | null;
  duration_ms: number;
  artifacts: Artifact[];
  executed_at: string;
}

export interface Artifact {
  id: string;
  artifact_type: string;
  file_name: string;
  file_size: number;
  step_result: string | null;
  metadata: Record<string, unknown>;
  download_url: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_projects: number;
  total_test_cases: number;
  total_executions: number;
  pass_rate: number;
  failed_runs: number;
}

export interface TrendPoint {
  date: string;
  total: number;
  passed: number;
  failed: number;
}
