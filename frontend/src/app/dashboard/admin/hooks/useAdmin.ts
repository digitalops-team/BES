import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export function useAdmin() {
  const { user } = useAuthStore();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [empresasAdmin, setEmpresasAdmin] = useState<any[]>([]);
  const [loadingAsig, setLoadingAsig] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data.filter((u: any) => u.id !== user?.id));
    } catch (error) {
      console.error("Error fetching users", error);
    }
  }, [user?.id]);

  const fetchEmpresasAdmin = useCallback(async () => {
    setLoadingAsig(true);
    try {
      const res = await api.get('/empresas');
      setEmpresasAdmin(res.data);
    } catch (error) {
      console.error("Error fetching companies", error);
    } finally {
      setLoadingAsig(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  useEffect(() => {
    fetchEmpresasAdmin();
  }, [fetchEmpresasAdmin]);

  const createUser = async (userData: any) => {
    await api.post('/usuarios', userData);
    await fetchUsuarios();
  };

  const deleteUser = async (id: string) => {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    await api.delete(`/usuarios/${id}`);
    await fetchUsuarios();
  };

  const updateUser = async (id: string, data: any) => {
    await api.patch(`/usuarios/${id}`, data);
    await fetchUsuarios();
  };

  const toggleUserForCompany = async (empresaId: string, userId: string, assigned: boolean) => {
    if (assigned) {
      await api.delete(`/asignaciones/${userId}/${empresaId}`);
    } else {
      await api.post('/asignaciones', { usuarioId: userId, empresaId });
    }
    await fetchEmpresasAdmin();
  };

  return {
    usuarios,
    selectedUserId,
    setSelectedUserId,
    empresasAdmin,
    fetchEmpresasAdmin,
    loadingAsig,
    createUser,
    deleteUser,
    updateUser,
    toggleUserForCompany,
  };
}
