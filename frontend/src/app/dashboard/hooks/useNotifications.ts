import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useSearchParams } from 'next/navigation';

export function useNotifications() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const searchParams = useSearchParams();
  const empresaFilterId = searchParams.get('empresa');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await api.get('/notificaciones');
      setNotificaciones(res.data);
    } catch (error) {
      console.error("Error loading notifications", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchNotificaciones();
  }, [isAuthenticated, fetchNotificaciones]);

  const clearInbox = async () => {
    await api.delete('/notificaciones');
    await fetchNotificaciones();
  };

  const filteredData = notificaciones.filter(notif => {
    if (empresaFilterId && notif.empresa.id !== empresaFilterId) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchRuc = notif.empresa.ruc.includes(term);
      const matchRazon = notif.empresa.razonSocial.toLowerCase().includes(term);
      const matchAsunto = notif.asunto.toLowerCase().includes(term);
      if (!matchRuc && !matchRazon && !matchAsunto) return false;
    }
    return true;
  });

  return {
    notificaciones,
    loading,
    clearInbox,
    filteredData,
    searchTerm,
    setSearchTerm,
    empresaFilterId,
    unreadCount: filteredData.filter(n => n.estado === 'NO_LEIDO').length
  };
}
