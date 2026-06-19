export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    passed: 'text-green-700 bg-green-50 border-green-200',
    failed: 'text-red-700 bg-red-50 border-red-200',
    error: 'text-red-700 bg-red-50 border-red-200',
    pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    running: 'text-blue-700 bg-blue-50 border-blue-200',
    cancelled: 'text-gray-700 bg-gray-50 border-gray-200',
    open: 'text-red-700 bg-red-50 border-red-200',
    investigating: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    fixed: 'text-green-700 bg-green-50 border-green-200',
    closed: 'text-gray-700 bg-gray-50 border-gray-200',
    active: 'text-green-700 bg-green-50 border-green-200',
    draft: 'text-gray-700 bg-gray-50 border-gray-200',
    deprecated: 'text-red-700 bg-red-50 border-red-200',
    critical: 'text-red-700 bg-red-50 border-red-200',
    high: 'text-orange-700 bg-orange-50 border-orange-200',
    medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    low: 'text-blue-700 bg-blue-50 border-blue-200',
    skipped: 'text-gray-700 bg-gray-50 border-gray-200',
  };
  return colors[status] || 'text-gray-700 bg-gray-50 border-gray-200';
}

export function getPriorityColor(priority: string): string {
  return getStatusColor(priority);
}
