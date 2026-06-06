/**
 * Historical Data Generator
 * Generates realistic 24-hour moisture and temperature trends for irrigation zones
 */

export interface HistoricalDataPoint {
  hour: number;
  moisture: number;
  temperature: number;
  timestamp: string;
}

export interface ZoneHistoricalData {
  zoneId: string;
  data: HistoricalDataPoint[];
}

/**
 * Generate realistic historical data for a zone
 * Simulates daily moisture depletion and temperature cycles
 */
export function generateZoneHistoricalData(
  zoneId: string,
  startMoisture: number = 70,
  startTemp: number = 18
): ZoneHistoricalData {
  const data: HistoricalDataPoint[] = [];

  for (let hour = 0; hour < 24; hour++) {
    // Temperature follows a daily cycle: coolest at 6am, warmest at 2pm
    const tempCycle = Math.sin((hour - 6) * (Math.PI / 12)) * 8;
    const baseTemp = 22 + tempCycle;
    const temperature = Math.round((baseTemp + (Math.random() - 0.5) * 2) * 10) / 10;

    // Moisture depletes during day (evapotranspiration), recovers after irrigation
    let moisture = startMoisture;

    // Morning (0-6am): slight increase (dew, no evaporation)
    if (hour < 6) {
      moisture = startMoisture + (hour * 1.5);
    }
    // Day (6am-6pm): steady depletion
    else if (hour < 18) {
      moisture = startMoisture + 9 - (hour - 6) * 2.5;
    }
    // Evening (6pm-midnight): slower depletion
    else {
      moisture = startMoisture + 9 - 30 - (hour - 18) * 0.8;
    }

    // Add some realistic noise
    moisture += (Math.random() - 0.5) * 3;
    moisture = Math.max(30, Math.min(95, moisture));

    // Simulate irrigation event at specific hours (e.g., 6am and 6pm)
    if (hour === 6 || hour === 18) {
      moisture = Math.min(95, moisture + 25);
    }

    data.push({
      hour,
      moisture: Math.round(moisture),
      temperature,
      timestamp: `${String(hour).padStart(2, '0')}:00`,
    });
  }

  return { zoneId, data };
}

/**
 * Generate historical data for all zones
 */
export function generateAllZonesHistoricalData(): Record<string, ZoneHistoricalData> {
  const zones = ['A', 'B', 'C', 'D'];
  const result: Record<string, ZoneHistoricalData> = {};

  zones.forEach((zoneId) => {
    // Vary starting moisture for each zone to show different patterns
    const startMoisture = 60 + Math.random() * 20;
    result[zoneId] = generateZoneHistoricalData(zoneId, startMoisture);
  });

  return result;
}

/**
 * Get moisture value for a specific zone at a specific hour
 */
export function getMoistureAtHour(
  historicalData: Record<string, ZoneHistoricalData>,
  zoneId: string,
  hour: number
): number {
  return historicalData[zoneId]?.data[hour]?.moisture || 0;
}

/**
 * Get temperature value for a specific zone at a specific hour
 */
export function getTemperatureAtHour(
  historicalData: Record<string, ZoneHistoricalData>,
  zoneId: string,
  hour: number
): number {
  return historicalData[zoneId]?.data[hour]?.temperature || 0;
}

/**
 * Format hour as readable time (e.g., "14:00" or "2:00 PM")
 */
export function formatHourAsTime(hour: number, format: '24h' | '12h' = '24h'): string {
  if (format === '24h') {
    return `${String(hour).padStart(2, '0')}:00`;
  } else {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  }
}

/**
 * Get a readable label for time of day
 */
export function getTimeOfDayLabel(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

/**
 * Calculate average moisture across all zones for a given hour
 */
export function getAverageMoistureAtHour(
  historicalData: Record<string, ZoneHistoricalData>,
  hour: number
): number {
  const zones = Object.keys(historicalData);
  const total = zones.reduce((sum, zoneId) => {
    return sum + getMoistureAtHour(historicalData, zoneId, hour);
  }, 0);
  return Math.round(total / zones.length);
}
