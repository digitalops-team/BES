"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, FileX, AlertTriangle, TrendingUp, ExternalLink, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';

interface Stats {
  totalEmpresas: number;
  totalNotificaciones: number;
  sinLeer: number;
  sinPdf: number;
  rankingEmpresas: {
    id: string;
    ruc: string;
    razonSocial: string;
    estadoConexion: string;
    totalNotificaciones: number;
    sinPdf: number;
  }[];
  sincroPorDia: { fecha: string; cantidad: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get('/estadisticas')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-400">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const maxDia = Math.max(...(stats?.sincroPorDia.map(d => d.cantidad) || [1]), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-indigo-400" />
          Panel de Control
        </h2>
        <p className="text-gray-400 text-sm mt-1">Resumen del estado actual del sistema SUNAT.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Empresas Activas"
          value={stats?.totalEmpresas ?? 0}
          icon={<Building2 className="w-6 h-6" />}
          color="indigo"
          subtitle="conectadas al sistema"
        />
        <KpiCard
          label="Total Notificaciones"
          value={stats?.totalNotificaciones ?? 0}
          icon={<Mail className="w-6 h-6" />}
          color="blue"
          subtitle="recibidas en total"
        />
        <KpiCard
          label="Sin Leer"
          value={stats?.sinLeer ?? 0}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="amber"
          subtitle="pendientes de revisión"
          onClick={() => router.push('/dashboard/bandeja')}
          clickable
        />
        <KpiCard
          label="PDFs No Encontrados"
          value={stats?.sinPdf ?? 0}
          icon={<FileX className="w-6 h-6" />}
          color="red"
          subtitle="errores en SUNAT"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Ranking de Empresas con Problemas */}
        <div className="xl:col-span-2 bg-[#111827] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Ranking de Empresas con Problemas
            </h3>
            <span className="text-xs text-gray-500">Ordenado por PDFs no encontrados</span>
          </div>

          <div className="divide-y divide-white/5">
            {(!stats?.rankingEmpresas || stats.rankingEmpresas.length === 0) ? (
              <div className="p-10 text-center text-gray-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-500/40" />
                <p>¡Sin problemas detectados! Todo en orden.</p>
              </div>
            ) : stats.rankingEmpresas.map((emp, idx) => (
              <div key={emp.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group">
                {/* Rank */}
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  idx === 1 ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                  idx === 2 ? 'bg-orange-900/30 text-orange-400 border border-orange-700/30' :
                  'bg-white/5 text-gray-500 border border-white/10'
                }`}>{idx + 1}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{emp.razonSocial}</p>
                  <p className="text-gray-500 text-xs font-mono">RUC: {emp.ruc}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {emp.sinPdf > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2.5 py-1 rounded-lg">
                      <FileX className="w-3.5 h-3.5" /> {emp.sinPdf} sin PDF
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{emp.totalNotificaciones} total</span>
                  <button
                    onClick={() => router.push(`/dashboard/bandeja?empresa=${emp.id}`)}
                    className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfica de Actividad (últimos 7 días) */}
        <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              Actividad Últimos 7 Días
            </h3>
            <p className="text-xs text-gray-500 mt-1">Notificaciones recibidas por día</p>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-end">
            <div className="flex items-end gap-2 h-40">
              {stats?.sincroPorDia.map((dia) => (
                <div key={dia.fecha} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    {dia.cantidad}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-500 hover:from-indigo-500 hover:to-indigo-300 cursor-default min-h-[4px]"
                    style={{ height: `${(dia.cantidad / maxDia) * 100}%` }}
                  />
                  <span className="text-[10px] text-gray-600 font-mono">
                    {new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color, subtitle, onClick, clickable }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'indigo' | 'blue' | 'amber' | 'red' | 'emerald';
  subtitle: string;
  onClick?: () => void;
  clickable?: boolean;
}) {
  const colors = {
    indigo: 'from-indigo-600/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    red: 'from-red-600/20 to-red-600/5 border-red-500/20 text-red-400',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${colors[color]} border rounded-3xl p-6 ${clickable ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${colors[color].split(' ').pop()}`}>
          {icon}
        </div>
        {clickable && <ExternalLink className="w-4 h-4 text-gray-500" />}
      </div>
      <p className="text-4xl font-black text-white mb-1">{value.toLocaleString()}</p>
      <p className="text-sm font-semibold text-white/80">{label}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
