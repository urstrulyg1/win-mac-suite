/**
 * Correlates telemetry that was actually observed by backend probes.
 * Missing fields are treated as missing evidence, never as guessed values.
 */

import { createFinding } from '../models/finding.js';

export class CorrelationEngine {
  static correlate(rawTelemetry = {}) {
    const findings = [];
    const incidents = [];

    const memoryUsagePct = Number.isFinite(rawTelemetry.memoryUsagePct) ? rawTelemetry.memoryUsagePct : null;
    const swapUsedGB = Number.isFinite(rawTelemetry.swapUsedGB) ? rawTelemetry.swapUsedGB : null;
    const dockerActive = typeof rawTelemetry.dockerActive === 'boolean' ? rawTelemetry.dockerActive : null;
    const dockerCpuPct = Number.isFinite(rawTelemetry.dockerCpuPct) ? rawTelemetry.dockerCpuPct : null;
    const chromeMemoryMB = Number.isFinite(rawTelemetry.chromeMemoryMB) ? rawTelemetry.chromeMemoryMB : null;
    const systemDataGB = Number.isFinite(rawTelemetry.systemDataGB) ? rawTelemetry.systemDataGB : null;
    const freeDiskGB = Number.isFinite(rawTelemetry.freeDiskGB) ? rawTelemetry.freeDiskGB : null;
    const recentCrashes = Array.isArray(rawTelemetry.recentCrashes) ? rawTelemetry.recentCrashes : null;
    const thermalLevel = typeof rawTelemetry.thermalLevel === 'string' ? rawTelemetry.thermalLevel : null;

    const memoryPressureObserved = memoryUsagePct !== null && memoryUsagePct > 70;
    const highMemoryProcessObserved = chromeMemoryMB !== null && chromeMemoryMB > 3000;
    const dockerLoadObserved = dockerActive === true && (dockerCpuPct === null || dockerCpuPct > 60);

    if (memoryPressureObserved && (highMemoryProcessObserved || dockerLoadObserved)) {
      const evidence = [
        { source: 'memory probe', observedValue: `${memoryUsagePct}%`, expectedRange: '< 75%' },
      ];
      if (swapUsedGB !== null) evidence.push({ source: 'swap probe', observedValue: `${swapUsedGB} GB`, expectedRange: 'probe-defined' });
      if (chromeMemoryMB !== null) evidence.push({ source: 'process probe', observedValue: `${(chromeMemoryMB / 1024).toFixed(1)} GB`, expectedRange: 'probe-defined' });
      if (dockerCpuPct !== null) evidence.push({ source: 'Docker process probe', observedValue: `${dockerCpuPct}% CPU`, expectedRange: 'probe-defined' });

      findings.push(createFinding({
        id: 'finding-mem-pressure', category: 'memory', severity: memoryUsagePct > 85 ? 'critical' : 'warning',
        title: 'Elevated Unified Memory Pressure',
        description: `Observed unified memory utilization is ${memoryUsagePct}%.`,
        evidence,
        impact: 'High',
        remediation: [{ actionId: 'purge-ram', label: 'Purge Inactive RAM Buffers', description: 'Reclaims inactive cache buffers without quitting apps', reversible: true }],
      }));

      incidents.push({
        id: 'inc-mem-01', title: 'Memory Pressure & Application Instability Chain',
        timeWindow: null, severity: 'warning', relationshipStrength: null,
        rootCause: 'Observed memory pressure coincides with elevated process/resource usage; causality requires further verification.',
        chain: [
          { step: 1, title: 'Memory pressure observed', detail: `${memoryUsagePct}% observed utilization`, icon: 'Cpu' },
          ...(dockerActive === true ? [{ step: 2, title: 'Docker activity observed', detail: dockerCpuPct === null ? 'CPU usage not measured' : `${dockerCpuPct}% CPU observed`, icon: 'Layers' }] : []),
          ...(chromeMemoryMB !== null ? [{ step: 3, title: 'Chrome memory usage observed', detail: `${(chromeMemoryMB / 1024).toFixed(1)} GB observed`, icon: 'AlertTriangle' }] : []),
        ],
        verdict: 'Correlation detected from observed telemetry; this is not a proof of causation.',
        recommendedAction: 'Collect additional process, crash, and memory samples before attributing root cause.',
      });
    }

    if (systemDataGB !== null && systemDataGB > 35) {
      const evidence = [{ source: 'storage probe', observedValue: `${systemDataGB} GB`, expectedRange: 'probe-defined' }];
      if (freeDiskGB !== null) evidence.push({ source: 'filesystem capacity probe', observedValue: `${freeDiskGB} GB free`, expectedRange: 'probe-defined' });
      findings.push(createFinding({
        id: 'finding-storage-systemdata', category: 'storage', severity: freeDiskGB !== null && freeDiskGB < 20 ? 'warning' : 'info',
        title: 'System Data Growth Detected',
        description: `Observed system data is ${systemDataGB} GB.`, evidence, impact: 'Medium',
        remediation: [{ actionId: 'clean-xcode', label: 'Inspect Developer Caches', description: 'Inspect measured cache usage before deleting data', reversible: false }],
      }));
    }

    if (thermalLevel !== null && recentCrashes !== null && recentCrashes.length > 0) {
      incidents.push({
        id: 'inc-thermal-crash-correlation', title: 'Thermal State and Crash Activity Correlation', timeWindow: null,
        severity: 'warning', relationshipStrength: null,
        rootCause: `Observed thermal state ${thermalLevel} coincides with ${recentCrashes.length} reported crash record(s); causality is unverified.`,
        chain: [
          { step: 1, title: 'Thermal state observed', detail: thermalLevel, icon: 'Thermometer' },
          { step: 2, title: 'Crash records observed', detail: `${recentCrashes.length} crash record(s)`, icon: 'AlertTriangle' },
        ],
        verdict: 'Correlation only; additional evidence is required before assigning root cause.',
        recommendedAction: 'Review crash timestamps against thermal samples.',
      });
    }

    return { findings, incidents, correlationTimestamp: new Date().toISOString() };
  }
}
