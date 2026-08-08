"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  User, 
  Activity, 
  Eye, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Laptop
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface AuditLogItem {
  id: string;
  usuarioId: string | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalles: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nombres?: string;
    apellidos?: string;
    nombre?: string;
    email: string;
    rol: string;
  } | null;
}

export default function AuditoriaPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accionFilter, setAccionFilter] = useState('');
  const [accionesUnicas, setAccionesUnicas] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchAcciones = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auditoria/acciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccionesUnicas(data);
      }
    } catch (e) {
      console.error('Error cargando acciones únicas:', e);
    }
  }, [API_URL, token]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (accionFilter) params.append('accion', accionFilter);

      const res = await fetch(`${API_URL}/auditoria?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.items);
        setTotalPages(data.meta.totalPages);
        setTotalItems(data.meta.total);
      }
    } catch (e) {
      console.error('Error cargando logs de auditoría:', e);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, page, search, accionFilter]);

  useEffect(() => {
    fetchAcciones();
  }, [fetchAcciones]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getAccionBadgeClass = (accion: string) => {
    const acc = accion.toUpperCase();
    if (acc.includes('CREAR') || acc.includes('REGISTRO')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (acc.includes('ELIMINAR') || acc.includes('FALLIDO')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (acc.includes('SCRAPING') || acc.includes('INICIAR')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (acc.includes('DESCARGAR') || acc.includes('LEER')) {
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  };

  const formatDetails = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            Registro de Auditoría de Sistema
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Historial completo de acciones, accesos, consultas y cambios realizados en el sistema.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Logs
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111827] p-4 rounded-2xl border border-white/5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por acción, usuario, IP..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#1f2937] text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-gray-500"
          />
        </div>

        {/* Filter Accion */}
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={accionFilter}
            onChange={(e) => {
              setAccionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#1f2937] text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none"
          >
            <option value="">Todas las acciones</option>
            {accionesUnicas.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>

        {/* Stats counter */}
        <div className="flex items-center justify-end px-4 text-sm text-gray-400 font-medium">
          Total de Registros: <span className="text-white font-bold ml-2">{totalItems}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            <span>Cargando registro de auditoría...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
            <Activity className="w-10 h-10 text-gray-600 mb-1" />
            <p className="font-semibold text-white">No se encontraron eventos de auditoría</p>
            <p className="text-xs text-gray-500">Prueba ajustando los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#1f2937]/50 text-gray-400 uppercase text-xs border-b border-white/5 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4">Acción</th>
                  <th className="py-3.5 px-4">Entidad</th>
                  <th className="py-3.5 px-4">IP / Origen</th>
                  <th className="py-3.5 px-4 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(log.createdAt).toLocaleString('es-PE')}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {log.usuario ? (
                        (() => {
                          const fullName = log.usuario.nombres && log.usuario.apellidos
                            ? `${log.usuario.nombres} ${log.usuario.apellidos}`
                            : (log.usuario.nombre || log.usuario.email);
                          const initial = fullName.charAt(0).toUpperCase();
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                                {initial}
                              </div>
                              <div>
                                <p className="font-medium text-white text-xs">{fullName}</p>
                                <p className="text-[11px] text-gray-400 font-mono">{log.usuario.email}</p>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 text-xs font-mono">
                          <Laptop className="w-3 h-3" /> Sistema / Worker
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${getAccionBadgeClass(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-300">
                      {log.entidad || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400 font-mono">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Página {page} de {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 bg-[#1f2937] hover:bg-white/10 rounded-xl border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 bg-[#1f2937] hover:bg-white/10 rounded-xl border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Details */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Detalles del Evento de Auditoría
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-white transition-colors text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 block">ID Evento:</span>
                  <span className="font-mono text-gray-200">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Fecha y Hora:</span>
                  <span className="text-gray-200">{new Date(selectedLog.createdAt).toLocaleString('es-PE')}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Acción:</span>
                  <span className="text-indigo-300 font-bold">{selectedLog.accion}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Entidad Afectada:</span>
                  <span className="text-gray-200">{selectedLog.entidad || 'N/A'} (ID: {selectedLog.entidadId || 'N/A'})</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">Payload / Detalles (JSON):</span>
                <pre className="bg-[#0b0f17] p-3 rounded-xl border border-white/5 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-52">
                  {formatDetails(selectedLog.detalles) || 'Sin detalles extra'}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
