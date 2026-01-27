'use client';

import { useEffect } from 'react';
import { useToastStore } from '@/store/toastStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 min-w-[300px] p-4 rounded-xl shadow-lg border animate-in slide-in-from-right-full duration-300 ${
            toast.type === 'success'
              ? 'bg-white border-green-100 text-green-800'
              : toast.type === 'error'
              ? 'bg-white border-red-100 text-red-800'
              : 'bg-white border-blue-100 text-blue-800'
          }`}
        >
          <div
            className={`p-2 rounded-full ${
              toast.type === 'success'
                ? 'bg-green-100 text-green-600'
                : toast.type === 'error'
                ? 'bg-red-100 text-red-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
          </div>
          
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
