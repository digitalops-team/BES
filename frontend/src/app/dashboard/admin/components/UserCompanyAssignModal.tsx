"use client";
import React, { useState, useMemo } from 'react';
import { X, Building2, Search, Check, Loader2 } from 'lucide-react';

interface UserCompanyAssignModalProps {
  isOpen: boolean;
  selectedUser: any;        // usuario al que se asigna
  empresasAdmin: any[];     // todas las empresas con asignaciones[]
  loading: boolean;
  onClose: () => void;
  onToggle: (empresaId: string, userId: string, assigned: boolean) => Promise<void>;
}

export const UserCompanyAssignModal: React.FC<UserCompanyAssignModalProps> = ({
  isOpen, selectedUser, empresasAdmin, loading, onClose, onToggle
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const isAssigned = (empresaId: string) => {
    const emp = empresasAdmin.find(e => e.id === empresaId);
    return emp?.asignaciones?.some((a: any) => a.usuario?.id === selectedUser?.id) ?? false;
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return empresasAdmin;
    const term = searchTerm.toLowerCase();
    return empresasAdmin.filter(e =>
      e.razonSocial.toLowerCase().includes(term) ||
      e.ruc.includes(term)
    );
  }, [empresasAdmin, searchTerm]);

  const handleToggle = async (empresa: any) => {
    if (toggling) return;
    setToggling(empresa.id);
    try {
      await onToggle(empresa.id, selectedUser.id, isAssigned(empresa.id));
    } finally {
      setToggling(null);
    }
  };

  if (!isOpen || !selectedUser) return null;

  const assignedCount = empresasAdmin.filter(e => isAssigned(e.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#111827] rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-indigo-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-base">
              {selectedUser.nombre?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Asignar Empresas</h3>
              <p className="text-xs text-gray-400">
                <span className="text-white font-semibold">{selectedUser.nombre}</span>
                {' · '}
                <span className="text-emerald-400 font-semibold">{assignedCount} asignadas</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3 bg-[#1f2937] border border-white/10 rounded-xl px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar empresa por nombre o RUC..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de empresas */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loading ? (
            <div className="p-10 flex items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Cargando empresas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No se encontraron empresas.</p>
            </div>
          ) : filtered.map(empresa => {
            const assigned = isAssigned(empresa.id);
            const isLoading = toggling === empresa.id;

            return (
              <button
                key={empresa.id}
                onClick={() => handleToggle(empresa)}
                disabled={!!toggling}
                className={`w-full flex items-center gap-4 px-5 py-4 transition-colors text-left ${
                  assigned ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-white/[0.02]'
                } disabled:opacity-60`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  assigned
                    ? 'bg-indigo-500/20 border-indigo-500/30'
                    : 'bg-white/5 border-white/10'
                }`}>
                  <Building2 className={`w-4 h-4 ${assigned ? 'text-indigo-400' : 'text-gray-500'}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${assigned ? 'text-white' : 'text-gray-300'}`}>
                    {empresa.razonSocial}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">RUC: {empresa.ruc}</p>
                </div>

                {/* Estado */}
                <div className={`flex items-center gap-2 flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                  isLoading
                    ? 'text-gray-400 bg-white/5 border-white/10'
                    : assigned
                      ? 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
                      : 'text-gray-500 bg-white/5 border-white/10'
                }`}>
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : assigned ? (
                    <><Check className="w-3.5 h-3.5" /> Asignada</>
                  ) : (
                    '+ Asignar'
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {empresasAdmin.length} empresas en total · haz clic para asignar/quitar
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-colors border border-white/10"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
