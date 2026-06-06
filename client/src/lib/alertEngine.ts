/**
 * Alert Engine
 * Generates threshold-based alerts based on zone conditions and crop requirements
 */

export interface AlertRule {
  id: string;
  name: string;
  condition: (moisture: number, temp: number, cropType: string) => boolean;
  severity: 'critical' | 'warning' | 'info';
  message: (zoneId: string) => string;
  action?: string;
}

export interface GeneratedAlert {
  id: string;
  zoneId: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  action?: string;
  timestamp: Date;
}

// Crop-specific thresholds
export const CROP_THRESHOLDS: Record<string, { minMoisture: number; maxMoisture: number; optimalTemp: { min: number; max: number } }> = {
  Tomato: { minMoisture: 50, maxMoisture: 80, optimalTemp: { min: 20, max: 28 } },
  Cucumber: { minMoisture: 60, maxMoisture: 85, optimalTemp: { min: 22, max: 30 } },
  Chilli: { minMoisture: 45, maxMoisture: 75, optimalTemp: { min: 25, max: 32 } },
  Grape: { minMoisture: 40, maxMoisture: 70, optimalTemp: { min: 18, max: 28 } },
  Mushroom: { minMoisture: 70, maxMoisture: 90, optimalTemp: { min: 15, max: 22 } },
};

/**
 * Alert rules engine
 */
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'critical-low-moisture',
    name: 'Critical Low Moisture',
    condition: (moisture) => moisture < 40,
    severity: 'critical',
    message: (zoneId) => `Zone ${zoneId}: Soil moisture critically low. Immediate irrigation required.`,
    action: 'Trigger irrigation immediately',
  },
  {
    id: 'warning-low-moisture',
    name: 'Low Moisture Warning',
    condition: (moisture) => moisture >= 40 && moisture < 50,
    severity: 'warning',
    message: (zoneId) => `Zone ${zoneId}: Soil moisture low. Schedule irrigation within 2 hours.`,
    action: 'Schedule irrigation',
  },
  {
    id: 'critical-high-moisture',
    name: 'Critical High Moisture',
    condition: (moisture) => moisture > 85,
    severity: 'critical',
    message: (zoneId) => `Zone ${zoneId}: Soil moisture too high. Risk of root rot. Reduce irrigation.`,
    action: 'Reduce irrigation frequency',
  },
  {
    id: 'warning-high-temp',
    name: 'High Temperature Warning',
    condition: (moisture, temp) => temp > 32,
    severity: 'warning',
    message: (zoneId) => `Zone ${zoneId}: Temperature elevated. Increase irrigation frequency to prevent stress.`,
    action: 'Increase irrigation frequency',
  },
  {
    id: 'info-optimal',
    name: 'Optimal Conditions',
    condition: (moisture, temp) => moisture >= 50 && moisture <= 80 && temp >= 20 && temp <= 28,
    severity: 'info',
    message: (zoneId) => `Zone ${zoneId}: Conditions optimal for growth.`,
  },
];

/**
 * Generate alerts for a zone based on current conditions
 */
export function generateAlertsForZone(
  zoneId: string,
  moisture: number,
  temperature: number,
  cropType: string
): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = [];
  const threshold = CROP_THRESHOLDS[cropType];

  if (!threshold) return alerts;

  // Check each rule
  ALERT_RULES.forEach((rule) => {
    if (rule.condition(moisture, temperature, cropType)) {
      alerts.push({
        id: `${zoneId}-${rule.id}`,
        zoneId,
        severity: rule.severity,
        message: rule.message(zoneId),
        action: rule.action,
        timestamp: new Date(),
      });
    }
  });

  return alerts;
}

/**
 * Check if a zone needs immediate attention
 */
export function isZoneCritical(moisture: number, temperature: number): boolean {
  return moisture < 40 || moisture > 85 || temperature > 32;
}

/**
 * Get recommended action based on zone status
 */
export function getRecommendedAction(
  zoneId: string,
  moisture: number,
  temperature: number,
  cropType: string,
  hour: number
): string | null {
  const threshold = CROP_THRESHOLDS[cropType];
  if (!threshold) return null;

  // Morning (6-10am): Good time to irrigate
  if (hour >= 6 && hour < 10) {
    if (moisture < threshold.minMoisture) {
      return `Zone ${zoneId}: Ideal time to irrigate. Moisture at ${moisture}%, target ${threshold.minMoisture}%+`;
    }
  }

  // Midday (10am-2pm): Avoid irrigation due to heat
  if (hour >= 10 && hour < 14) {
    if (moisture < threshold.minMoisture - 5) {
      return `Zone ${zoneId}: Heat peak approaching. Prepare irrigation for evening.`;
    }
  }

  // Evening (4-6pm): Good time to irrigate
  if (hour >= 16 && hour < 18) {
    if (moisture < threshold.minMoisture) {
      return `Zone ${zoneId}: Evening irrigation window. Moisture at ${moisture}%, recommend irrigation.`;
    }
  }

  // Night (6pm-6am): Monitor for frost risk
  if ((hour >= 18 || hour < 6) && temperature < 10) {
    return `Zone ${zoneId}: Low temperature risk (${temperature}°C). Monitor for frost damage.`;
  }

  // High temperature stress
  if (temperature > threshold.optimalTemp.max + 5) {
    return `Zone ${zoneId}: Heat stress risk. Increase irrigation to cool soil.`;
  }

  return null;
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical':
      return '#EF4444'; // Red
    case 'warning':
      return '#F59E0B'; // Amber
    case 'info':
      return '#3B82F6'; // Blue
    default:
      return '#64748B';
  }
}

/**
 * Get severity label
 */
export function getSeverityLabel(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'info':
      return 'Info';
    default:
      return 'Unknown';
  }
}
