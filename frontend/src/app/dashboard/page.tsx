"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { FileText, Search, Mail, MailOpen, Clock, X, ExternalLink, Trash2, AlertTriangle, FilterX } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

function InboxContent() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const token = useAuthStore((state) => state.token);
  const searchParams = useSearchParams();
  const router = useRouter();
  const empresaFilterId = searchParams.get('empresa');

  const fetchNotificaciones = async () => {
    try {
      const res = await axios.get('http://localhost:3000/notificaciones', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificaciones(res.data);
    } catch (error) {
      console.error("Error cargando notificaciones", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchNotificaciones();
  }, [token]);

  const handleClearInbox = async () => {
    try {
      await axios.delete('http://localhost:3000/notificaciones', {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotificaciones();
    } catch (error) {
      alert("Error al limpiar la bandeja");
    }
  };

  // Aplicar filtros de URL y búsqueda
  const displayData = notificaciones.filter(notif => {
    // 1. Filtro por URL (Empresa específica)
    if (empresaFilterId && notif.empresa.id !== empresaFilterId) return false;
    
    // 2. Filtro por barra de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchRuc = notif.empresa.ruc.includes(term);
      const matchRazon = notif.empresa.razonSocial.toLowerCase().includes(term);
      const matchAsunto = notif.asunto.toLowerCase().includes(term);
      if (!matchRuc && !matchRazon && !matchAsunto) return false;
    }
    return true;
  });
  
  const unreadCount = displayData.filter(n => n.estado === 'NO_LEIDO').length;

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4 bg-[#111827] p-2 pl-4 rounded-2xl border border-white/5">
        <Search className="text-gray-500 w-5 h-5" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por RUC, Empresa o Asunto..." 
          className="flex-1 bg-transparent border-none text-white outline-none placeholder-gray-500 py-2"
        />
        {empresaFilterId && (
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors border border-red-500/20"
          >
            <FilterX className="w-4 h-4" />
            Quitar Filtro
          </button>
        )}
      </div>

      {/* Inbox List */}
      <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Bandeja de Notificaciones
          </h3>
          <div className="flex items-center gap-3">
            {notificaciones.length > 0 && (
              <button 
                onClick={() => setIsClearModalOpen(true)}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors border border-red-400/20"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar Todo
              </button>
            )}
            <span className="bg-blue-500/10 text-blue-400 py-1.5 px-4 rounded-xl text-sm font-semibold border border-blue-500/20">
              {unreadCount} Sin Leer
            </span>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {displayData.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <MailOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No hay notificaciones del {new Date().getFullYear()} en esta bandeja.</p>
              <p className="text-xs mt-1 text-gray-600">Los documentos de años anteriores no se importan automáticamente.</p>
            </div>
          ) : displayData.map((notif: any) => (
            <div 
              key={notif.id} 
              className={`p-6 flex items-start gap-6 transition-colors hover:bg-white/[0.02] cursor-pointer group ${notif.estado === 'NO_LEIDO' ? 'bg-blue-500/[0.02]' : ''}`}
            >
              <div className="pt-1">
                {notif.estado === 'NO_LEIDO' ? (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-white/10">
                    <MailOpen className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${notif.estado === 'NO_LEIDO' ? 'text-white' : 'text-gray-300'}`}>
                      {notif.empresa.razonSocial}
                    </span>
                    <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-gray-400 border border-white/5">
                      RUC: {notif.empresa.ruc}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(notif.fechaMensaje).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <h4 className={`text-lg mb-2 truncate ${notif.estado === 'NO_LEIDO' ? 'text-blue-100 font-bold' : 'text-gray-400 font-medium'}`}>
                  {notif.asunto}
                </h4>
                
                <div className="flex flex-col gap-2 mt-2">
                  {notif.estado === 'SIN_PDF' ? (
                    <div className="flex items-center gap-2 text-amber-400/80 text-sm bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>PDF no disponible en servidores de SUNAT. El título fue registrado para tu referencia.</span>
                    </div>
                  ) : notif.rutaArchivoPdf ? (
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => setSelectedPdf(notif.rutaArchivoPdf)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors w-fit"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Documento PDF
                      </button>
                      <a href={notif.rutaArchivoPdf} target="_blank" rel="noreferrer" className="text-xs text-blue-500/50 hover:text-blue-400 font-mono truncate max-w-xl transition-colors">
                        {notif.rutaArchivoPdf}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visor de PDF (Modal) */}
      {selectedPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1f2937]/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-bold text-white">Visor de Resolución SUNAT</h3>
              </div>
              <div className="flex items-center gap-2">
                <a href={selectedPdf} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors" title="Abrir en nueva pestaña">
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button onClick={() => setSelectedPdf(null)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors" title="Cerrar visor">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-900 p-2">
              <iframe 
                src={selectedPdf} 
                className="w-full h-full rounded-xl border border-white/5"
                title="Visor PDF"
              />
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmación Premium */}
      <ConfirmModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearInbox}
        title="¿Limpiar Bandeja?"
        message="¿Estás seguro de eliminar todas las notificaciones? Esta acción borrará los registros de forma irreversible."
      />
    </div>
  );
}

export default function DashboardInbox() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Cargando bandeja...</div>}>
      <InboxContent />
    </Suspense>
  );
}
