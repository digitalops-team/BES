import React from 'react';
import { Building2, Plus, X, Users, Settings } from 'lucide-react';

interface CompanyDirectoryListProps {
  empresas: any[];
  onAssignClick: (empresa: any) => void;
  onRevokeUser: (empresaId: string, userId: string) => Promise<void>;
}

export const CompanyDirectoryList: React.FC<CompanyDirectoryListProps> = ({ 
  empresas, 
  onAssignClick, 
  onRevokeUser 
}) => {
  return (
    <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" /> Directorio de Empresas
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Visualiza y gestiona el acceso de los usuarios a cada empresa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            Total: {empresas.length} empresas
          </span>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {empresas.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No hay empresas registradas aún.</p>
          </div>
        ) : empresas.map(empresa => (
          <div key={empresa.id} className="p-6 hover:bg-white/[0.02] transition-colors">
            
            {/* Cabecera de la empresa */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-white font-bold text-base flex items-center gap-2">
                  {empresa.razonSocial}
                </h4>
                <p className="text-gray-500 text-xs font-mono mt-1">RUC: {empresa.ruc} | SOL: {empresa.usuarioSol}</p>
              </div>
              <button
                onClick={() => onAssignClick(empresa)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-400/10 hover:bg-indigo-400/20 px-3 py-1.5 rounded-lg border border-indigo-400/20 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" /> Gestionar Accesos
              </button>
            </div>

            {/* Usuarios Asignados */}
            <div className="bg-[#1f2937]/30 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Usuarios con acceso ({empresa.asignaciones?.length || 0})
                </span>
              </div>
              
              {(!empresa.asignaciones || empresa.asignaciones.length === 0) ? (
                <p className="text-sm text-gray-500 italic">No hay usuarios asignados a esta empresa.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {empresa.asignaciones.map((asig: any) => (
                    <div 
                      key={asig.usuario.id}
                      className="flex items-center gap-2 bg-[#1f2937] border border-white/10 px-3 py-1.5 rounded-lg group"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                        {asig.usuario.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-300 font-medium">
                        {asig.usuario.nombre}
                      </span>
                      <button
                        onClick={() => onRevokeUser(empresa.id, asig.usuario.id)}
                        className="ml-1 p-0.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="Revocar acceso"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => onAssignClick(empresa)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:text-indigo-400 hover:border-indigo-400 hover:bg-indigo-400/10 transition-colors"
                    title="Añadir usuario"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};
