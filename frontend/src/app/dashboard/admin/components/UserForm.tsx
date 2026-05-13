import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

interface UserFormProps {
  isOpen: boolean;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_USER = { nombre: '', email: '', password: '', rol: 'USUARIO_LOCAL' };

export const UserForm: React.FC<UserFormProps> = ({ isOpen, onSubmit, onCancel }) => {
  const [newUser, setNewUser] = useState(EMPTY_USER);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(newUser);
      setNewUser(EMPTY_USER); // ✅ Limpiar formulario
      onCancel();             // ✅ Cerrar modal
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNewUser(EMPTY_USER);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#111827] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-indigo-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Crear Nuevo Usuario</h3>
              <p className="text-xs text-gray-400">El usuario podrá acceder al sistema inmediatamente.</p>
            </div>
          </div>
          <button onClick={handleCancel} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre Completo</label>
            <input
              required
              value={newUser.nombre}
              onChange={e => setNewUser({...newUser, nombre: e.target.value})}
              className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
            <input
              required
              type="email"
              value={newUser.email}
              onChange={e => setNewUser({...newUser, email: e.target.value})}
              className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
              placeholder="juan@estudio.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Contraseña</label>
            <input
              required
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Rol</label>
            <select
              value={newUser.rol}
              onChange={e => setNewUser({...newUser, rol: e.target.value})}
              className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
            >
              <option value="USUARIO_LOCAL">Usuario</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="col-span-2 flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? 'Creando...' : '+ Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

