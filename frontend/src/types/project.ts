export interface Project {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  environment_count?: number;
  test_case_count?: number;
  execution_count?: number;
  environments?: Environment[];
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  name: string;
  base_url: string;
  env_type: 'development' | 'staging' | 'production' | 'localhost';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  total_automation_tests: number;
  total_executions: number;
  total_environments: number;
  open_failures: number;
  pass_rate: number;
}
