import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Lightbulb, Zap, Clock } from 'lucide-react';
import { getRecommendedAction, CROP_THRESHOLDS } from '@/lib/alertEngine';

interface RecommendedActionsProps {
  zones: Array<{
    id: string;
    moisture: number;
    temperature: number;
  }>;
  cropType: string;
  currentHour: number;
}

export default function RecommendedActions({
  zones,
  cropType,
  currentHour,
}: RecommendedActionsProps) {
  const threshold = CROP_THRESHOLDS[cropType];
  
  const actions = zones
    .map((zone) => ({
      zoneId: zone.id,
      action: getRecommendedAction(
        zone.id,
        zone.moisture,
        zone.temperature,
        cropType,
        currentHour
      ),
      moisture: zone.moisture,
      temperature: zone.temperature,
    }))
    .filter((item) => item.action !== null);

  const getActionIcon = (action: string | null) => {
    if (!action) return null;
    if (action.includes('irrigate') || action.includes('Irrigate')) {
      return <Zap className="w-4 h-4 text-accent" />;
    }
    if (action.includes('monitor') || action.includes('Monitor')) {
      return <Clock className="w-4 h-4 text-info" />;
    }
    if (action.includes('prepare') || action.includes('Prepare')) {
      return <Lightbulb className="w-4 h-4 text-warning" />;
    }
    return <CheckCircle className="w-4 h-4 text-success" />;
  };

  const getTimeOfDayLabel = (hour: number): string => {
    if (hour >= 5 && hour < 12) return '🌅 Morning';
    if (hour >= 12 && hour < 17) return '☀️ Afternoon';
    if (hour >= 17 && hour < 21) return '🌆 Evening';
    return '🌙 Night';
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Recommended Actions</h3>
        </div>
        <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded">
          {getTimeOfDayLabel(currentHour)}
        </span>
      </div>

      {/* Crop Info */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-1">{cropType}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            💧 Moisture: {threshold?.minMoisture}–{threshold?.maxMoisture}%
          </div>
          <div>
            🌡️ Temp: {threshold?.optimalTemp.min}–{threshold?.optimalTemp.max}°C
          </div>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-2">
        <AnimatePresence>
          {actions.length > 0 ? (
            actions.map((item, idx) => (
              <motion.div
                key={`${item.zoneId}-action`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-muted/30 border border-border rounded-lg p-3 flex items-start gap-3"
              >
                <div className="mt-1">{getActionIcon(item.action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Zone {item.zoneId}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {item.action}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span>💧 {item.moisture}%</span>
                    <span>🌡️ {item.temperature.toFixed(1)}°C</span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-start gap-3"
            >
              <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">All Zones Optimal</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All zones are within target ranges for {cropType}. Continue monitoring.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Irrigation Timing Guide */}
      <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">💡 Irrigation Timing Tips</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>6–10am: Ideal irrigation window (cool, low evaporation)</li>
          <li>10am–2pm: Avoid irrigation (peak heat, high evaporation)</li>
          <li>4–6pm: Secondary irrigation window (evening cool-down)</li>
          <li>6pm–6am: Monitor for frost risk in cold seasons</li>
        </ul>
      </div>
    </div>
  );
}
