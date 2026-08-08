"use client";

import { useEffect } from 'react';
import { X, Download, FileText, AlertTriangle, Building, Calendar, ExternalLink, CircleDollarSign } from 'lucide-react';

interface PdfViewerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notificacion: {
    id: string;
    asunto: string;
    fechaMensaje: string;
    rutaArchivoPdf: string | null;
    montoExigible?: string | null;
    expedienteCoactivo?: string | null;
    empresa?: {
      ruc: string;
      razonSocial: string;
    };
  } | null;
}

export function PdfViewerDrawer({ isOpen, onClose, notificacion }: PdfViewerDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !notificacion) return null;

  const pdfUrl = notificacion.rutaArchivoPdf;
  const asuntoLower = notificacion.asunto.toLowerCase();
  const isUrgent =
    asuntoLower.includes('orden de pago') ||
    asuntoLower.includes('coactiv') ||
    asuntoLower.includes('esquela') ||
    asuntoLower.includes('embargo') ||
    asuntoLower.includes('conclusi');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Centered Modal Content Box */}
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#111827] border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden z-10">
        
        {/* Header con información rica */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#1f2937]/50 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isUrgent ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" /> ALERTA CRÍTICA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                  <FileText className="w-3.5 h-3.5" /> NOTIFICACIÓN SUNAT
                </span>
              )}

              {notificacion.montoExigible && (
                <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <CircleDollarSign className="w-3.5 h-3.5" /> Deuda Exigible: {notificacion.montoExigible}
                </span>
              )}

              {notificacion.expedienteCoactivo && (
                <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" /> Exp: {notificacion.expedienteCoactivo}
                </span>
              )}

              {notificacion.empresa && (
                <span className="text-xs text-gray-300 flex items-center gap-1 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10 font-mono truncate max-w-full">
                  <Building className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  {notificacion.empresa.ruc} - {notificacion.empresa.razonSocial}
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-white leading-tight line-clamp-2">
              {notificacion.asunto}
            </h3>

            <p className="text-xs text-gray-400 flex items-center gap-1.5 pt-0.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Fecha del Mensaje: {new Date(notificacion.fechaMensaje).toLocaleString('es-PE')}
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs transition-all shadow-md shadow-indigo-500/20"
              >
                <Download className="w-3.5 h-3.5" /> Descargar PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body (Iframe) */}
        <div className="flex-1 bg-[#0a0f1c] relative flex items-center justify-center p-2 min-h-0">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full rounded-2xl border border-white/5 bg-white"
              title="Visor PDF SUNAT"
            />
          ) : (
            <div className="text-center space-y-3 p-8">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white">Archivo PDF No Disponible</h4>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Este documento fue registrado desde el Buzón de SUNAT, pero su archivo PDF no pudo ser descargado directamente desde sus servidores.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
