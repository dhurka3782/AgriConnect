import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  generateSevenDayHistoricalData,
  getAverageMoistureForDay,
  getMinMaxMoistureForDay,
  getDayLabel,
  formatDateForDisplay,
  detectIrrigationEvents,
  getMoistureTrend,
} from '@/lib/multiDayHistoricalData';

interface SevenDayPlaybackProps {
  onDaySelect?: (dayIndex: number) => void;
  selectedDayIndex?: number;
}

export default function SevenDayPlayback({
  onDaySelect,
  selectedDayIndex = 6,
}: SevenDayPlaybackProps) {
  const [sevenDayData] = useState(() => generateSevenDayHistoricalData('A'));
  const [currentDayIndex, setCurrentDayIndex] = useState(selectedDayIndex);

  useEffect(() => {
    onDaySelect?.(currentDayIndex);
  }, [currentDayIndex, onDaySelect]);

  const currentDay = sevenDayData.days[currentDayIndex];
  const avgMoisture = getAverageMoistureForDay(sevenDayData, currentDayIndex);
  const { min: minMoisture, max: maxMoisture } = getMinMaxMoistureForDay(
    sevenDayData,
    currentDayIndex
  );
  const irrigationEvents = detectIrrigationEvents(sevenDayData, currentDayIndex);
  const trend = getMoistureTrend(sevenDayData);

  const handlePrevDay = () => {
    setCurrentDayIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextDay = () => {
    setCurrentDayIndex((prev) => Math.min(sevenDayData.days.length - 1, prev + 1));
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">7-Day Analysis</h3>
        </div>
        <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded">
          {getDayLabel(currentDay.date)}
        </span>
      </div>

      {/* Day Navigation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <motion.button
            onClick={handlePrevDay}
            disabled={currentDayIndex === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>

          <div className="text-center flex-1">
            <p className="font-semibold text-foreground">{currentDay.dayOfWeek}</p>
            <p className="text-xs text-muted-foreground">{formatDateForDisplay(currentDay.date)}</p>
          </div>

          <motion.button
            onClick={handleNextDay}
            disabled={currentDayIndex === sevenDayData.days.length - 1}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Day Selector Grid */}
        <div className="grid grid-cols-7 gap-1">
          {sevenDayData.days.map((day, idx) => (
            <motion.button
              key={idx}
              onClick={() => setCurrentDayIndex(idx)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded text-xs font-medium transition-all ${
                idx === currentDayIndex
                  ? 'bg-accent text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {day.dayOfWeek.charAt(0)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Moisture Stats */}
      <motion.div
        className="bg-muted/50 rounded-lg p-3 space-y-2"
        key={currentDayIndex}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-lg font-bold text-accent">{avgMoisture}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Min</p>
            <p className="text-lg font-bold text-destructive">{minMoisture}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Max</p>
            <p className="text-lg font-bold text-success">{maxMoisture}%</p>
          </div>
        </div>

        {/* Moisture Bar */}
        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-destructive via-warning to-success"
            initial={{ width: 0 }}
            animate={{ width: `${avgMoisture}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Irrigation Events */}
      {irrigationEvents.length > 0 && (
        <div className="bg-info/10 border border-info/30 rounded-lg p-3">
          <p className="text-xs font-medium text-foreground mb-2">💧 Irrigation Events</p>
          <div className="flex flex-wrap gap-1">
            {irrigationEvents.map((hour) => (
              <span
                key={hour}
                className="text-xs bg-info/20 text-info px-2 py-1 rounded"
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trend Analysis */}
      <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">📈 Trend Analysis</p>
        <p>
          {trend === 'increasing' && '📊 Moisture levels increasing across the week'}
          {trend === 'decreasing' && '📉 Moisture levels declining - increase irrigation frequency'}
          {trend === 'stable' && '➡️ Moisture levels stable - current schedule effective'}
        </p>
      </div>
    </div>
  );
}
