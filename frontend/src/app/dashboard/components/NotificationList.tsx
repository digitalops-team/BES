import React, { useState } from 'react';
import { Mail, MailOpen, Clock, FileText, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';

interface NotificationListProps {
  notifications: any[];
  unreadCount: number;
  onClear: () => void;
  onViewPdf: (url: string) => void;
  onRefresh?: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  unreadCount,
  onClear,
  onViewPdf,
  onRefresh,
}) => {
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  const handleRetryPdf = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    setRetrying((prev) => ({ ...prev, [notifId]: true }));
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/scraper/retry-pdf/${notifId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onRefresh?.();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.message || 'No se pudo recuperar el PDF. Inténtalo más tarde.');
      }
    } catch {
      alert('Error de conexión al reintentar el PDF.');
    } finally {
      setRetrying((prev) => ({ ...prev, [notifId]: false }));
    }
  };

  return (
    <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-400" />
          Bandeja de Notificaciones
        </h3>
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <button 
              onClick={onClear}
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
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <MailOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No hay notificaciones del {new Date().getFullYear()} en esta bandeja.</p>
            <p className="text-xs mt-1 text-gray-600">Los documentos de años anteriores no se importan automáticamente.</p>
          </div>
        ) : notifications.map((notif: any) => (
          <div 
            key={notif.id} 
            className={`p-6 flex items-start gap-6 transition-colors hover:bg-white/[0.02] cursor-pointer group ${notif.estado === 'NO_LEIDO' ? 'bg-blue-500/[0.02]' : ''}`}
            onClick={() => notif.rutaArchivoPdf && onViewPdf(notif.rutaArchivoPdf)}
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
                  <div className="flex items-center gap-3 text-amber-400/80 text-sm bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">PDF no disponible temporalmente en los servidores de SUNAT.</span>
                    <button
                      onClick={(e) => handleRetryPdf(e, notif.id)}
                      disabled={retrying[notif.id]}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${retrying[notif.id] ? 'animate-spin' : ''}`} />
                      {retrying[notif.id] ? 'Reintentando...' : '🔄 Reintentar PDF'}
                    </button>
                  </div>
                ) : notif.rutaArchivoPdf ? (
                  <div className="flex flex-col gap-1">
                    <button 
                      className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors w-fit"
                    >
                      <FileText className="w-4 h-4" />
                      Click para ver el documento PDF
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
