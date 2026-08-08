"use client";

import React, { useState } from 'react';
import { X, Key, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!password) {
      setMessage({ text: 'Por favor ingresa tu nueva contraseña.', type: 'error' });
      return;
    }

    if (password.length < 6) {
      setMessage({ text: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: 'Las contraseñas no coinciden. Verifícalas.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await api.patch('/usuarios/profile/me', { password });
      setMessage({ text: '¡Contraseña actualizada con éxito!', type: 'success' });
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1500);
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      setMessage({
        text: error.response?.data?.message || 'Error al actualizar la contraseña.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-[#111827] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-indigo-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cambiar Contraseña</h3>
              <p className="text-xs text-gray-400">Ingresa tu nueva clave de acceso al sistema.</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 border text-xs ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nueva Contraseña</label>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Reafirmar / Confirmar Nueva Contraseña</label>
            <input
              required
              type={showPassword ? 'text' : 'password'}
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
