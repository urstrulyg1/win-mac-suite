import type { Section, SystemInfo } from './types';
import { WINDOWS_PHASES, WINDOWS_CONFIG } from './platform/windows';

// No hardcoded host telemetry lives here. Initial system state is unknown until
// /api/sysinfo is polled; missing values stay null (null is not zero).
export const SYSTEM_INFO: SystemInfo = {
  hostName: '',
  user: '',
  os: '',
  build: '',
  processor: '',
  ramGB: null,
  freeDiskGB: null,
  totalDiskGB: null,
  isOnline: null,
  cpuUsage: null,
  memoryUsage: null,
  uptime: '',
};

export const MODE_DESCRIPTIONS = WINDOWS_CONFIG.modeDescriptions;

export function createSections(): Section[] {
  return WINDOWS_PHASES.map((p) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    description: p.description,
    icon: p.icon,
    status: 'pending',
    progress: 0,
    duration: 0,
    result: '',
    logs: [],
    details: p.details,
  }));
}
