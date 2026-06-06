import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Droplet, AlertCircle, CheckCircle, Clock } from 'lucide-react';
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

export default function ZoneMap({ zones, onZoneToggle, selectedZone }: ZoneMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  // Zone layout configuration (relative positions on a 2x2 grid)
  const zonePositions: Record<string, { x: number; y: number; width: number; height: number }> = {
    A: { x: 0.05, y: 0.05, width: 0.45, height: 0.45 },
    B: { x: 0.5, y: 0.05, width: 0.45, height: 0.45 },
    C: { x: 0.05, y: 0.5, width: 0.45, height: 0.45 },
    D: { x: 0.5, y: 0.5, width: 0.45, height: 0.45 },
  };

  // Draw the farm map with zones
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw each zone
    zones.forEach(zone => {
      const pos = zonePositions[zone.id];
      const x = pos.x * width;
      const y = pos.y * height;
      const w = pos.width * width;
      const h = pos.height * height;

      // Determine zone color based on status
      let fillColor = '#10C45D'; // ok
      if (zone.status === 'warn') fillColor = '#EF9F27';
      if (zone.status === 'alert') fillColor = '#E24B4A';

      // Add opacity if zone is inactive
      const opacity = zone.isActive ? 0.15 : 0.08;
      ctx.fillStyle = fillColor + Math.round(opacity * 255).toString(16).padStart(2, '0');
      ctx.fillRect(x, y, w, h);

      // Draw border with pulsing effect for critical zones
      const isCritical = isZoneCritical(zone.moisture, zone.temperature);
      if (isCritical) {
        // Pulsing effect for critical zones
        const pulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3 + pulse * 2;
      } else {
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = hoveredZone === zone.id || selectedZone === zone.id ? 3 : 2;
      }
      ctx.strokeRect(x, y, w, h);

      // Draw zone label
      ctx.fillStyle = '#063A1A';
      ctx.font = 'bold 24px Geist';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.id, x + w / 2, y + h / 2 - 20);

      // Draw status indicator
      const statusText = zone.isActive ? '● Active' : '○ Inactive';
      ctx.fillStyle = zone.isActive ? '#10C45D' : '#999999';
      ctx.font = '12px Geist';
      ctx.fillText(statusText, x + w / 2, y + h / 2 + 10);

      // Draw moisture level
      ctx.fillStyle = '#378ADD';
      ctx.font = '11px Geist';
      ctx.fillText(`💧 ${zone.moisture}%`, x + w / 2, y + h / 2 + 25);

      // Draw temperature
      ctx.fillStyle = '#D85A30';
      ctx.fillText(`🌡️ ${zone.temperature}°C`, x + w / 2, y + h / 2 + 40);
    });
  }, [zones, hoveredZone, selectedZone]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 border-green-200';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200';
      case 'alert':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Canvas */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Droplet className="w-4 h-4" />
            Farm Zone Map
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Click zones to control irrigation</p>
        </div>
        <div className="p-4 bg-white">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full border border-border rounded cursor-pointer hover:shadow-md transition-shadow"
            onClick={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;

              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;

              // Check which zone was clicked
              Object.entries(zonePositions).forEach(([zoneId, pos]) => {
                if (
                  x >= pos.x &&
                  x <= pos.x + pos.width &&
                  y >= pos.y &&
                  y <= pos.y + pos.height
                ) {
                  onZoneToggle(zoneId);
                }
              });
            }}
            onMouseMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;

              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;

              let hovered: string | null = null;
              Object.entries(zonePositions).forEach(([zoneId, pos]) => {
                if (
                  x >= pos.x &&
                  x <= pos.x + pos.width &&
                  y >= pos.y &&
                  y <= pos.y + pos.height
                ) {
                  hovered = zoneId;
                }
              });

              setHoveredZone(hovered);
            }}
            onMouseLeave={() => setHoveredZone(null)}
          />
        </div>
      </div>

      {/* Zone Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {zones.map((zone) => (
          <motion.button
            key={zone.id}
            onClick={() => onZoneToggle(zone.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`text-left p-3 rounded-lg border transition-all ${getStatusColor(
              zone.status
            )} ${selectedZone === zone.id ? 'ring-2 ring-accent' : ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-foreground">{zone.name}</span>
                {getStatusIcon(zone.status)}
              </div>
              <motion.div
                className={`w-3 h-3 rounded-full ${zone.isActive ? 'bg-accent' : 'bg-muted'}`}
                animate={{ scale: zone.isActive ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 2, repeat: zone.isActive ? Infinity : 0 }}
              />
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Droplet className="w-3 h-3" />
                <span>Moisture: <span className="font-medium text-foreground">{zone.moisture.toFixed(0)}%</span></span>
              </div>
              <div className="flex items-center gap-1">
                <span>🌡️ Temp: <span className="font-medium text-foreground">{zone.temperature.toFixed(1)}°C</span></span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Last run: {zone.lastRun}</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-card border border-border rounded-lg p-3">
        <p className="text-xs font-semibold text-foreground mb-2">Status Legend</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-muted-foreground">Optimal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-muted-foreground">Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-muted-foreground">Alert</span>
          </div>
        </div>
      </div>
    </div>
  );
}
