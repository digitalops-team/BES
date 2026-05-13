import React, { useState, useMemo } from 'react';
import { User, X, Check, Search, Building2 } from 'lucide-react';

interface CompanyAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCompany: any;
  usuarios: any[];
  onToggle: (empresaId: string, userId: string, assigned: boolean) => Promise<void>;
  loading: boolean;
}

export const CompanyAssignmentModal: React.FC<CompanyAssignmentModalProps> = ({
  isOpen,
  onClose,
  selectedCompany,
  usuarios,
  onToggle,
  loading
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Map users to include assignment status for the selected company
  const usersWithFlag = useMemo(() => {
    if (!selectedCompany) return [];
    
    // Create a set of assigned user IDs for quick lookup
    const assignedUserIds = new Set(
      selectedCompany.asignaciones?.map((a: any) => a.usuario?.id) || []
    );

    let filtered = usuarios;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = usuarios.filter(u => 
        u.nombre.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      );
    }

    return filtered.map(u => ({
      ...u,
      asignado: assignedUserIds.has(u.id)
    }));
  }, [usuarios, selectedCompany, searchQuery]);

  if (!isOpen || !selectedCompany) return null;

  const assignedCount = usersWithFlag.filter(u => u.asignado).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-[#111827] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Asignar Usuarios a Empresa</h3>
              <p className="text-sm text-gray-400">{selectedCompany.razonSocial} (RUC: {selectedCompany.ruc})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Stats */}
        <div className="p-5 border-b border-white/5 bg-[#1f2937]/50">
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111827] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-gray-500 text-sm"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1">
            <span>{usersWithFlag.length} usuarios encontrados</span>
            <span className="text-emerald-400">
              {assignedCount} asignados a esta empresa
            </span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <p>Actualizando asignaciones...</p>
            </div>
          ) : usersWithFlag.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <User className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No se encontraron usuarios con esa búsqueda.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {usersWithFlag.map(u => (
                <div 
                  key={u.id} 
                  className={`flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors ${
                    u.asignado ? 'bg-emerald-500/[0.03]' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      u.asignado 
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
                        : 'bg-white/5 border border-white/10 text-gray-400'
                    }`}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">{u.nombre}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggle(selectedCompany.id, u.id, u.asignado)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
                      u.asignado
                        ? 'text-red-400 bg-red-400/10 border-red-400/20 hover:bg-red-400/20'
                        : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/20'
                    }`}
                  >
                    {u.asignado ? (
                      <><X className="w-4 h-4" /> Revocar</>
                    ) : (
                      <><Check className="w-4 h-4" /> Asignar</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
