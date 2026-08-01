"use client";

import { useState } from 'react';
import { Download, Loader2, FileArchive } from 'lucide-react';
import JSZip from 'jszip';

interface ZipExportButtonProps {
  notificaciones: {
    id: string;
    asunto: string;
    rutaArchivoPdf: string | null;
  }[];
  empresaNombre?: string;
}

export function ZipExportButton({ notificaciones, empresaNombre = 'BES_Notificaciones' }: ZipExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadZip = async () => {
    const validPdfs = notificaciones.filter((n) => n.rutaArchivoPdf);
    if (validPdfs.length === 0) {
      alert('No hay archivos PDF disponibles para descargar en la selección.');
      return;
    }

    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(empresaNombre.replace(/[^a-zA-Z0-9_-]/g, '_'));

      for (let i = 0; i < validPdfs.length; i++) {
        const item = validPdfs[i];
        if (!item.rutaArchivoPdf) continue;

        try {
          const res = await fetch(item.rutaArchivoPdf);
          if (res.ok) {
            const blob = await res.blob();
            // Nombre de archivo limpio
            const cleanAsunto = item.asunto
              .replace(/[^a-zA-Z0-9_-]/g, '_')
              .substring(0, 50);
            folder?.file(`${i + 1}_${cleanAsunto}.pdf`, blob);
          }
        } catch (e) {
          console.error(`Error descargando PDF ${item.id}:`, e);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${empresaNombre}_PDFs_${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
    } catch (error) {
      console.error('Error generando archivo ZIP:', error);
      alert('Ocurrió un error al empaquetar el archivo ZIP.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownloadZip}
      disabled={downloading || notificaciones.filter(n => n.rutaArchivoPdf).length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {downloading ? (
        <Loader2 className="w-4 h-4 animate-spin text-white" />
      ) : (
        <FileArchive className="w-4 h-4" />
      )}
      {downloading ? 'Generando ZIP...' : `Descargar ZIP (${notificaciones.filter(n => n.rutaArchivoPdf).length})`}
    </button>
  );
}
