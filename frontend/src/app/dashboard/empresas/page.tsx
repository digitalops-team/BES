"use client";
import { useState, useRef } from 'react';
import { Building2, Plus, Search, RefreshCw, Download, Upload, X } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { useEmpresas } from './hooks/useEmpresas';
import { EmpresaTable } from './components/EmpresaTable';
import { EmpresaFormModal } from './components/EmpresaFormModal';
import * as XLSX from 'xlsx';

export default function EmpresasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<string | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<any | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    empresas,
    loading,
    syncingEmpresas,
    syncingAll,
    handleSync,
    handleSyncAll,
    deleteEmpresa,
    saveEmpresa,
    user
  } = useEmpresas();

  const filteredEmpresas = empresas.filter(emp => 
    emp.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.ruc.includes(searchTerm)
  );

  const handleEdit = (empresa: any) => {
    setEditingEmpresa(empresa);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingEmpresa(null);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const data = empresas.map(emp => ({
      'Razón Social': emp.razonSocial,
      'RUC': emp.ruc,
      'Usuario SOL': emp.usuarioSol,
      'Estado Conexión': emp.estadoConexion,
      'Total Notificaciones': emp._count?.notificaciones ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    XLSX.writeFile(wb, `BES_Empresas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      setImportPreview(rows);
      setIsImportModalOpen(true);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    let success = 0, errors = 0;
    for (const row of importPreview) {
      try {
        await saveEmpresa(null, {
          razonSocial: row['Razón Social'] || row['Razon Social'] || '',
          ruc: String(row['RUC'] || ''),
          usuarioSol: row['Usuario SOL'] || row['Usuario Sol'] || '',
          claveSol: String(row['Clave SOL'] || row['Clave Sol'] || ''),
        });
        success++;
      } catch {
        errors++;
      }
    }
    setImporting(false);
    setIsImportModalOpen(false);
    setImportPreview([]);
    alert(`Importación completada: ${success} exitosas, ${errors} errores.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Empresas</h2>
          <p className="text-gray-400 text-sm">Administra las credenciales y sincronización de tus {empresas.length} empresas.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Exportar */}
          <button
            onClick={handleExport}
            disabled={empresas.length === 0}
            className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          {/* Importar */}
          {user?.rol === 'SUPER_ADMIN' && (
            <>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
              >
                <Upload className="w-4 h-4" /> Importar Excel
              </button>
            </>
          )}
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || empresas.length === 0}
            className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Iniciando...' : 'Sincronizar Todas'}
          </button>
          {user?.rol === 'SUPER_ADMIN' && (
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" /> Agregar Empresa
            </button>
          )}
        </div>
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
        <input 
          type="text" 
          placeholder="Buscar por RUC o Razón Social..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#111827] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20 bg-[#111827] rounded-3xl border border-white/5">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          Cargando base de datos de empresas...
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-20 text-center">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No se encontraron empresas con esos criterios.</p>
        </div>
      ) : (
        <EmpresaTable 
          empresas={filteredEmpresas}
          syncingEmpresas={syncingEmpresas}
          onSync={handleSync}
          onEdit={handleEdit}
          onDelete={(id) => { setEmpresaToDelete(id); setIsDeleteModalOpen(true); }}
          userRol={user?.rol}
        />
      )}

      <EmpresaFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={saveEmpresa}
        initialData={editingEmpresa}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (empresaToDelete) {
            try {
              await deleteEmpresa(empresaToDelete);
            } catch (error) {
              alert("Error al eliminar");
            }
          }
        }}
        title="¿Eliminar Empresa?"
        message="Esta acción es irreversible y detendrá todas las sincronizaciones automáticas del buzón de esta empresa."
      />
      {/* Modal de Previsualización de Importación */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] rounded-3xl border border-white/10 w-full max-w-3xl flex flex-col max-h-[80vh] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Previsualizar Importación</h3>
                <p className="text-sm text-gray-400 mt-1">{importPreview.length} empresas detectadas en el archivo Excel</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-gray-500 uppercase border-b border-white/5">
                    <th className="pb-3 pr-4">Razón Social</th>
                    <th className="pb-3 pr-4">RUC</th>
                    <th className="pb-3 pr-4">Usuario SOL</th>
                    <th className="pb-3">Clave SOL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {importPreview.map((row, idx) => (
                    <tr key={idx} className="text-gray-300">
                      <td className="py-3 pr-4">{row['Razón Social'] || row['Razon Social'] || '—'}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{String(row['RUC'] || '—')}</td>
                      <td className="py-3 pr-4">{row['Usuario SOL'] || row['Usuario Sol'] || '—'}</td>
                      <td className="py-3 font-mono text-xs text-gray-500">{'•'.repeat(8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 border-t border-white/5 flex items-center justify-between">
              <div className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                ⚠️ Las claves SOL serán cifradas automáticamente al importar.
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  {importing ? 'Importando...' : `Importar ${importPreview.length} Empresas`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
