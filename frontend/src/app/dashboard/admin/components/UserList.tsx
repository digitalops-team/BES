import React from 'react';
import { Users, Plus, Trash2, Building2, Pencil, Eye } from 'lucide-react';

interface UserListProps {
  usuarios: any[];
  empresasAdmin: any[];
  callerRol: string;
  onDelete: (id: string) => void;
  onAssign: (id: string) => void;
  onEdit: (user: any) => void;
  onDetail: (id: string) => void;
  onCreateOpen: () => void;
}

export const UserList: React.FC<UserListProps> = ({
  usuarios, empresasAdmin, callerRol,
  onDelete, onAssign, onEdit, onDetail, onCreateOpen
}) => {
  // Calcular cuántas empresas tiene asignadas cada usuario
  const getEmpresaCount = (userId: string) => {
    return empresasAdmin.reduce((count, emp) => {
      const assigned = emp.asignaciones?.some((a: any) => a.usuario?.id === userId);
      return assigned ? count + 1 : count;
    }, 0);
  };

  return (
    <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Usuarios del Sistema</h3>
        <button
          onClick={onCreateOpen}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> Crear Usuario
        </button>
      </div>

      <div className="divide-y divide-white/5">
        {usuarios.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No hay usuarios adicionales aún.</p>
          </div>
        ) : usuarios.map(u => {
          const empresaCount = getEmpresaCount(u.id);
          return (
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
              <div className="flex items-center gap-2">
                {/* Badge de empresas */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                  empresaCount > 0
                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    : 'text-gray-500 bg-white/5 border-white/10'
                }`}>
                  <Building2 className="w-3.5 h-3.5" />
                  {empresaCount} {empresaCount === 1 ? 'empresa' : 'empresas'}
                </div>
                {/* Badge de rol */}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  u.rol === 'ADMIN'
                    ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                    : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                }`}>
                  {u.rol === 'ADMIN' ? 'ADMIN' : 'USUARIO'}
                </span>

                {/* Botón Ver Detalle */}
                <button
                  onClick={() => onDetail(u.id)}
                  title="Ver detalle"
                  className="p-2 text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Botón Editar */}
                <button
                  onClick={() => onEdit(u)}
                  title="Editar usuario"
                  className="p-2 text-gray-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {/* Asignar empresas */}
                <button
                  onClick={() => onAssign(u.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-400/10 hover:bg-indigo-400/20 px-3 py-1.5 rounded-lg border border-indigo-400/20 transition-colors font-medium whitespace-nowrap"
                >
                  Asignar
                </button>

                {/* Botón Eliminar */}
                <button
                  onClick={() => onDelete(u.id)}
                  title="Eliminar usuario"
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

