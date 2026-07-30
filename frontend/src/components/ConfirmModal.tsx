"use client";

import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText,
  confirmVariant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isWarning = confirmVariant === 'warning';
  const isPrimary = confirmVariant === 'primary';
  const defaultText = confirmText ?? (title.toLowerCase().includes('eliminar') ? 'Sí, Eliminar' : 'Confirmar');

  const iconBg = isWarning
    ? 'bg-amber-500/10 border-amber-500/20'
    : isPrimary
    ? 'bg-blue-500/10 border-blue-500/20'
    : 'bg-red-500/10 border-red-500/20';

  const iconColor = isWarning
    ? 'text-amber-500'
    : isPrimary
    ? 'text-blue-500'
    : 'text-red-500';

  const btnBg = isWarning
    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
    : isPrimary
    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
    : 'bg-red-500 hover:bg-red-600 shadow-red-500/20';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 text-center">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Warning Icon */}
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border mb-4 ${iconBg}`}>
            <AlertTriangle className={`w-8 h-8 ${iconColor}`} />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-semibold transition-all border border-white/5"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-3 text-white rounded-2xl font-semibold shadow-lg transition-all ${btnBg}`}
            >
              {defaultText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
