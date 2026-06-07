import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Thermometer, Clock, Zap } from 'lucide-react';
import { isZoneCritical } from '@/lib/alertEngine';

interface Zone {
  id: string;
  name: string;
  isActive: boolean;
  lastRun: string;
  moisture: number;
  temperature: number;
  status: 'ok' | 'warn' | 'alert';
}

interface ZoneMapProps {
  zones: Zone[];
  onZoneToggle: (zoneId: string) => void;
  selectedZone?: string | null;
}

const STATUS = {
  ok: {
    gradient: 'from-emerald-500/[0.08] to-teal-500/[0.04]',
    border: 'border-emerald-400/30',
    ring: 'ring-emerald-400',
    dot: 'bg-emerald-400 shadow-emerald-400/50',
    label: 'text-emerald-600 bg-emerald-50',
    bar: 'bg-emerald-400',
    glow: 'shadow-emerald-500/15',
  },
  warn: {
    gradient: 'from-amber-500/[0.08] to-orange-500/[0.04]',
    border: 'border-amber-400/30',
    ring: 'ring-amber-400',
    dot: 'bg-amber-400 shadow-amber-400/50',
    label: 'text-amber-600 bg-amber-50',
    bar: 'bg-amber-400',
    glow: 'shadow-amber-500/15',
  },
  alert: {
    gradient: 'from-red-500/[0.10] to-rose-500/[0.04]',
    border: 'border-red-400/40',
    ring: 'ring-red-400',
    dot: 'bg-red-400 shadow-red-400/50',
    label: 'text-red-600 bg-red-50',
    bar: 'bg-red-400',
    glow: 'shadow-red-500/20',
  },
} as const;

function MiniBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  return (
    <div className="flex-1 h-1 bg-slate-200/70 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function ZoneMap({ zones, onZoneToggle, selectedZone }: ZoneMapProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-2">
      {zones.map((zone) => {
        const s = STATUS[zone.status];
        const isCritical = isZoneCritical(zone.moisture, zone.temperature);
        const isSelected = selectedZone === zone.id;

        return (
          <motion.button
            key={zone.id}
            onClick={() => onZoneToggle(zone.id)}
            onHoverStart={() => setHoveredZone(zone.id)}
            onHoverEnd={() => setHoveredZone(null)}
            whileHover={{ scale: 1.025, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`
              relative text-left rounded-xl border p-3 overflow-hidden
              bg-gradient-to-br ${s.gradient} ${s.border}
              transition-shadow duration-200 cursor-pointer
              ${isSelected ? `ring-2 ring-offset-1 ring-offset-background ${s.ring} shadow-lg ${s.glow}` : 'shadow-sm'}
            `}
          >
            {/* Critical pulse overlay */}
            {isCritical && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-red-400"
                animate={{ opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}

            {/* Header row */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-slate-800 leading-none">{zone.id}</span>
                {isCritical && (
                  <Zap className="w-3 h-3 text-red-500" />
                )}
              </div>

              {/* Active/Inactive pill */}
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase ${s.label}`}>
                <motion.span
                  className={`w-1.5 h-1.5 rounded-full shadow-sm ${s.dot}`}
                  animate={zone.isActive ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                  transition={{ duration: 1.8, repeat: zone.isActive ? Infinity : 0 }}
                />
                {zone.isActive ? 'Active' : 'Off'}
              </div>
            </div>

            {/* Zone name */}
            <p className="text-[11px] font-semibold text-slate-500 mb-2.5 truncate">{zone.name}</p>

            {/* Metrics */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3 h-3 text-blue-500 shrink-0" />
                <MiniBar value={zone.moisture} max={100} colorClass="bg-blue-400" />
                <span className="text-[10px] font-bold text-blue-600 tabular-nums w-7 text-right">
                  {zone.moisture.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3 h-3 text-orange-500 shrink-0" />
                <MiniBar value={zone.temperature} max={50} colorClass="bg-orange-400" />
                <span className="text-[10px] font-bold text-orange-600 tabular-nums w-7 text-right">
                  {zone.temperature.toFixed(0)}°
                </span>
              </div>
            </div>

            {/* Last run */}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200/60">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              <span className="text-[9px] text-slate-400 truncate">{zone.lastRun}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
