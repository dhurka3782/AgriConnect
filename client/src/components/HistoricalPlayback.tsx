import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { formatHourAsTime, getTimeOfDayLabel } from '@/lib/historicalData';

interface HistoricalPlaybackProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export default function HistoricalPlayback({
  currentHour,
  onHourChange,
  isPlaying = false,
  onPlayingChange,
}: HistoricalPlaybackProps) {
  const [autoPlay, setAutoPlay] = useState(isPlaying);

  // Auto-advance through hours when playing
  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      onHourChange(currentHour >= 23 ? 0 : currentHour + 1);
    }, 800);

    return () => clearInterval(interval);
  }, [autoPlay, onHourChange, currentHour]);

  const handlePlayToggle = () => {
    const newState = !autoPlay;
    setAutoPlay(newState);
    onPlayingChange?.(newState);
  };

  const handleReset = () => {
    setAutoPlay(false);
    onHourChange(0);
    onPlayingChange?.(false);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onHourChange(parseInt(e.target.value, 10));
  };

  const getMoistureIndicator = (hour: number) => {
    // Simplified moisture pattern: depletes during day, recovers after irrigation
    let moisture = 70;
    if (hour < 6) {
      moisture = 70 + hour * 1.5;
    } else if (hour < 18) {
      moisture = 79 - (hour - 6) * 2.5;
    } else {
      moisture = 49 - (hour - 18) * 0.8;
    }
    return Math.max(30, Math.min(95, Math.round(moisture)));
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">24-Hour Timeline</h3>
          <p className="text-xs text-muted-foreground">Historical moisture trends</p>
        </div>
        <motion.div
          className="text-right"
          key={currentHour}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-2xl font-bold text-foreground">{formatHourAsTime(currentHour)}</p>
          <p className="text-xs text-muted-foreground">{getTimeOfDayLabel(currentHour)}</p>
        </motion.div>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="23"
            value={currentHour}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
            style={{
              background: `linear-gradient(to right, #10B981 0%, #10B981 ${(currentHour / 23) * 100}%, #E5E7EB ${(currentHour / 23) * 100}%, #E5E7EB 100%)`,
            }}
          />
        </div>

        {/* Hour labels */}
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </div>

      {/* Moisture indicator at current hour */}
      <motion.div
        className="bg-muted/50 rounded-lg p-3"
        key={currentHour}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Average Zone Moisture</span>
          <span className="text-lg font-bold text-accent">{getMoistureIndicator(currentHour)}%</span>
        </div>
        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent to-lime-500"
            initial={{ width: 0 }}
            animate={{ width: `${getMoistureIndicator(currentHour)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Controls */}
      <div className="flex gap-2">
        <motion.button
          onClick={handlePlayToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent text-white rounded-lg font-medium text-sm transition-colors hover:bg-accent/90"
        >
          {autoPlay ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Play
            </>
          )}
        </motion.button>

        <motion.button
          onClick={handleReset}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg font-medium text-sm transition-colors hover:bg-muted/80"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </motion.button>
      </div>

      {/* Timeline info */}
      <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p>
          <strong>💧 Moisture Pattern:</strong> Depletes during day (evapotranspiration), recovers after irrigation at 6am & 6pm
        </p>
        <p>
          <strong>🌡️ Temperature:</strong> Coolest at dawn (~18°C), warmest at 2pm (~30°C)
        </p>
      </div>
    </div>
  );
}
