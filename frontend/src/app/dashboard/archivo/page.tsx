"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { FileText as FileIcon, Search as SearchIcon, X as XIcon, ExternalLink as ExternalIcon, MailOpen, Clock, FileText, AlertTriangle, Archive } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

function ArchivoContent() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const token = useAuthStore((state) => state.token);

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await api.get('/notificaciones');
      // Solo LEIDO en el archivo
      setNotificaciones(res.data.filter((n: any) => n.estado === 'LEIDO' || n.estado === 'SIN_PDF'));
    } catch (error) {
      console.error("Error loading notifications", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchNotificaciones();
  }, [token, fetchNotificaciones]);

  const filteredData = notificaciones.filter(notif => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return notif.empresa.ruc.includes(term) ||
      notif.empresa.razonSocial.toLowerCase().includes(term) ||
      notif.asunto.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Archive className="w-7 h-7 text-gray-400" />
            Archivo
          </h2>
          <p className="text-gray-400 text-sm mt-1">Historial de todas las notificaciones procesadas y leídas.</p>
        </div>
        <span className="text-xs font-semibold text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
          {notificaciones.length} registros en total
        </span>
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
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="p-10 text-center text-gray-400">Cargando archivo...</div>
      ) : (
        <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {filteredData.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <Archive className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-lg">El archivo está vacío</p>
                <p className="text-sm text-gray-500 mt-2">
                  {searchTerm ? 'No se encontraron resultados.' : 'Las notificaciones leídas aparecerán aquí.'}
                </p>
              </div>
            ) : filteredData.map((notif: any) => (
              <div
                key={notif.id}
                className={`p-6 flex items-start gap-6 transition-colors hover:bg-white/[0.02] cursor-pointer`}
                onClick={() => notif.rutaArchivoPdf && setSelectedPdf(notif.rutaArchivoPdf)}
              >
                <div className="pt-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                    notif.estado === 'SIN_PDF'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-gray-800 border-white/10'
                  }`}>
                    <MailOpen className={`w-5 h-5 ${notif.estado === 'SIN_PDF' ? 'text-amber-400' : 'text-gray-500'}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-300">{notif.empresa.razonSocial}</span>
                      <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-gray-500 border border-white/5">
                        RUC: {notif.empresa.ruc}
                      </span>
                      {notif.estado === 'SIN_PDF' && (
                        <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                          SIN PDF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(notif.fechaMensaje).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <h4 className="text-base mb-1 truncate text-gray-400 font-medium">{notif.asunto}</h4>
                  {notif.rutaArchivoPdf && (
                    <span className="flex items-center gap-2 text-sm font-medium text-indigo-400/70">
                      <FileText className="w-4 h-4" /> Ver PDF →
                    </span>
                  )}
                  {notif.estado === 'SIN_PDF' && (
                    <div className="flex items-center gap-2 text-amber-400/70 text-xs mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      PDF no disponible en servidores SUNAT
                    </div>
                  )}
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
    </div>
  );
}

export default function ArchivoPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Cargando archivo...</div>}>
      <ArchivoContent />
    </Suspense>
  );
}
