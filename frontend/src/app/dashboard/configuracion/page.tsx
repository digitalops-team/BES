"use client";

import { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Database, RefreshCw, CheckCircle, Volume2, VolumeX, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type Tab = 'preferences' | 'system';

export default function ConfiguracionPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('preferences');
  
  // Preferences state (Browser local storage)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  // System actions state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const isAdmin = user?.rol === 'SUPER_ADMIN' || user?.rol === 'ADMIN';

  useEffect(() => {
    // Cargar sonido habilitado desde localStorage
    const savedSound = localStorage.getItem('bes_sound_enabled');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }
  }, []);

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('bes_sound_enabled', String(newValue));
  };

  const handleSyncAll = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await api.post('/scraper/sync-all');
      setSyncMessage(`Sincronización iniciada: ${res.data.message} (${res.data.count} empresas encoladas).`);
    } catch (error: any) {
      console.error("Error starting massive sync", error);
      setSyncMessage('Error al iniciar la sincronización masiva.');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleClearQueue = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await api.post('/scraper/clear-queue');
      setSyncMessage(res.data.message);
    } catch (error: any) {
      console.error("Error clearing queue", error);
      setSyncMessage('Error al cancelar y limpiar la cola de tareas.');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-indigo-400" />
          Configuración
        </h2>
        <p className="text-gray-400 text-sm mt-1">Administra tus preferencias de notificación y tareas del sistema.</p>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 border-b border-white/5 pb-px">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeTab === 'preferences'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          Preferencias
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            Sistema (Admins)
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="bg-[#111827] rounded-3xl border border-white/5 p-8 max-w-3xl">
        {activeTab === 'preferences' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                <Bell className="w-5 h-5 text-indigo-400" />
                Preferencias de Notificación
              </h3>
              <p className="text-gray-400 text-xs mb-6">Ajusta cómo deseas interactuar con el sistema de alertas.</p>

              <div className="space-y-4">
                {/* Sonido */}
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Sonido de alerta en tiempo real</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Reproducir un sonido cuando el robot detecta un documento urgente en la web.</p>
                  </div>
                  <button
                    onClick={handleSoundToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      soundEnabled
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-gray-500/10 text-gray-400 border-white/5'
                    }`}
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4" /> Activo
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4" /> Silenciado
                      </>
                    )}
                  </button>
                </div>

                {/* Notificación de Correo */}
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Alertas por Correo Electrónico</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Enviar notificaciones inmediatas sobre resoluciones y órdenes de pago (SMTP).</p>
                  </div>
                  <button
                    onClick={() => setEmailAlerts(!emailAlerts)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      emailAlerts
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-gray-500/10 text-gray-400 border-white/5'
                    }`}
                  >
                    {emailAlerts ? 'Habilitado' : 'Deshabilitado'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && isAdmin && (
          <div className="space-y-8">
            {/* Sincronización Masiva */}
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                Ejecuciones de Emergencia
              </h3>
              <p className="text-gray-400 text-xs mb-6">Comandos manuales para controlar el robot de scraping fuera del horario programado.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: Forzar Sincronización */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Forzar Sincronización Masiva</h4>
                    <p className="text-xs text-gray-500 mt-1.5">Encola un trabajo de scraping en BullMQ para todas las empresas activas del sistema de forma inmediata.</p>
                  </div>
                  <button
                    onClick={handleSyncAll}
                    disabled={syncLoading}
                    className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all text-xs"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                    {syncLoading ? 'Ejecutando...' : 'Sincronizar Todo Ahora'}
                  </button>
                </div>

                {/* Card 2: Cancelar Sincronización */}
                <div className="p-6 bg-red-500/[0.02] border border-red-500/10 rounded-2xl flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-red-400">Cancelar Sincronización (Limpiar Cola)</h4>
                    <p className="text-xs text-gray-500 mt-1.5">Vacía y elimina todos los trabajos pendientes y activos de la cola de Redis para detener el robot de inmediato.</p>
                  </div>
                  <button
                    onClick={handleClearQueue}
                    disabled={syncLoading}
                    className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-all text-xs border border-red-500/20"
                  >
                    <X className="w-4 h-4" />
                    {syncLoading ? 'Cancelando...' : 'Detener y Limpiar Cola'}
                  </button>
                </div>
              </div>
              
              {syncMessage && (
                <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 text-gray-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{syncMessage}</span>
                </div>
              )}
            </div>

            {/* Backups */}
            <div className="pt-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                <Database className="w-5 h-5 text-indigo-400" />
                Base de Datos y Backups
              </h3>
              <p className="text-gray-400 text-xs mb-6">Dado que estás corriendo BES en un servidor Xeon local, te recomendamos respaldar tu base de datos regularmente.</p>

              <div className="p-6 bg-blue-500/[0.02] border border-blue-500/10 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Comando de Backup Rápido</h4>
                <p className="text-xs text-gray-400">Ejecuta esta línea en la terminal de tu servidor Xeon para exportar una copia completa de la base de datos PostgreSQL:</p>
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-[11px] text-indigo-300 overflow-x-auto select-all">
                  docker exec -t bes_postgres pg_dump -U postgres bes_db &gt; backup_bes.sql
                </div>
                <p className="text-[11px] text-gray-500">Este comando creará un archivo llamado <code className="text-gray-400">backup_bes.sql</code> en el directorio donde lo ejecutes, conteniendo toda la información de tus empresas y notificaciones.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
