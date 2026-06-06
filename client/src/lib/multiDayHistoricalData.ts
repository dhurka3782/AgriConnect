/**
 * Multi-Day Historical Data Generator
 * Generates realistic 7-day moisture and temperature trends with seasonal patterns
 */

import { generateZoneHistoricalData, HistoricalDataPoint } from './historicalData';

export interface DayData {
  date: Date;
  dayOfWeek: string;
  hourlyData: Record<string, HistoricalDataPoint[]>;
}

export interface SevenDayHistoricalData {
  zoneId: string;
  days: DayData[];
}

/**
 * Generate 7 days of historical data for a zone
 * Includes realistic seasonal patterns and irrigation schedules
 */
export function generateSevenDayHistoricalData(
  zoneId: string,
  startDate: Date = new Date()
): SevenDayHistoricalData {
  const days: DayData[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - dayOffset);

    // Vary starting moisture based on day of week (simulate irrigation schedule)
    // Typically irrigate on Mon, Wed, Fri
    const dayOfWeek = currentDate.getDay();
    const isIrrigationDay = [1, 3, 5].includes(dayOfWeek); // Mon, Wed, Fri
    const startMoisture = isIrrigationDay ? 75 : 55 + Math.random() * 15;

    const hourlyData = generateZoneHistoricalData(zoneId, startMoisture).data;

    days.push({
      date: currentDate,
      dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
      hourlyData: { [zoneId]: hourlyData },
    });
  }

  return { zoneId, days: days.reverse() }; // Reverse to show oldest first
}

/**
 * Get moisture value for a specific day and hour
 */
export function getMoistureAtDayAndHour(
  sevenDayData: SevenDayHistoricalData,
  dayIndex: number,
  hour: number
): number {
  if (dayIndex < 0 || dayIndex >= sevenDayData.days.length) return 0;
  const day = sevenDayData.days[dayIndex];
  return day.hourlyData[sevenDayData.zoneId]?.[hour]?.moisture || 0;
}

/**
 * Get average moisture for a specific day
 */
export function getAverageMoistureForDay(
  sevenDayData: SevenDayHistoricalData,
  dayIndex: number
): number {
  if (dayIndex < 0 || dayIndex >= sevenDayData.days.length) return 0;
  const day = sevenDayData.days[dayIndex];
  const hourlyData = day.hourlyData[sevenDayData.zoneId] || [];
  const total = hourlyData.reduce((sum, point) => sum + point.moisture, 0);
  return Math.round(total / hourlyData.length);
}

/**
 * Get min and max moisture for a specific day
 */
export function getMinMaxMoistureForDay(
  sevenDayData: SevenDayHistoricalData,
  dayIndex: number
): { min: number; max: number } {
  if (dayIndex < 0 || dayIndex >= sevenDayData.days.length) {
    return { min: 0, max: 0 };
  }
  const day = sevenDayData.days[dayIndex];
  const hourlyData = day.hourlyData[sevenDayData.zoneId] || [];
  const moistures = hourlyData.map((p) => p.moisture);
  return {
    min: Math.min(...moistures),
    max: Math.max(...moistures),
  };
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get day label (e.g., "Today", "Yesterday", "3 days ago")
 */
export function getDayLabel(date: Date, baseDate: Date = new Date()): string {
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDateForDisplay(date);
}

/**
 * Detect irrigation events from moisture spikes
 */
export function detectIrrigationEvents(
  sevenDayData: SevenDayHistoricalData,
  dayIndex: number
): number[] {
  if (dayIndex < 0 || dayIndex >= sevenDayData.days.length) return [];
  const day = sevenDayData.days[dayIndex];
  const hourlyData = day.hourlyData[sevenDayData.zoneId] || [];
  const irrigationHours: number[] = [];

  for (let i = 1; i < hourlyData.length; i++) {
    const moistureIncrease = hourlyData[i].moisture - hourlyData[i - 1].moisture;
    // Irrigation typically increases moisture by 15%+ in one hour
    if (moistureIncrease > 15) {
      irrigationHours.push(i);
    }
  }

  return irrigationHours;
}

/**
 * Calculate water stress days (days where moisture stayed below threshold)
 */
export function calculateWaterStressDays(
  sevenDayData: SevenDayHistoricalData,
  threshold: number = 45
): number {
  let stressDays = 0;

  sevenDayData.days.forEach((day) => {
    const hourlyData = day.hourlyData[sevenDayData.zoneId] || [];
    const stressHours = hourlyData.filter((p) => p.moisture < threshold).length;
    // If more than 6 hours (25% of day) below threshold, count as stress day
    if (stressHours > 6) {
      stressDays++;
    }
  });

  return stressDays;
}

/**
 * Get moisture trend (increasing, decreasing, stable)
 */
export function getMoistureTrend(
  sevenDayData: SevenDayHistoricalData
): 'increasing' | 'decreasing' | 'stable' {
  if (sevenDayData.days.length < 2) return 'stable';

  const firstDayAvg = getAverageMoistureForDay(sevenDayData, 0);
  const lastDayAvg = getAverageMoistureForDay(sevenDayData, sevenDayData.days.length - 1);

  const diff = lastDayAvg - firstDayAvg;
  if (Math.abs(diff) < 5) return 'stable';
  return diff > 0 ? 'increasing' : 'decreasing';
}
