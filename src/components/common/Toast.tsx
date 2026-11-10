import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 sm:top-5 inset-x-3 sm:inset-x-auto sm:left-5 z-[70] flex flex-col items-center sm:items-stretch gap-2 sm:max-w-sm sm:w-full dir-rtl pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto w-full sm:w-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md text-xs sm:text-sm font-bold transition-all animate-in slide-in-from-top-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-stone-950/92 text-white border-emerald-500/40'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-white border-rose-500/50'
              : 'bg-stone-900/92 text-white border-sky-500/40'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            {toast.type === 'info' && (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span className="truncate sm:whitespace-normal leading-snug">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors shrink-0 cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
