"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, FileX, AlertTriangle, TrendingUp, ExternalLink, RefreshCw, CheckCircle, Flame, ShieldAlert, FileText } from 'lucide-react';
import api from '@/lib/api';

interface Stats {
  totalEmpresas: number;
  totalNotificaciones: number;
  sinLeer: number;
  sinPdf: number;
  totalPeligrosas?: number;
  totalNormales?: number;
  rankingEmpresas: {
    id: string;
    ruc: string;
    razonSocial: string;
    estadoConexion: string;
    totalNotificaciones: number;
    sinPdf: number;
  }[];
  sincroPorDia: { fecha: string; cantidad: number; peligrosas?: number; normales?: number }[];
  historicoMensual?: { mesKey: string; mesNombre: string; cantidad: number; peligrosas: number; normales: number }[];
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
        <p className="text-gray-400 text-sm mt-1">Resumen del estado actual del sistema y clasificación de alertas SUNAT.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Empresas Activas"
          value={stats?.totalEmpresas ?? 0}
          icon={<Building2 className="w-6 h-6" />}
          color="indigo"
          subtitle="conectadas al sistema"
        />
        <KpiCard
          label="Total Documentos"
          value={stats?.totalNotificaciones ?? 0}
          icon={<Mail className="w-6 h-6" />}
          color="blue"
          subtitle="recibidos en total"
        />
        <KpiCard
          label="Alertas Peligrosas"
          value={stats?.totalPeligrosas ?? 0}
          icon={<ShieldAlert className="w-6 h-6" />}
          color="rose"
          subtitle="coactivas / embargos / pagos"
          onClick={() => router.push('/dashboard/bandeja')}
          clickable
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        
        {/* Ranking de Empresas con Problemas */}
        <div className="xl:col-span-2 bg-[#111827] rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              Ranking de Empresas con Problemas
            </h3>
            <span className="text-[10px] md:text-xs text-gray-500">Ordenado por PDFs no encontrados</span>
          </div>

          <div className="divide-y divide-white/5">
            {(!stats?.rankingEmpresas || stats.rankingEmpresas.length === 0) ? (
              <div className="p-8 md:p-10 text-center text-gray-500 text-sm">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-3 text-emerald-500/40" />
                <p>¡Sin problemas detectados! Todo en orden.</p>
              </div>
            ) : stats.rankingEmpresas.map((emp, idx) => (
              <div key={emp.id} className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3.5 hover:bg-white/[0.02] transition-colors group">
                {/* Rank */}
                <span className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  idx === 1 ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                  idx === 2 ? 'bg-orange-900/30 text-orange-400 border border-orange-700/30' :
                  'bg-white/5 text-gray-500 border border-white/10'
                }`}>{idx + 1}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-xs md:text-sm truncate">{emp.razonSocial}</p>
                  <p className="text-gray-500 text-[11px] font-mono">RUC: {emp.ruc}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                  {emp.sinPdf > 0 && (
                    <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg">
                      <FileX className="w-3 h-3 md:w-3.5 md:h-3.5" /> {emp.sinPdf} <span className="hidden sm:inline">sin PDF</span>
                    </span>
                  )}
                  <span className="text-[10px] md:text-xs text-gray-500 hidden sm:inline">{emp.totalNotificaciones} total</span>
                  <button
                    onClick={() => router.push(`/dashboard/bandeja?empresa=${emp.id}`)}
                    className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfica de Actividad & Evolución (Alertas Peligrosas vs Normales) */}
        <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                Evolución de Alertas (7 Días)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">Comparación diaria entre alertas peligrosas e informativas</p>
            
            {/* Leyenda */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-rose-500" />
                <span className="text-rose-400 font-semibold">Peligrosas / Críticas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-500" />
                <span className="text-indigo-400 font-semibold">Normales</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-end gap-3 h-48 pt-4">
              {stats?.sincroPorDia.map((dia) => {
                const peligrosas = dia.peligrosas ?? 0;
                const normales = dia.normales ?? (dia.cantidad - peligrosas);
                const total = dia.cantidad;
                const heightPct = maxDia > 0 ? (total / maxDia) * 100 : 0;
                
                const peligrosasPct = total > 0 ? (peligrosas / total) * 100 : 0;
                const normalesPct = total > 0 ? (normales / total) * 100 : 0;

                const dayName = new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short' });

                return (
                  <div key={dia.fecha} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    
                    {/* Tooltip Hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-white/10 rounded-xl p-2 text-[10px] pointer-events-none z-20 whitespace-nowrap shadow-xl">
                      <p className="font-bold text-white mb-0.5">{dia.fecha}</p>
                      <p className="text-rose-400 font-bold">⚠️ Peligrosas: {peligrosas}</p>
                      <p className="text-indigo-400 font-bold">ℹ️ Normales: {normales}</p>
                      <p className="text-gray-400 pt-0.5 border-t border-white/10">Total: {total}</p>
                    </div>

                    {/* Total label */}
                    <span className="text-[11px] font-bold text-gray-300">
                      {total > 0 ? total : ''}
                    </span>

                    {/* Bar container */}
                    <div
                      className="w-full max-w-[28px] rounded-t-lg bg-gray-800/50 flex flex-col justify-end overflow-hidden transition-all duration-300 min-h-[8px]"
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                    >
                      {total > 0 ? (
                        <>
                          {peligrosas > 0 && (
                            <div
                              className="w-full bg-gradient-to-t from-rose-600 to-rose-400 transition-all"
                              style={{ height: `${peligrosasPct}%` }}
                              title={`Peligrosas: ${peligrosas}`}
                            />
                          )}
                          {normales > 0 && (
                            <div
                              className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all"
                              style={{ height: `${normalesPct}%` }}
                              title={`Normales: ${normales}`}
                            />
                          )}
                        </>
                      ) : (
                        <div className="w-full h-2 bg-gray-800 rounded-t-md" />
                      )}
                    </div>

                    {/* Day label */}
                    <span className="text-[10px] text-gray-500 font-mono capitalize">
                      {dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico General de Alertas (Vista Mensual Completa) */}
      <HistoricoLineChart data={stats?.historicoMensual || []} />
    </div>
  );
}

function HistoricoLineChart({ data }: { data: { mesKey: string; mesNombre: string; cantidad: number; peligrosas: number; normales: number }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#111827] rounded-3xl border border-white/5 p-6 text-center text-gray-500">
        <p className="text-sm">No hay datos suficientes para el histórico acumulado.</p>
      </div>
    );
  }

  const width = 900;
  const height = 240;
  const px = 50;
  const py = 40;

  const maxVal = Math.max(...data.map(d => Math.max(d.cantidad, d.peligrosas, d.normales, 1)), 1);

  const pointsPeligrosas: { x: number; y: number; val: number }[] = [];
  const pointsNormales: { x: number; y: number; val: number }[] = [];
  const pointsTotal: { x: number; y: number; val: number }[] = [];

  const count = data.length;
  const stepX = count > 1 ? (width - 2 * px) / (count - 1) : 0;

  data.forEach((d, i) => {
    const x = count > 1 ? px + i * stepX : width / 2;
    const yP = height - py - (d.peligrosas / maxVal) * (height - 2 * py);
    const yN = height - py - (d.normales / maxVal) * (height - 2 * py);
    const yT = height - py - (d.cantidad / maxVal) * (height - 2 * py);

    pointsPeligrosas.push({ x, y: yP, val: d.peligrosas });
    pointsNormales.push({ x, y: yN, val: d.normales });
    pointsTotal.push({ x, y: yT, val: d.cantidad });
  });

  const pathPeligrosas = pointsPeligrosas.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const pathNormales = pointsNormales.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const pathTotal = pointsTotal.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  // Fill area under Total line
  const areaTotal = count > 1
    ? `${pathTotal} L ${pointsTotal[count - 1].x} ${height - py} L ${pointsTotal[0].x} ${height - py} Z`
    : '';

  return (
    <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            Histórico General de Alertas (Vista Mensual)
          </h3>
          <p className="text-xs text-gray-500 mt-1">Evolución histórica y volumen de notificaciones acumuladas por mes</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-rose-400 font-semibold">Peligrosas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-indigo-400 font-semibold">Normales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-cyan-300 font-semibold">Total Mensual</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px] overflow-visible">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowRose" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.5" />
            </filter>
            <filter id="glowIndigo" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = height - py - ratio * (height - 2 * py);
            return (
              <g key={idx}>
                <line x1={px} y1={y} x2={width - px} y2={y} stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="4 4" />
                <text x={px - 8} y={y + 4} fill="#6b7280" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {Math.round(ratio * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaTotal && <path d={areaTotal} fill="url(#areaGradient)" />}

          {/* Lines */}
          <path d={pathTotal} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.7" />
          <path d={pathNormales} fill="none" stroke="#6366f1" strokeWidth="3" filter="url(#glowIndigo)" />
          <path d={pathPeligrosas} fill="none" stroke="#f43f5e" strokeWidth="3" filter="url(#glowRose)" />

          {/* Interactive Data Nodes */}
          {data.map((d, i) => {
            const pP = pointsPeligrosas[i];
            const pN = pointsNormales[i];
            const pT = pointsTotal[i];
            const isHovered = hoveredIdx === i;

            return (
              <g key={d.mesKey} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                {/* X Axis Label */}
                <text x={pT.x} y={height - 12} fill={isHovered ? '#ffffff' : '#9ca3af'} fontSize="11" fontWeight={isHovered ? 'bold' : 'normal'} textAnchor="middle">
                  {d.mesNombre}
                </text>

                {/* Vertical guide line on hover */}
                {isHovered && (
                  <line x1={pT.x} y1={py} x2={pT.x} y2={height - py} stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="2 2" />
                )}

                {/* Nodes */}
                <circle cx={pN.x} cy={pN.y} r={isHovered ? "6" : "4"} fill="#6366f1" stroke="#111827" strokeWidth="2" />
                <circle cx={pP.x} cy={pP.y} r={isHovered ? "6" : "4"} fill="#f43f5e" stroke="#111827" strokeWidth="2" />
                <circle cx={pT.x} cy={pT.y} r={isHovered ? "5" : "3"} fill="#22d3ee" stroke="#111827" strokeWidth="1.5" />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip display */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="absolute top-2 right-4 bg-black/90 border border-white/10 rounded-2xl p-3.5 text-xs text-white shadow-2xl backdrop-blur-md min-w-[180px] pointer-events-none">
            <p className="font-bold text-white mb-1.5 text-sm border-b border-white/10 pb-1">{data[hoveredIdx].mesNombre}</p>
            <div className="space-y-1">
              <p className="text-rose-400 font-semibold flex items-center justify-between gap-3">
                <span>⚠️ Peligrosas:</span> <strong>{data[hoveredIdx].peligrosas}</strong>
              </p>
              <p className="text-indigo-400 font-semibold flex items-center justify-between gap-3">
                <span>ℹ️ Normales:</span> <strong>{data[hoveredIdx].normales}</strong>
              </p>
              <p className="text-cyan-300 font-bold flex items-center justify-between gap-3 pt-1 border-t border-white/10">
                <span>📊 Total Mensual:</span> <strong>{data[hoveredIdx].cantidad}</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color, subtitle, onClick, clickable }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'indigo' | 'blue' | 'amber' | 'red' | 'emerald' | 'rose';
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
    rose: 'from-rose-600/20 to-rose-600/5 border-rose-500/20 text-rose-400',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${colors[color]} border rounded-3xl p-5 ${clickable ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center ${colors[color].split(' ').pop()}`}>
          {icon}
        </div>
        {clickable && <ExternalLink className="w-3.5 h-3.5 text-gray-500" />}
      </div>
      <p className="text-3xl font-black text-white mb-0.5">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold text-white/80">{label}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  );
}
