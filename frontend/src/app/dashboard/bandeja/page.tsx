"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText as FileIcon, Search as SearchIcon, X as XIcon, ExternalLink as ExternalIcon, FilterX as FilterIcon, MailOpen, Mail, Clock, FileText, AlertTriangle, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

function BandejaContent() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresaFilterId = searchParams.get('empresa');

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await api.get('/notificaciones');
      // La API ya devuelve solo las NO LEÍDAS por este usuario
      setNotificaciones(res.data);
    } catch (error) {
      console.error("Error loading notifications", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchNotificaciones();
  }, [token, fetchNotificaciones]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notificaciones/${id}/read`);
      // Remove from list immediately
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const handleViewPdf = async (notif: any) => {
    await markAsRead(notif.id);
    if (notif.rutaArchivoPdf) setSelectedPdf(notif.rutaArchivoPdf);
  };

  const clearInbox = async () => {
    // Marcar todo como leído para ESTE usuario (no elimina, no afecta a otros)
    await api.patch('/notificaciones/mark-all-read');
    await fetchNotificaciones();
  };

  const filteredData = notificaciones.filter(notif => {
    if (empresaFilterId && notif.empresa.id !== empresaFilterId) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!notif.empresa.ruc.includes(term) && 
          !notif.empresa.razonSocial.toLowerCase().includes(term) && 
          !notif.asunto.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Mail className="w-7 h-7 text-blue-400" />
            Bandeja de Entrada
          </h2>
          <p className="text-gray-400 text-sm mt-1">Notificaciones SUNAT sin leer. Al abrir el PDF, se marcarán como leídas automáticamente.</p>
        </div>
        {filteredData.length > 0 && (
          <button
            onClick={() => router.push('/dashboard/archivo')}
            className="text-sm text-gray-400 hover:text-indigo-400 transition-colors underline underline-offset-2"
          >
            Ver historial leídas →
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-[#111827] p-2 pl-4 rounded-2xl border border-white/5">
        <SearchIcon className="text-gray-500 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por RUC, Empresa o Asunto..."
          className="flex-1 bg-transparent border-none text-white outline-none placeholder-gray-500 py-2"
        />
        {empresaFilterId && (
          <button
            onClick={() => router.push('/dashboard/bandeja')}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors border border-red-500/20"
          >
            <FilterIcon className="w-4 h-4" />
            Quitar Filtro
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="p-10 text-center text-gray-400">Cargando bandeja...</div>
      ) : (
        <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Notificaciones Sin Leer
            </h3>
            <div className="flex items-center gap-3">
              {filteredData.length > 0 && (
                <button
                  onClick={() => setIsClearModalOpen(true)}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors border border-red-400/20"
                >
                  <Trash2 className="w-4 h-4" /> Limpiar Todo
                </button>
              )}
              <span className="bg-blue-500/10 text-blue-400 py-1.5 px-4 rounded-xl text-sm font-semibold border border-blue-500/20">
                {filteredData.length} Sin Leer
              </span>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {filteredData.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <MailOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-lg">¡Bandeja vacía!</p>
                <p className="text-sm text-gray-500 mt-2">No tienes notificaciones sin leer.</p>
                <button
                  onClick={() => router.push('/dashboard/archivo')}
                  className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                >
                  Ver historial de notificaciones leídas →
                </button>
              </div>
            ) : filteredData.map((notif: any) => (
              <div
                key={notif.id}
                className="p-6 flex items-start gap-6 transition-colors hover:bg-white/[0.02] cursor-pointer bg-blue-500/[0.02]"
                onClick={() => handleViewPdf(notif)}
              >
                <div className="pt-1">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white">{notif.empresa.razonSocial}</span>
                      <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-gray-400 border border-white/5">
                        RUC: {notif.empresa.ruc}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(notif.fechaMensaje).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <h4 className="text-lg mb-2 truncate text-blue-100 font-bold">{notif.asunto}</h4>
                  <div className="flex flex-col gap-2 mt-2">
                    {notif.estado === 'SIN_PDF' ? (
                      <div className="flex items-center gap-2 text-amber-400/80 text-sm bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>PDF no disponible en servidores de SUNAT. El título fue registrado para tu referencia.</span>
                      </div>
                    ) : notif.rutaArchivoPdf ? (
                      <span className="flex items-center gap-2 text-sm font-medium text-blue-400">
                        <FileText className="w-4 h-4" /> Click para ver el documento PDF
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      {selectedPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1f2937]/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <FileIcon className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-bold text-white">Visor de Resolución SUNAT</h3>
              </div>
              <div className="flex items-center gap-2">
                <a href={selectedPdf} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                  <ExternalIcon className="w-5 h-5" />
                </a>
                <button onClick={() => setSelectedPdf(null)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-900 p-2">
              <iframe src={selectedPdf} className="w-full h-full rounded-xl border border-white/5" title="Visor PDF" />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={async () => { await clearInbox(); setIsClearModalOpen(false); }}
        title="¿Limpiar Bandeja?"
        message="¿Estás seguro de eliminar todas las notificaciones? Esta acción borrará los registros de forma irreversible."
      />
    </div>
  );
}

export default function BandejaPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Cargando bandeja...</div>}>
      <BandejaContent />
    </Suspense>
  );
}
