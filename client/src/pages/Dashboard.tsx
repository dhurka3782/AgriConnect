import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Droplet, Leaf, TrendingUp, Wind, Sun, Thermometer, Activity, Play, Pause, RotateCcw, Bell, Zap } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler } from 'chart.js';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import ZoneMap from '../components/ZoneMap';
import HistoricalPlayback from '../components/HistoricalPlayback';
import RecommendedActions from '../components/RecommendedActions';
import SevenDayPlayback from '../components/SevenDayPlayback';
import { generateAllZonesHistoricalData, getMoistureAtHour } from '@/lib/historicalData';

ChartJS.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);


interface Crop {
  name: string;
  emoji: string;
  metrics: Metric[];
  stage: string;
  stageProgress: number;
  alerts: Alert[];
  recommendations: string[];
  waterSaved: string;
  yieldForecast: string;
  nextIrrigation: string;
  nextZone: string;
  tempData: number[];
  moistureData: number[];
}

interface Metric {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  status: 'ok' | 'warn' | 'alert';
  percentage: number;
  color: string;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  time: string;
  dismissed?: boolean;
}

interface IrrigationZone {
  id: string;
  name: string;
  isActive: boolean;
  lastRun: string;
}

interface ZoneWithData extends IrrigationZone {
  moisture: number;
  temperature: number;
  status: 'ok' | 'warn' | 'alert';
}

const CROPS: Record<string, Crop> = {
  Tomato: {
    name: 'Tomato',
    emoji: '🍅',
    metrics: [
      { label: 'Air Temp', value: '28.4', unit: '°C', icon: <Thermometer className="w-5 h-5" />, status: 'ok', percentage: 72, color: '#D85A30' },
      { label: 'Soil Moisture', value: '64', unit: '%', icon: <Droplet className="w-5 h-5" />, status: 'ok', percentage: 64, color: '#378ADD' },
      { label: 'Light Intensity', value: '820', unit: 'lux', icon: <Sun className="w-5 h-5" />, status: 'ok', percentage: 82, color: '#EF9F27' },
      { label: 'Humidity', value: '71', unit: '%', icon: <Wind className="w-5 h-5" />, status: 'warn', percentage: 71, color: '#1D9E75' },
    ],
    stage: 'Week 6 · Flowering',
    stageProgress: 60,
    alerts: [
      { id: '1', severity: 'critical', message: 'Soil moisture in Zone C below threshold (48%)', time: '12m ago' },
      { id: '2', severity: 'warning', message: 'High humidity — fungal risk elevated', time: '1h ago' },
      { id: '3', severity: 'info', message: 'Irrigation Zone A completed — 18 min cycle', time: '3h ago' },
    ],
    recommendations: ['💧 Increase irrigation in Zone C', '🌬️ Improve ventilation — humidity at 71%', '🟢 Flowering stage on schedule'],
    waterSaved: '142 L',
    yieldForecast: '4.2 t/acre',
    nextIrrigation: '2h 14m',
    nextZone: 'Zone B · 18 min cycle',
    tempData: [26, 26.5, 27, 27.8, 28.1, 28.4, 28.6, 28.4, 28.2, 28.4, 28.3, 28.4],
    moistureData: [68, 67, 65, 63, 62, 64, 65, 64, 63, 64, 64, 64],
  },
  Cucumber: {
    name: 'Cucumber',
    emoji: '🥒',
    metrics: [
      { label: 'Air Temp', value: '24.1', unit: '°C', icon: <Thermometer className="w-5 h-5" />, status: 'ok', percentage: 55, color: '#D85A30' },
      { label: 'Soil Moisture', value: '72', unit: '%', icon: <Droplet className="w-5 h-5" />, status: 'ok', percentage: 72, color: '#378ADD' },
      { label: 'Light Intensity', value: '680', unit: 'lux', icon: <Sun className="w-5 h-5" />, status: 'ok', percentage: 68, color: '#EF9F27' },
      { label: 'Humidity', value: '80', unit: '%', icon: <Wind className="w-5 h-5" />, status: 'alert', percentage: 80, color: '#1D9E75' },
    ],
    stage: 'Week 4 · Vegetative',
    stageProgress: 35,
    alerts: [
      { id: '1', severity: 'warning', message: 'Humidity above optimal range (80%)', time: '5m ago' },
      { id: '2', severity: 'info', message: 'Zone D irrigation scheduled for 3h', time: '1h ago' },
    ],
    recommendations: ['🌬️ Increase air circulation', '💧 Maintain 70-75% soil moisture', '🟢 Vegetative stage progressing well'],
    waterSaved: '98 L',
    yieldForecast: '3.8 t/acre',
    nextIrrigation: '3h 45m',
    nextZone: 'Zone D · 22 min cycle',
    tempData: [22, 22.5, 23, 23.8, 24, 24.1, 24.2, 24, 23.8, 24, 24.1, 24],
    moistureData: [70, 69, 70, 71, 72, 72, 71, 72, 72, 72, 72, 72],
  },
  Chilli: {
    name: 'Chilli',
    emoji: '🌶️',
    metrics: [
      { label: 'Air Temp', value: '31.2', unit: '°C', icon: <Thermometer className="w-5 h-5" />, status: 'ok', percentage: 85, color: '#D85A30' },
      { label: 'Soil Moisture', value: '58', unit: '%', icon: <Droplet className="w-5 h-5" />, status: 'ok', percentage: 58, color: '#378ADD' },
      { label: 'Light Intensity', value: '950', unit: 'lux', icon: <Sun className="w-5 h-5" />, status: 'ok', percentage: 95, color: '#EF9F27' },
      { label: 'Humidity', value: '55', unit: '%', icon: <Wind className="w-5 h-5" />, status: 'ok', percentage: 55, color: '#1D9E75' },
    ],
    stage: 'Week 8 · Fruiting',
    stageProgress: 75,
    alerts: [
      { id: '1', severity: 'info', message: 'Optimal conditions for fruit development', time: 'now' },
    ],
    recommendations: ['🌡️ Maintain 28-32°C for optimal fruiting', '💧 Increase irrigation frequency', '🟢 Excellent fruiting conditions'],
    waterSaved: '156 L',
    yieldForecast: '2.1 t/acre',
    nextIrrigation: '1h 30m',
    nextZone: 'Zone A · 20 min cycle',
    tempData: [28, 28.5, 29, 30, 31, 31.2, 31.5, 31.2, 31, 31.2, 31.1, 31.2],
    moistureData: [55, 54, 55, 56, 57, 58, 59, 58, 57, 58, 58, 58],
  },
  Grape: {
    name: 'Grape',
    emoji: '🍇',
    metrics: [
      { label: 'Air Temp', value: '22.8', unit: '°C', icon: <Thermometer className="w-5 h-5" />, status: 'ok', percentage: 52, color: '#D85A30' },
      { label: 'Soil Moisture', value: '52', unit: '%', icon: <Droplet className="w-5 h-5" />, status: 'warn', percentage: 52, color: '#378ADD' },
      { label: 'Light Intensity', value: '780', unit: 'lux', icon: <Sun className="w-5 h-5" />, status: 'ok', percentage: 78, color: '#EF9F27' },
      { label: 'Humidity', value: '62', unit: '%', icon: <Wind className="w-5 h-5" />, status: 'ok', percentage: 62, color: '#1D9E75' },
    ],
    stage: 'Week 5 · Veraison',
    stageProgress: 50,
    alerts: [
      { id: '1', severity: 'warning', message: 'Soil moisture approaching minimum threshold', time: '8m ago' },
    ],
    recommendations: ['💧 Reduce irrigation — grapes prefer drier conditions', '🌡️ Maintain cool nights for color development', '🟢 Veraison stage on schedule'],
    waterSaved: '78 L',
    yieldForecast: '1.9 t/acre',
    nextIrrigation: '4h 20m',
    nextZone: 'Zone C · 15 min cycle',
    tempData: [20, 20.5, 21, 22, 22.5, 22.8, 23, 22.8, 22.5, 22.8, 22.7, 22.8],
    moistureData: [48, 48, 49, 50, 51, 52, 52, 52, 51, 52, 52, 52],
  },
  Mushroom: {
    name: 'Mushroom',
    emoji: '🍄',
    metrics: [
      { label: 'Air Temp', value: '18.5', unit: '°C', icon: <Thermometer className="w-5 h-5" />, status: 'ok', percentage: 38, color: '#D85A30' },
      { label: 'Soil Moisture', value: '82', unit: '%', icon: <Droplet className="w-5 h-5" />, status: 'ok', percentage: 82, color: '#378ADD' },
      { label: 'Light Intensity', value: '120', unit: 'lux', icon: <Sun className="w-5 h-5" />, status: 'ok', percentage: 12, color: '#EF9F27' },
      { label: 'Humidity', value: '88', unit: '%', icon: <Wind className="w-5 h-5" />, status: 'ok', percentage: 88, color: '#1D9E75' },
    ],
    stage: 'Week 2 · Fruiting',
    stageProgress: 20,
    alerts: [
      { id: '1', severity: 'info', message: 'Perfect conditions for fruiting bodies', time: '2m ago' },
    ],
    recommendations: ['🌡️ Maintain 15-20°C for optimal fruiting', '💨 Ensure high humidity (85-90%)', '🟢 Fruiting conditions ideal'],
    waterSaved: '210 L',
    yieldForecast: '8.5 kg/m²',
    nextIrrigation: '30m',
    nextZone: 'Zone B · 25 min cycle',
    tempData: [17, 17.5, 18, 18.2, 18.4, 18.5, 18.6, 18.5, 18.4, 18.5, 18.5, 18.5],
    moistureData: [80, 80, 81, 81, 82, 82, 82, 82, 82, 82, 82, 82],
  },
};

const IRRIGATION_ZONES: IrrigationZone[] = [
  { id: 'A', name: 'Zone A', isActive: true, lastRun: '2h 14m ago' },
  { id: 'B', name: 'Zone B', isActive: false, lastRun: '4h 32m ago' },
  { id: 'C', name: 'Zone C', isActive: false, lastRun: '6h 18m ago' },
  { id: 'D', name: 'Zone D', isActive: true, lastRun: '1h 45m ago' },
];

const IRRIGATION_ZONES_DATA: Record<string, ZoneWithData> = {
  A: { ...IRRIGATION_ZONES[0], moisture: 72, temperature: 28.5, status: 'ok' },
  B: { ...IRRIGATION_ZONES[1], moisture: 58, temperature: 26.2, status: 'warn' },
  C: { ...IRRIGATION_ZONES[2], moisture: 48, temperature: 29.1, status: 'alert' },
  D: { ...IRRIGATION_ZONES[3], moisture: 65, temperature: 27.8, status: 'ok' },
};

export default function Dashboard() {
 
  // CENTRAL STATE MANAGEMENT
 
  const [selectedCrop, setSelectedCrop] = useState<string>('Tomato');
  const [irrigationZones, setIrrigationZones] = useState<IrrigationZone[]>(IRRIGATION_ZONES);
  const [zoneData, setZoneData] = useState<Record<string, ZoneWithData>>(IRRIGATION_ZONES_DATA);
  const [animatingMetrics, setAnimatingMetrics] = useState<Set<number>>(new Set());
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [currentPlaybackHour, setCurrentPlaybackHour] = useState<number>(0);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [updateSpeed, setUpdateSpeed] = useState<number>(1); // 1 = normal, 2 = fast, 0.5 = slow

  // Refs for cleanup
  const chartRef = useRef<ChartJS | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const zoneDataIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Historical data (memoized to avoid regeneration)
  const historicalData = useMemo(() => generateAllZonesHistoricalData(), []);

  // Current crop (derived state)
  const currentCrop = CROPS[selectedCrop];

  // Filtered alerts (excluding dismissed ones)
  const activeAlerts = useMemo(
    () => currentCrop.alerts.filter(alert => !dismissedAlerts.includes(alert.id)),
    [currentCrop.alerts, dismissedAlerts]
  );

 
  // UNIFIED CROP CHANGE HANDLER
 
  const handleCropChange = useCallback((cropName: string) => {
    setSelectedCrop(cropName);
    setDismissedAlerts([]); // Reset dismissed alerts
    setCurrentPlaybackHour(0); // Reset playback
    setSelectedZone(null); // Clear zone selection
    toast.success(`Switched to ${cropName} 🌱`);
  }, []);

 
  // REAL-TIME METRICS UPDATE (3 seconds)
 
  useEffect(() => {
    if (!isLiveMode) return;

    metricsIntervalRef.current = setInterval(() => {
      setAnimatingMetrics(new Set([0, 1, 2, 3]));
      setTimeout(() => setAnimatingMetrics(new Set()), 400);
    }, 3000 / updateSpeed);

    return () => {
      if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current);
    };
  }, [isLiveMode, updateSpeed]);

 
  // CHART.JS INITIALIZATION & CLEANUP
 
  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy old chart instance to prevent memory leaks
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const hours = Array.from({ length: 12 }, (_, i) => `${i}:00`);

    // Create new chart with responsive container
    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: currentCrop.tempData,
            borderColor: '#D85A30',
            backgroundColor: 'rgba(216, 90, 48, 0.05)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#D85A30',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            yAxisID: 'y',
          },
          {
            label: 'Soil Moisture (%)',
            data: currentCrop.moistureData,
            borderColor: '#378ADD',
            backgroundColor: 'rgba(55, 138, 221, 0.05)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#378ADD',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 12, weight: '500' as any },
              color: '#0F172A',
            },
          },
          filler: { propagate: true },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Temperature (°C)', font: { size: 11, weight: '500' as any } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#64748B' },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Moisture (%)', font: { size: 11, weight: '500' as any } },
            grid: { drawOnChartArea: false },
            ticks: { color: '#64748B' },
          },
        },
      },
    });

    // Cleanup on unmount or crop change
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [selectedCrop, currentCrop]);

 
  // ZONE DATA UPDATES (4 seconds)
 
  useEffect(() => {
    if (!isLiveMode) return;

    zoneDataIntervalRef.current = setInterval(() => {
      setZoneData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          const moisture = updated[id].moisture + (Math.random() - 0.5) * 5;
          const temp = updated[id].temperature + (Math.random() - 0.5) * 2;
          updated[id].moisture = Math.max(30, Math.min(90, moisture));
          updated[id].temperature = Math.max(20, Math.min(35, temp));

          // Update status based on moisture
          if (updated[id].moisture > 70) updated[id].status = 'ok';
          else if (updated[id].moisture > 50) updated[id].status = 'warn';
          else updated[id].status = 'alert';
        });
        return updated;
      });
    }, 4000 / updateSpeed);

    return () => {
      if (zoneDataIntervalRef.current) clearInterval(zoneDataIntervalRef.current);
    };
  }, [isLiveMode, updateSpeed]);

 
  // ZONE TOGGLE HANDLER
 
  const handleZoneToggle = useCallback((zoneId: string) => {
    setIrrigationZones(zones =>
      zones.map(z => {
        if (z.id === zoneId) {
          const newState = !z.isActive;
          toast.success(
            newState
              ? `🌊 Irrigation Zone ${zoneId} activated`
              : `⏹️ Irrigation Zone ${zoneId} stopped`
          );
          return { ...z, isActive: newState, lastRun: 'now' };
        }
        return z;
      })
    );
    setSelectedZone(zoneId);
  }, []);

 
  // ALERT DISMISSAL
 
  const handleDismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
    toast.info('Alert dismissed');
  }, []);

 
  // HELPER FUNCTIONS
 
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-900';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-600';
      case 'warn':
        return 'text-amber-600';
      case 'alert':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

 
  // RENDER
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg  flex items-center justify-center">
              <Leaf className="w-6 h-6 " />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AgriConnect</h1>
              <p className="text-xs text-slate-500">Smart Farm IoT Dashboard</p>
            </div>
          </div>

          {/* Live Indicator */}
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: isLiveMode ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 1, repeat: isLiveMode ? Infinity : 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 border border-red-300"
            >
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-red-700">
                {isLiveMode ? 'LIVE' : 'PAUSED'}
              </span>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Crop Selector - Horizontal Pill Bar */}
        <section>
          <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Select Crop</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Object.keys(CROPS).map(cropName => (
              <motion.button
                key={cropName}
                onClick={() => handleCropChange(cropName)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all whitespace-nowrap ${
                  selectedCrop === cropName
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300'
                }`}
              >
                <span className="mr-2">{CROPS[cropName].emoji}</span>
                {cropName}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Real-Time Metrics Grid */}
        <section>
          <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">Live Sensor Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentCrop.metrics.map((metric, idx) => (
              <motion.div
                key={idx}
                animate={animatingMetrics.has(idx) ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-slate-600">{metric.icon}</div>
                    <span className="text-xs font-medium text-slate-600">{metric.label}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    metric.status === 'ok' ? 'bg-green-100 text-green-700' :
                    metric.status === 'warn' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {metric.status.toUpperCase()}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {metric.value}
                    <span className="text-sm text-slate-500 ml-1">{metric.unit}</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.percentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Historical Playback */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">24-Hour Timeline</h2>
          <HistoricalPlayback
            currentHour={currentPlaybackHour}
            onHourChange={setCurrentPlaybackHour}
          />
        </section>

        {/* Sensor Chart */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">Sensor Trends</h2>
          <div className="h-80 w-full">
            <canvas ref={canvasRef} />
          </div>
        </section>

        {/* Zone Map & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Farm Zone Map</h2>
              <ZoneMap
                zones={Object.values(zoneData)}
                onZoneToggle={handleZoneToggle}
                selectedZone={selectedZone}
              />
            </section>
          </div>

          {/* Zone Control Panel */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">Zone Controls</h2>
            <div className="space-y-3">
              {Object.values(zoneData).map(zone => {
                const zoneInfo = irrigationZones.find(z => z.id === zone.id);
                return (
                  <motion.button
                    key={zone.id}
                    onClick={() => handleZoneToggle(zone.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      zoneInfo?.isActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{zone.name}</span>
                      <div className={`w-3 h-3 rounded-full ${zoneInfo?.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Last run: {zoneInfo?.lastRun}</div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Recommended Actions */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Recommended Actions
          </h2>
          <RecommendedActions
            zones={Object.values(zoneData)}
            cropType={selectedCrop}
            currentHour={currentPlaybackHour}
          />
        </section>

        {/* Alerts Panel */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-500" />
            Alerts ({activeAlerts.length})
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {activeAlerts.length > 0 ? (
                activeAlerts.map(alert => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-lg border ${getAlertColor(alert.severity)} flex items-start justify-between`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs opacity-75 mt-1">{alert.time}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDismissAlert(alert.id)}
                      className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All systems normal ✓</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Water Saved</span>
              <Droplet className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-900">{currentCrop.waterSaved}</div>
            <p className="text-xs text-blue-700 mt-2">This season</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">Yield Forecast</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-900">{currentCrop.yieldForecast}</div>
            <p className="text-xs text-green-700 mt-2">Expected harvest</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-900">Next Irrigation</span>
              <Activity className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-900">{currentCrop.nextIrrigation}</div>
            <p className="text-xs text-amber-700 mt-2">{currentCrop.nextZone}</p>
          </div>
        </section>

        {/* Crop Stage Progress */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">Crop Lifecycle</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{currentCrop.stage}</span>
                <span className="text-sm font-bold text-emerald-600">{currentCrop.stageProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${currentCrop.stageProgress}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              {currentCrop.recommendations.map((rec, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <span className="text-lg flex-shrink-0">{rec.split(' ')[0]}</span>
                  <span className="text-sm text-slate-700">{rec.substring(rec.indexOf(' ') + 1)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 7-Day Historical Analysis */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">7-Day Analysis</h2>
          <SevenDayPlayback />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          <p>AgriConnect — Precision Agriculture Dashboard</p>
          <p className="mt-2 text-xs text-slate-500">Real-time sensor simulation • Crop-specific thresholds • AI-powered recommendations</p>
        </div>
      </footer>
    </div>
  );
}
