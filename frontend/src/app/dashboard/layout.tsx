"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { Building2, Bell, LogOut, LayoutDashboard, Settings, Shield } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  if (!mounted || !token) return null;

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-[#111827] border-r border-white/5 flex flex-col">
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20">
            <Building2 className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">BES Panel</h1>
            <p className="text-xs text-blue-400 font-medium">{user?.rol || 'Administrador'}</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <Link href="/dashboard" className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-colors ${pathname === '/dashboard' ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <LayoutDashboard className="w-5 h-5" />
            Bandeja de Entrada
          </Link>
          <Link href="/dashboard/empresas" className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-colors ${pathname === '/dashboard/empresas' ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <Building2 className="w-5 h-5" />
            Mis Empresas
          </Link>
          {user?.rol === 'SUPER_ADMIN' && (
            <Link href="/dashboard/admin" className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-colors ${pathname === '/dashboard/admin' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Shield className="w-5 h-5" />
              Administración
            </Link>
          )}
          <Link href="#" className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-colors ${pathname === '/dashboard/configuracion' ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <Settings className="w-5 h-5" />
            Configuración
          </Link>
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 border border-white/10 flex items-center justify-center text-white font-bold">
              {user?.nombre?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-[#111827]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-white">Dashboard General</h2>
          <button className="relative p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-[#111827] rounded-full"></span>
          </button>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
