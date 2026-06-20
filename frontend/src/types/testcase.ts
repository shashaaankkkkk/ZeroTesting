export type StepAction = 'navigate' | 'click' | 'fill' | 'select' | 'upload' | 'wait' | 'verify_text' | 'verify_url' | 'verify_element' | 'screenshot';

export interface AutomationTestCase {
  id: string;
  name: string;
  description: string;
  tags: string[];
  is_active: boolean;
  source: 'manual' | 'recorder' | 'ai';
  step_count?: number;
  steps?: AutomationStep[];
  created_at: string;
  updated_at: string;
}

export interface AutomationStep {
  id: string;
  order: number;
  action: StepAction;
  target: string | null;
  value: string | null;
  object_ref: string | null;
  object_name: string | null;
  resolved_target: string | null;
  description: string;
  wait_timeout: number;
  created_at: string;
  updated_at: string;
}

export interface ObjectRepositoryItem {
  id: string;
  name: string;
  element_type: string;
  locator_strategy: string;
  locator_value: string;
  playwright_locator: string;
  description: string;
  page_url: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TestDataItem {
  id: string;
  key: string;
  value: string;
  data_type: 'static' | 'dynamic';
  generator: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ScriptOutput {
  test_case_id: string;
  test_case_name: string;
  script: string;
  human_readable_steps: { order: number; action: string; description: string }[];
}

export const STEP_ACTIONS: { value: StepAction; label: string; needsTarget: boolean; needsValue: boolean }[] = [
  { value: 'navigate', label: 'Navigate', needsTarget: false, needsValue: true },
  { value: 'click', label: 'Click', needsTarget: true, needsValue: false },
  { value: 'fill', label: 'Fill', needsTarget: true, needsValue: true },
  { value: 'select', label: 'Select', needsTarget: true, needsValue: true },
  { value: 'upload', label: 'Upload', needsTarget: true, needsValue: true },
  { value: 'wait', label: 'Wait', needsTarget: false, needsValue: true },
  { value: 'verify_text', label: 'Verify Text', needsTarget: true, needsValue: true },
  { value: 'verify_url', label: 'Verify URL', needsTarget: false, needsValue: true },
  { value: 'verify_element', label: 'Verify Element', needsTarget: true, needsValue: false },
  { value: 'screenshot', label: 'Take Screenshot', needsTarget: false, needsValue: false },
];

export interface TestCaseGroup {
  id: string;
  name: string;
  description: string;
  test_case_count: number;
  created_at: string;
  updated_at: string;
}

export interface TestCaseGroupDetail {
  id: string;
  name: string;
  description: string;
  test_cases: AutomationTestCase[];
  created_at: string;
  updated_at: string;
}


