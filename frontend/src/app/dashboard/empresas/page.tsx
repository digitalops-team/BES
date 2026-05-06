"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { Building2, Plus, Search, Lock, RefreshCw, Trash2, Edit2, Clock } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import ConfirmModal from '@/components/ConfirmModal';

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingEmpresas, setSyncingEmpresas] = useState<Record<string, boolean>>({});
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  // Form State
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [usuarioSol, setUsuarioSol] = useState('');
  const [claveSol, setClaveSol] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchEmpresas = async () => {
    try {
      const res = await axios.get('http://localhost:3000/empresas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmpresas(res.data);
    } catch (error) {
      console.error("Error cargando empresas", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchEmpresas();

    if (user?.id) {
      const socket: Socket = io('http://localhost:3000');
      socket.on(`sync-finished-${user.id}`, (data) => {
        setSyncingEmpresas(prev => ({ ...prev, [data.empresaId]: false }));
        fetchEmpresas();
      });
      socket.on(`sync-error-${user.id}`, (data) => {
        setSyncingEmpresas(prev => ({ ...prev, [data.empresaId]: false }));
        alert(`Error sincronizando: ${data.message}`);
        fetchEmpresas();
      });
      return () => { socket.disconnect(); };
    }
  }, [token, user?.id]);

  const handleSync = async (empresaId: string) => {
    try {
      setSyncingEmpresas(prev => ({ ...prev, [empresaId]: true }));
      await axios.post(`http://localhost:3000/scraper/sync/${empresaId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      setSyncingEmpresas(prev => ({ ...prev, [empresaId]: false }));
      alert("No se pudo iniciar la sincronización");
    }
  };

  const handleAddEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.patch(`http://localhost:3000/empresas/${editingId}`, {
          ruc, razonSocial, usuarioSol, ...(claveSol ? { claveSol } : {})
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('http://localhost:3000/empresas', {
          ruc, razonSocial, usuarioSol, claveSol
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setRuc(''); setRazonSocial(''); setUsuarioSol(''); setClaveSol('');
      fetchEmpresas();
    } catch (error) {
      alert("Error al guardar la empresa");
    }
  };

  const handleEdit = (empresa: any) => {
    setEditingId(empresa.id);
    setRuc(empresa.ruc);
    setRazonSocial(empresa.razonSocial);
    setUsuarioSol(empresa.usuarioSol);
    setClaveSol('');
    setIsModalOpen(true);
  };

  const confirmDelete = (id: string) => {
    setEmpresaToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!empresaToDelete) return;
    try {
      await axios.delete(`http://localhost:3000/empresas/${empresaToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEmpresas();
    } catch (error) {
      alert("Error al eliminar");
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setRuc(''); setRazonSocial(''); setUsuarioSol(''); setClaveSol('');
    setIsModalOpen(true);
  };

  const filteredEmpresas = empresas.filter(emp => 
    emp.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.ruc.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Empresas</h2>
          <p className="text-gray-400 text-sm">Administra las credenciales y sincronización de tus {empresas.length} empresas.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Agregar Empresa
        </button>
      </div>

      {/* Buscador Rápido */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
        <input 
          type="text" 
          placeholder="Buscar por RUC o Razón Social..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#111827] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20 bg-[#111827] rounded-3xl border border-white/5">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          Cargando base de datos de empresas...
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-20 text-center">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No se encontraron empresas con esos criterios.</p>
        </div>
      ) : (
        <div className="bg-[#111827] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-white/5">Empresa / RUC</th>
                <th className="px-6 py-4 border-b border-white/5">Usuario SOL</th>
                <th className="px-6 py-4 border-b border-white/5">Última Sincro</th>
                <th className="px-6 py-4 border-b border-white/5">Estado Sincro</th>
                <th className="px-6 py-4 border-b border-white/5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEmpresas.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center border border-white/10 group-hover:from-blue-600 group-hover:to-indigo-600 transition-all">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white mb-0.5">{emp.razonSocial}</div>
                        <div className="text-xs font-mono text-gray-500">RUC: {emp.ruc}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-300 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      {emp.usuarioSol}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        {emp.ultimaSincronizacion 
                          ? new Date(emp.ultimaSincronizacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'Nunca'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {emp.estadoSincro === 'SYNCING' ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full border border-blue-400/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                        SINCRONIZANDO
                      </span>
                    ) : emp.estadoSincro === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        TERMINADO
                      </span>
                    ) : emp.estadoSincro === 'ERROR' ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        ERROR
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                        ESPERA
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <button 
                        onClick={() => handleSync(emp.id)}
                        disabled={syncingEmpresas[emp.id]}
                        className={`p-2 rounded-lg border transition-all ${syncingEmpresas[emp.id] ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20'}`}
                        title="Sincronizar"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingEmpresas[emp.id] ? 'animate-spin' : ''}`} />
                      </button>
                      <button 
                        onClick={() => handleEdit(emp)}
                        className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => confirmDelete(emp.id)}
                        className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Agregar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-xl font-bold text-white">{editingId ? 'Editar Empresa' : 'Vincular Nueva Empresa'}</h3>
            </div>
            <form onSubmit={handleAddEmpresa} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1.5">RUC</label>
                <input 
                  type="text" required maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value)}
                  className="w-full bg-[#1f2937]/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="206..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1.5">Razón Social</label>
                <input 
                  type="text" required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full bg-[#1f2937]/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-1.5">Usuario SOL</label>
                  <input 
                    type="text" required value={usuarioSol} onChange={(e) => setUsuarioSol(e.target.value)}
                    className="w-full bg-[#1f2937]/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-1.5">Clave SOL</label>
                  <input 
                    type="password" required={!editingId} value={claveSol} onChange={(e) => setClaveSol(e.target.value)}
                    className="w-full bg-[#1f2937]/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder={editingId ? "••••••••" : ""}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-8 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all">
                  {editingId ? 'Actualizar' : 'Vincular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="¿Eliminar Empresa?"
        message="Esta acción es irreversible y detendrá todas las sincronizaciones automáticas del buzón de esta empresa."
      />
    </div>
  );
}
