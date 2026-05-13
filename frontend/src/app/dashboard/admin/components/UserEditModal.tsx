"use client";
import React, { useState, useEffect } from 'react';
import { X, UserCog, Eye, EyeOff } from 'lucide-react';

interface UserEditModalProps {
  isOpen: boolean;
  user: any;
  onClose: () => void;
  onSubmit: (id: string, data: any) => Promise<void>;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, user, onClose, onSubmit }) => {
  const [form, setForm] = useState({ nombre: '', email: '', rol: 'USUARIO_LOCAL', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ nombre: user.nombre, email: user.email, rol: user.rol, password: '' });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: any = { nombre: form.nombre, email: form.email, rol: form.rol };
      if (form.password.trim()) data.password = form.password;
      await onSubmit(user.id, data);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111827] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Editar Usuario</h3>
              <p className="text-xs text-gray-400">Modifica los datos de <span className="text-white font-semibold">{user.nombre}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre Completo</label>
              <input
                required
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-amber-500/50 text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-amber-500/50 text-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Rol</label>
              <select
                value={form.rol}
                onChange={e => setForm({ ...form, rol: e.target.value })}
                className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
              >
                <option value="USUARIO_LOCAL">Usuario</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Nueva Contraseña <span className="text-gray-600 font-normal">(dejar vacío para no cambiar)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white outline-none focus:ring-2 focus:ring-amber-500/50 text-sm transition-all"
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
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
