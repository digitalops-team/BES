"use client";
import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Calendar, Building2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '@/lib/api';

interface UserDetailModalProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ isOpen, userId, onClose }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    api.get(`/usuarios/${userId}`)
      .then(res => setUser(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const rolColor = {
    SUPER_ADMIN: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    ADMIN: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    USUARIO_LOCAL: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };

  const estadoColor = {
    CONECTADO: 'text-emerald-400',
    REQUIERE_ACTUALIZACION: 'text-amber-400',
    ERROR_SISTEMA: 'text-red-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#111827] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xl">
              {loading ? '...' : user?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{loading ? 'Cargando...' : user?.nombre}</h3>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : user ? (
          <div className="flex-1 overflow-y-auto">
            {/* Info Grid */}
            <div className="p-6 grid grid-cols-2 gap-4 border-b border-white/5">
              <div className="bg-[#1f2937]/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold mb-2">
                  <Shield className="w-3.5 h-3.5" /> Rol del Sistema
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-full border ${rolColor[user.rol as keyof typeof rolColor] || 'text-gray-400 bg-white/5 border-white/10'}`}>
                  {user.rol === 'SUPER_ADMIN' ? 'Super Admin' : user.rol === 'ADMIN' ? 'Admin' : 'Usuario'}
                </span>
              </div>

              <div className="bg-[#1f2937]/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold mb-2">
                  <Calendar className="w-3.5 h-3.5" /> Miembro desde
                </div>
                <p className="text-white text-sm font-semibold">
                  {new Date(user.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="bg-[#1f2937]/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold mb-2">
                  <Mail className="w-3.5 h-3.5" /> Correo electrónico
                </div>
                <p className="text-white text-sm font-semibold truncate">{user.email}</p>
              </div>

              <div className="bg-[#1f2937]/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold mb-2">
                  <Building2 className="w-3.5 h-3.5" /> Empresas a cargo
                </div>
                <p className="text-white text-2xl font-black">
                  {user.asignaciones?.length ?? 0}
                  <span className="text-gray-500 text-xs font-normal ml-1">asignadas</span>
                </p>
              </div>
            </div>

            {/* Empresa List */}
            <div className="p-6">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Empresas Asignadas
              </h4>

              {(!user.asignaciones || user.asignaciones.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>Este usuario no tiene empresas asignadas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {user.asignaciones.map((asig: any) => (
                    <div key={asig.empresa.id} className="flex items-center justify-between bg-[#1f2937]/50 rounded-xl px-4 py-3 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold">{asig.empresa.razonSocial}</p>
                          <p className="text-gray-500 text-xs font-mono">RUC: {asig.empresa.ruc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {asig.empresa.ultimaSincronizacion && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {new Date(asig.empresa.ultimaSincronizacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                        <span className={`text-xs font-bold ${estadoColor[asig.empresa.estadoConexion as keyof typeof estadoColor] || 'text-gray-400'}`}>
                          {asig.empresa.estadoConexion === 'CONECTADO' ? '● Conectado' :
                           asig.empresa.estadoConexion === 'REQUIERE_ACTUALIZACION' ? '● Actualizar' : '● Error'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
