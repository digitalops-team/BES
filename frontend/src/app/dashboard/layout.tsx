"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import api from '@/lib/api';
import { Building2, Bell, LogOut, Settings, Shield, ShieldCheck, Archive, Mail, TrendingUp, Menu, X } from 'lucide-react';
import { getSocket } from '@/lib/socket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { sinLeer, fetchStats } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleNotifications = async () => {
    if (!showNotifications) {
      setNotifLoading(true);
      try {
        const res = await api.get('/notificaciones');
        setRecentNotifications(res.data.slice(0, 5));
      } catch (error) {
        console.error("Error fetching recent notifications", error);
      } finally {
        setNotifLoading(false);
      }
    }
    setShowNotifications(!showNotifications);
  };

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    // Cargar estadísticas iniciales
    fetchStats();

    // Reutilizar la conexión del WebSocket compartido
    const socket = getSocket();

    const handleSyncFinished = (data: any) => {
      console.log(`[WS] Sincronización completada para empresa: ${data.empresaId}`);
      fetchStats(); // Refrescar estadísticas en tiempo real
    };

    const handleSyncError = (data: any) => {
      console.log(`[WS] Error de sincronización: ${data.message}`);
      fetchStats(); // Refrescar estadísticas igualmente
    };

    socket.on(`sync-finished-${user.id}`, handleSyncFinished);
    socket.on(`sync-error-${user.id}`, handleSyncError);

    return () => {
      socket.off(`sync-finished-${user.id}`, handleSyncFinished);
      socket.off(`sync-error-${user.id}`, handleSyncError);
    };
  }, [isAuthenticated, user, router, fetchStats]);

  // Cerrar menú móvil cuando cambie la ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (!mounted || !isAuthenticated) return null;

  const navItems = [
    {
      href: '/dashboard',
      label: 'Panel de Control',
      icon: <TrendingUp className="w-5 h-5" />,
      exact: true,
    },
    {
      href: '/dashboard/bandeja',
      label: 'Bandeja de Entrada',
      icon: <Mail className="w-5 h-5" />,
    },
    {
      href: '/dashboard/archivo',
      label: 'Archivo',
      icon: <Archive className="w-5 h-5" />,
    },
    {
      href: '/dashboard/empresas',
      label: 'Mis Empresas',
      icon: <Building2 className="w-5 h-5" />,
    },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex flex-col md:flex-row relative">
      {/* Backdrop para móvil */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Drawer en móvil, estático en desktop) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#111827] border-r border-white/5 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">BES Panel</h1>
              <p className="text-xs text-blue-400 font-medium">{user?.rol || 'Administrador'}</p>
            </div>
          </div>
          {/* Botón cerrar para móvil */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 md:p-6 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
                isActive(item.href, item.exact)
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          {/* Separador */}
          <div className="pt-3 pb-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-4">Sistema</p>
          </div>

          {(user?.rol === 'SUPER_ADMIN' || user?.rol === 'ADMIN') && (
            <>
              <Link
                href="/dashboard/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
                  pathname === '/dashboard/admin'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Shield className="w-5 h-5" />
                Administración
              </Link>

              <Link
                href="/dashboard/admin/auditoria"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
                  isActive('/dashboard/admin/auditoria')
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                Auditoría
              </Link>
            </>
          )}

          <Link
            href="/dashboard/configuracion"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
              isActive('/dashboard/configuracion')
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-5 h-5" />
            Configuración
          </Link>
        </nav>

        <div className="p-4 md:p-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 border border-white/10 flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.nombre?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout().then(() => router.push('/login')); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-16 md:h-20 bg-[#111827]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Botón menú hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <p className="text-xs md:text-sm text-gray-400 capitalize">
              {new Date().toLocaleDateString('es-PE', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="relative p-2 md:p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {sinLeer > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-[#111827] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-0.5">
                  {sinLeer > 99 ? '99+' : sinLeer}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-[#111827]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                  <h4 className="font-bold text-white text-sm">Notificaciones Recientes</h4>
                  {sinLeer > 0 && (
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                      {sinLeer} nuevas
                    </span>
                  )}
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {notifLoading ? (
                    <p className="text-xs text-gray-500 text-center py-4">Cargando...</p>
                  ) : recentNotifications.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No hay notificaciones sin leer.</p>
                  ) : (
                    recentNotifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setShowNotifications(false);
                          router.push(`/dashboard/bandeja?empresa=${n.empresa.id}`);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/[0.02] cursor-pointer transition-colors border border-transparent hover:border-white/5"
                      >
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <span className="text-[11px] font-bold text-gray-300 truncate max-w-[150px]">{n.empresa.razonSocial}</span>
                          <span className="text-[9px] text-gray-500 flex-shrink-0">
                            {new Date(n.fechaMensaje).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{n.asunto}</p>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="pt-3 border-t border-white/5 mt-3 flex justify-between">
                  <Link
                    href="/dashboard/bandeja"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                  >
                    Ver bandeja completa
                  </Link>
                  <Link
                    href="/dashboard/archivo"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-gray-400 hover:text-gray-300 transition-colors font-medium"
                  >
                    Ver archivo
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

