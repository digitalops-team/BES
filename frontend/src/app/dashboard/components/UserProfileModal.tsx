"use client";

import React, { useState, useEffect } from 'react';
import { X, User, Building2, Key, Send, ShieldCheck, Mail, CreditCard, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { ChangePasswordModal } from './ChangePasswordModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user } = useAuthStore();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingEmpresas(true);
      api.get('/empresas')
        .then((res) => setEmpresas(res.data))
        .catch((err) => console.error('Error cargando empresas del usuario:', err))
        .finally(() => setLoadingEmpresas(false));
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  // Formateo seguro de DNI (si es UUID antiguo, mostrar aviso)
  const isUuidDni = (user as any).dni && (user as any).dni.length > 15;
  const displayDni = isUuidDni ? '00000000 (Pendiente)' : (user as any).dni || 'No registrado';

  // Nombres y Apellidos
  const nombres = (user as any).nombres || user.nombre || 'Usuario';
  const apellidos = (user as any).apellidos || '';
  const fullName = `${nombres} ${apellidos}`.trim();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
        <div className="absolute inset-0" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-[#111827] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10">
          
          {/* Header con Banner Gradient */}
          <div className="relative p-6 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-blue-900/40 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/20 flex items-center justify-center text-2xl font-black text-white shadow-xl">
                {nombres.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{fullName}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {user.rol}
                  </span>
                </div>
                <p className="text-xs text-indigo-300 font-mono mt-0.5">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body Scrollable */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">

            {/* Resumen de Datos Personales */}
            <div className="bg-[#1f2937]/50 rounded-2xl p-5 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" /> Datos Personales del Usuario
                </h4>
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  Solo Lectura (Admin)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Nombres y Apellidos:</span>
                  <span className="font-bold text-white text-sm">{fullName}</span>
                </div>

                <div>
                  <span className="text-gray-400 block mb-0.5">Documento de Identidad (DNI):</span>
                  <span className="font-bold text-white font-mono text-sm">{displayDni}</span>
                </div>

                <div>
                  <span className="text-gray-400 block mb-0.5">Correo Electrónico Autogenerado:</span>
                  <span className="font-mono text-indigo-400 font-semibold">{user.email}</span>
                </div>

                <div>
                  <span className="text-gray-400 block mb-0.5">Telegram Chat ID (Alertas Directas):</span>
                  <span className="font-mono font-semibold text-white">
                    {(user as any).telegramChatId ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Send className="w-3 h-3" /> {(user as any).telegramChatId}
                      </span>
                    ) : (
                      <span className="text-gray-500 font-normal italic">No vinculado (Solicitar a Admin)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Empresas Asignadas a su Nombre */}
            <div className="bg-[#1f2937]/50 rounded-2xl p-5 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" /> Empresas a su Nombre / Asignadas
                </h4>
                <span className="text-xs text-indigo-300 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                  {empresas.length} empresa(s)
                </span>
              </div>

              {loadingEmpresas ? (
                <p className="text-xs text-gray-400 text-center py-4">Cargando empresas asignadas...</p>
              ) : empresas.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500">
                  No hay empresas vinculadas a este usuario.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {empresas.map((emp) => (
                    <div key={emp.id} className="p-3 bg-[#111827] border border-white/5 rounded-xl space-y-1">
                      <p className="font-bold text-white text-xs truncate">{emp.razonSocial}</p>
                      <p className="text-[11px] text-gray-400 font-mono flex items-center justify-between">
                        <span>RUC: {emp.ruc}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.2 rounded ${
                          emp.estadoConexion === 'CONECTADO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {emp.estadoConexion || 'ACTIVO'}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acción Cambiar Contraseña */}
            <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white text-sm">Seguridad de la Cuenta</p>
                <p className="text-xs text-gray-400">Puedes cambiar tu contraseña en cualquier momento.</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0"
              >
                <Key className="w-4 h-4" /> Cambiar Contraseña
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-[#1f2937]/30 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal Cambiar Contraseña */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
