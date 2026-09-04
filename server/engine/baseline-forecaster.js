/**
 * Live baseline snapshots and forecasts derived only from observed host data.
 * Historical baselines require persisted measurements; this module does not invent them.
 */
import si from 'systeminformation';
import os from 'os';
import path from 'path';
import fs from 'fs';

export class BaselineForecaster {
  static async getBaselineComparison(profile = '7day') {
    const [mem, fsSize, batt] = await Promise.all([
      si.mem(),
      si.fsSize().catch(() => []),
      si.battery().catch(() => ({ hasBattery: false })),
    ]);

    const primary = Array.isArray(fsSize) ? fsSize.find(f => f.mount === '/System/Volumes/Data' || f.mount === '/') || fsSize[0] : null;
    const storageUsedGB = primary ? +(primary.used / 1024 / 1024 / 1024).toFixed(1) : null;
    const freeDiskGB = primary ? +((primary.size - primary.used) / 1024 / 1024 / 1024).toFixed(1) : null;
    const ramActiveGB = Number.isFinite(mem?.active) ? +(mem.active / 1024 / 1024 / 1024).toFixed(2) : null;
    const ramTotalGB = Number.isFinite(mem?.total) ? +(mem.total / 1024 / 1024 / 1024).toFixed(2) : null;
    const ramPct = ramActiveGB !== null && ramTotalGB && ramTotalGB > 0 ? Math.round((ramActiveGB / ramTotalGB) * 100) : null;
    const battHealthPct = batt?.hasBattery && batt.maxCapacity && batt.designedCapacity ? Math.round((batt.maxCapacity / batt.designedCapacity) * 100) : null;

    const launchAgentDir = path.join(os.homedir(), 'Library/LaunchAgents');
    let startupItemsCount = null;
    if (fs.existsSync(launchAgentDir)) {
      try { startupItemsCount = fs.readdirSync(launchAgentDir).filter(f => f.endsWith('.plist')).length; } catch {}
    }

    const profileNames = { firstRun: 'First-Run Baseline', '7day': '7-Day Rolling Baseline', '30day': '30-Day Baseline', developer: 'Developer Toolchain Baseline' };
    const metrics = [];
    if (storageUsedGB !== null && freeDiskGB !== null) metrics.push({ name: 'Storage Used', current: `${storageUsedGB} GB`, freeDiskGB, severity: freeDiskGB < 10 ? 'critical' : freeDiskGB < 20 ? 'warning' : 'nominal', note: `${freeDiskGB} GB free` });
    if (ramActiveGB !== null && ramTotalGB !== null) metrics.push({ name: 'RAM Active Usage', current: `${ramActiveGB} GB / ${ramTotalGB} GB`, severity: ramPct > 90 ? 'critical' : ramPct > 75 ? 'warning' : 'nominal', note: `${ramPct}% active` });
    if (startupItemsCount !== null) metrics.push({ name: 'Startup Background Items', current: `${startupItemsCount} LaunchAgent(s)`, severity: startupItemsCount > 10 ? 'warning' : 'nominal', note: 'Counted from ~/Library/LaunchAgents' });
    if (battHealthPct !== null) metrics.push({ name: 'Battery Health Condition', current: `${battHealthPct}%`, severity: battHealthPct < 80 ? 'warning' : 'nominal', note: battHealthPct < 80 ? 'Battery health below configured threshold' : 'Battery health above configured threshold' });

    return {
      profileRequested: profile,
      profileName: profileNames[profile] || profile,
      availableProfiles: Object.entries(profileNames).map(([id, name]) => ({ id, name })),
      note: 'Values are live observations only. Historical comparison is unavailable until measurements are persisted.',
      metrics,
      sampledAt: new Date().toISOString(),
    };
  }

  static getForecast(freeDiskGB = null, averageDailyGrowthGB = null) {
    const criticalThresholdGB = 15;
    const hasInputs = Number.isFinite(freeDiskGB) && Number.isFinite(averageDailyGrowthGB) && averageDailyGrowthGB > 0;
    if (!hasInputs) {
      return {
        storageForecast: {
          currentFreeDiskGB: Number.isFinite(freeDiskGB) ? freeDiskGB : null,
          averageDailyGrowthGB: Number.isFinite(averageDailyGrowthGB) ? averageDailyGrowthGB : null,
          criticalThresholdGB,
          estimatedDaysUntilCritical: null,
          forecastTrend: 'UNAVAILABLE',
          note: 'A forecast requires observed free disk space and an observed/configured growth rate.',
        },
        sampledAt: new Date().toISOString(),
      };
    }

    const daysUntilCritical = freeDiskGB > criticalThresholdGB ? Math.round((freeDiskGB - criticalThresholdGB) / averageDailyGrowthGB) : 0;
    return {
      storageForecast: {
        currentFreeDiskGB: freeDiskGB,
        averageDailyGrowthGB,
        criticalThresholdGB,
        estimatedDaysUntilCritical: daysUntilCritical,
        forecastTrend: daysUntilCritical > 90 ? 'Low projected depletion' : daysUntilCritical > 30 ? 'Moderate projected depletion' : daysUntilCritical > 0 ? 'Projected critical threshold' : 'Below critical threshold',
        note: 'Forecast uses supplied measurements and the configured critical threshold; no historical growth is invented.',
      },
      sampledAt: new Date().toISOString(),
    };
  }
}
