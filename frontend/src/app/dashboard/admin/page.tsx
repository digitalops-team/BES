"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { Users, Building2, Plus, Trash2, Check, X, Edit2, Shield, User, ChevronDown } from 'lucide-react';

type Tab = 'usuarios' | 'asignaciones';

export default function AdminPage() {
  const { token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');

  // --- USUARIOS ---
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', email: '', password: '', rol: 'USUARIO_LOCAL' });

  // --- ASIGNACIONES ---
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [empresasConFlag, setEmpresasConFlag] = useState<any[]>([]);
  const [loadingAsig, setLoadingAsig] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsuarios = useCallback(async () => {
    const res = await axios.get('http://localhost:3000/usuarios', { headers });
    setUsuarios(res.data.filter((u: any) => u.id !== user?.id)); // excluir al propio admin
  }, [token]);

  const fetchAsignaciones = useCallback(async (uid: string) => {
    if (!uid) return;
    setLoadingAsig(true);
    const res = await axios.get(`http://localhost:3000/asignaciones/${uid}`, { headers });
    setEmpresasConFlag(res.data);
    setLoadingAsig(false);
  }, [token]);

  useEffect(() => { if (token) fetchUsuarios(); }, [token]);

  useEffect(() => {
    if (selectedUserId) fetchAsignaciones(selectedUserId);
  }, [selectedUserId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/usuarios', newUser, { headers });
      setNewUser({ nombre: '', email: '', password: '', rol: 'USUARIO_LOCAL' });
      setShowCreateForm(false);
      fetchUsuarios();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    await axios.delete(`http://localhost:3000/usuarios/${id}`, { headers });
    fetchUsuarios();
  };

  const toggleAsignacion = async (empresa: any) => {
    if (!selectedUserId) return;
    if (empresa.asignada) {
      await axios.delete(`http://localhost:3000/asignaciones/${selectedUserId}/${empresa.id}`, { headers });
    } else {
      await axios.post('http://localhost:3000/asignaciones', { usuarioId: selectedUserId, empresaId: empresa.id }, { headers });
    }
    fetchAsignaciones(selectedUserId);
  };

  const selectedUser = usuarios.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="w-7 h-7 text-indigo-400" />
          Administración
        </h2>
        <p className="text-gray-400 text-sm mt-1">Gestión de usuarios y asignación de empresas.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#111827] p-1.5 rounded-2xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'usuarios' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4" /> Usuarios
        </button>
        <button
          onClick={() => setActiveTab('asignaciones')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'asignaciones' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white'}`}
        >
          <Building2 className="w-4 h-4" /> Asignaciones
        </button>
      </div>

      {/* TAB: USUARIOS */}
      {activeTab === 'usuarios' && (
        <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Usuarios del Sistema</h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Crear Usuario
            </button>
          </div>

          {/* Formulario de creación */}
          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="p-6 border-b border-white/5 bg-indigo-500/5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre</label>
                <input required value={newUser.nombre} onChange={e => setNewUser({...newUser, nombre: e.target.value})}
                  className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" placeholder="juan@estudio.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Contraseña</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Rol</label>
                <select value={newUser.rol} onChange={e => setNewUser({...newUser, rol: e.target.value})}
                  className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm">
                  <option value="USUARIO_LOCAL">Usuario Local</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all">Crear</button>
              </div>
            </form>
          )}

          {/* Lista de usuarios */}
          <div className="divide-y divide-white/5">
            {usuarios.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No hay usuarios adicionales aún.</p>
              </div>
            ) : usuarios.map(u => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{u.nombre}</p>
                    <p className="text-gray-500 text-xs">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${u.rol === 'ADMIN' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-blue-400 bg-blue-400/10 border-blue-400/20'}`}>
                    {u.rol === 'ADMIN' ? 'ADMIN' : 'USUARIO'}
                  </span>
                  <button
                    onClick={() => { setSelectedUserId(u.id); setActiveTab('asignaciones'); }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-400/10 hover:bg-indigo-400/20 px-3 py-1.5 rounded-lg border border-indigo-400/20 transition-colors font-medium"
                  >
                    Asignar empresas
                  </button>
                  <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ASIGNACIONES */}
      {activeTab === 'asignaciones' && (
        <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-bold text-white mb-4">Asignación de Empresas</h3>
            <div className="relative max-w-sm">
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full bg-[#1f2937] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
              >
                <option value="">— Seleccionar usuario —</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {!selectedUserId ? (
            <div className="p-10 text-center text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Selecciona un usuario para gestionar sus empresas asignadas.</p>
            </div>
          ) : loadingAsig ? (
            <div className="p-10 text-center text-gray-500">Cargando empresas...</div>
          ) : (
            <div>
              <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  {empresasConFlag.filter(e => e.asignada).length} de {empresasConFlag.length} empresas asignadas a <span className="text-indigo-400">{selectedUser?.nombre}</span>
                </p>
              </div>
              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                {empresasConFlag.map(emp => (
                  <div key={emp.id} className={`flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.02] transition-colors ${emp.asignada ? 'bg-emerald-500/[0.03]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${emp.asignada ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5 border border-white/10'}`}>
                        <Building2 className={`w-4 h-4 ${emp.asignada ? 'text-emerald-400' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{emp.razonSocial}</p>
                        <p className="text-gray-500 text-xs font-mono">RUC: {emp.ruc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAsignacion(emp)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${emp.asignada
                        ? 'text-red-400 bg-red-400/10 border-red-400/20 hover:bg-red-400/20'
                        : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/20'
                      }`}
                    >
                      {emp.asignada ? <><X className="w-3.5 h-3.5" /> Revocar</> : <><Check className="w-3.5 h-3.5" /> Asignar</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
