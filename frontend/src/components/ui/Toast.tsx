import React from 'react';
import { RiCheckLine, RiCloseLine, RiInformationLine, RiErrorWarningLine } from 'react-icons/ri';
import { useUIStore } from '../../stores/uiStore';

const icons = {
  success: RiCheckLine,
  error: RiCloseLine,
  info: RiInformationLine,
  warning: RiErrorWarningLine,
};

const bgColors = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

export default function Toast() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`toast-enter flex items-start gap-3 px-4 py-3 rounded-lg border shadow-sm ${bgColors[toast.type]}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <RiCloseLine size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
