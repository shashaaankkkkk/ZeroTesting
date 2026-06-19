export const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const STEP_ACTION_LABELS: Record<string, string> = {
  navigate: 'Navigate',
  click: 'Click',
  fill: 'Fill',
  select: 'Select',
  upload: 'Upload',
  wait: 'Wait',
  verify_text: 'Verify Text',
  verify_url: 'Verify URL',
  verify_element: 'Verify Element',
  screenshot: 'Screenshot',
};

export const ENV_TYPE_LABELS: Record<string, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
  localhost: 'Localhost',
};

export const LOCATOR_STRATEGIES = [
  { value: 'css', label: 'CSS Selector' },
  { value: 'xpath', label: 'XPath' },
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Name' },
  { value: 'text', label: 'Text' },
  { value: 'role', label: 'Role' },
  { value: 'test_id', label: 'Test ID (data-testid)' },
  { value: 'placeholder', label: 'Placeholder' },
  { value: 'label', label: 'Label' },
];

export const ELEMENT_TYPES = [
  { value: 'button', label: 'Button' },
  { value: 'input', label: 'Input' },
  { value: 'select', label: 'Select' },
  { value: 'link', label: 'Link' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'other', label: 'Other' },
];
