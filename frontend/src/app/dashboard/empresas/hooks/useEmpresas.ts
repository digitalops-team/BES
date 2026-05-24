import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { io, Socket } from 'socket.io-client';

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingEmpresas, setSyncingEmpresas] = useState<Record<string, boolean>>({});
  const [syncingAll, setSyncingAll] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  const fetchEmpresas = useCallback(async () => {
    try {
      const res = await api.get('/empresas');
      setEmpresas(res.data);
    } catch (error) {
      console.error("Error loading companies", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Al cargar, resetear empresas atascadas en SYNCING (por Render durmiendo)
    api.post('/empresas/reset-stuck', {}).catch(() => {});

    fetchEmpresas();

    if (user?.id) {
      const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
      socket.on(`sync-finished-${user.id}`, (data) => {
        setSyncingEmpresas(prev => ({ ...prev, [data.empresaId]: false }));
        fetchEmpresas();
      });
      socket.on(`sync-error-${user.id}`, (data) => {
        setSyncingEmpresas(prev => ({ ...prev, [data.empresaId]: false }));
        alert(`Error sincronizando: ${data.message}`);
        fetchEmpresas();
      });
      return () => { socket.disconnect(); };
    }
  }, [isAuthenticated, user?.id, fetchEmpresas]);

  // 2. Polling cada 15s cuando hay empresas sincronizando (para capturar completions)
  useEffect(() => {
    const hasSyncing = empresas.some(e => e.estadoSincro === 'SYNCING');
    if (!hasSyncing) return;
    const interval = setInterval(() => fetchEmpresas(), 15000);
    return () => clearInterval(interval);
  }, [empresas, fetchEmpresas]);

  const handleSync = async (empresaId: string) => {
    try {
      setSyncingEmpresas(prev => ({ ...prev, [empresaId]: true }));
      await api.post(`/scraper/sync/${empresaId}`, {});
    } catch (error) {
      setSyncingEmpresas(prev => ({ ...prev, [empresaId]: false }));
      alert("No se pudo iniciar la sincronización");
    }
  };

  const handleSyncAll = async () => {
    if (empresas.length === 0) return;
    setSyncingAll(true);
    const newSyncingState = { ...syncingEmpresas };
    empresas.forEach(emp => { newSyncingState[emp.id] = true; });
    setSyncingEmpresas(newSyncingState);

    try {
      const res = await api.post('/scraper/sync-all', {});
      alert(`Se encolaron ${res.data.count} empresas para sincronización.`);
    } catch (error) {
      alert("Error al iniciar la sincronización masiva");
      setSyncingEmpresas({});
    } finally {
      setSyncingAll(false);
    }
  };

  const deleteEmpresa = async (id: string) => {
    await api.delete(`/empresas/${id}`);
    await fetchEmpresas();
  };

  const saveEmpresa = async (id: string | null, data: any) => {
    if (id) {
      await api.patch(`/empresas/${id}`, data);
    } else {
      await api.post('/empresas', data);
    }
    await fetchEmpresas();
  };

  return {
    empresas,
    loading,
    syncingEmpresas,
    syncingAll,
    handleSync,
    handleSyncAll,
    deleteEmpresa,
    saveEmpresa,
    user
  };
}
