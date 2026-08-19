import type { Section, SystemInfo, RunMode, LogEntry } from './types';
import { WINDOWS_PHASES, WINDOWS_CONFIG } from './platform/windows';

export const SYSTEM_INFO: SystemInfo = {
  hostName: 'Local Host',
  user: 'User',
  os: 'OS',
  build: '',
  processor: 'Processor',
  ramGB: 0,
  freeDiskGB: 0,
  totalDiskGB: 0,
  isOnline: true,
  cpuUsage: 0,
  memoryUsage: 0,
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
