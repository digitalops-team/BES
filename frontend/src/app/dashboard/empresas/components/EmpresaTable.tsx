import React from 'react';
import { Building2, RefreshCw, Edit2, Trash2, Clock, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmpresaTableProps {
  empresas: any[];
  syncingEmpresas: Record<string, boolean>;
  onSync: (id: string) => void;
  onEdit: (empresa: any) => void;
  onDelete: (id: string) => void;
  userRol?: string;
}

export const EmpresaTable: React.FC<EmpresaTableProps> = ({
  empresas,
  syncingEmpresas,
  onSync,
  onEdit,
  onDelete,
  userRol
}) => {
  const router = useRouter();

  return (
    <div className="bg-[#111827] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white/[0.02] text-gray-400 text-xs font-bold uppercase tracking-wider">
            <th className="px-6 py-4 border-b border-white/5">Empresa / RUC</th>
            <th className="px-6 py-4 border-b border-white/5">Usuario SOL</th>
            <th className="px-6 py-4 border-b border-white/5">Última Sincro</th>
            <th className="px-6 py-4 border-b border-white/5">Estado Sincro</th>
            <th className="px-6 py-4 border-b border-white/5">Notif. {new Date().getFullYear()}</th>
            <th className="px-6 py-4 border-b border-white/5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {empresas.map((emp) => (
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
              <td className="px-6 py-4">
                {(() => {
                  const count = emp._count?.notificaciones ?? null;
                  const synced = emp.estadoSincro === 'SUCCESS' || emp.estadoSincro === 'ERROR';
                  if (!synced) return <span className="text-xs text-gray-600">—</span>;
                  return (
                    <button 
                      onClick={() => router.push(`/dashboard?empresa=${emp.id}`)}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        count === 0 
                          ? 'text-amber-400 bg-amber-400/10 border-amber-400/20 hover:bg-amber-400/20' 
                          : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                      }`}
                    >
                      <Bell className="w-3 h-3" />
                      {count === 0 ? `Sin notif. ${new Date().getFullYear()}` : `${count} notif.`}
                    </button>
                  );
                })()}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 transition-opacity">
                  <button 
                    onClick={() => onSync(emp.id)}
                    disabled={syncingEmpresas[emp.id]}
                    className={`p-2 rounded-lg border transition-all ${syncingEmpresas[emp.id] ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20'}`}
                    title="Sincronizar"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingEmpresas[emp.id] ? 'animate-spin' : ''}`} />
                  </button>
                  {(userRol === 'SUPER_ADMIN' || userRol === 'ADMIN') && (
                    <>
                      <button 
                        onClick={() => onEdit(emp)}
                        className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(emp.id)}
                        className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
