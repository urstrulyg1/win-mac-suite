/**
 * WinSuite & MacSuite v8.0 - Multi-Baseline Engine & Predictive Forecaster
 * Evaluates multi-period baselines and computes predictive storage & battery trends.
 */

import si from 'systeminformation';
import os from 'os';
import path from 'path';
import fs from 'fs';

export class BaselineForecaster {
  /**
   * Returns a real-time snapshot comparison.
   * Since we have no persistent baseline store, all values are sampled live
   * and labeled as "current" with an honest note about what a stored baseline
   * would provide. No fabricated historical data.
   *
   * @param {'firstRun' | '7day' | '30day' | 'developer'} profile
   */
  static async getBaselineComparison(profile = '7day') {
    const [mem, fsSize, batt] = await Promise.all([
      si.mem(),
      si.fsSize(),
      si.battery().catch(() => ({ hasBattery: false })),
    ]);

    const primary = Array.isArray(fsSize)
      ? fsSize.find(f => f.mount === '/System/Volumes/Data' || f.mount === '/') || fsSize[0]
      : null;

    const storageUsedGB = primary ? Math.round(primary.used / 1024 / 1024 / 1024) : 0;
    const freeDiskGB = primary ? +((primary.size - primary.used) / 1024 / 1024 / 1024).toFixed(1) : 0;
    const ramActiveGB = +(mem.active / 1024 / 1024 / 1024).toFixed(2);
    const ramTotalGB = Math.round(mem.total / 1024 / 1024 / 1024);
    const battHealthPct = batt.hasBattery && batt.maxCapacity && batt.designedCapacity
      ? Math.round((batt.maxCapacity / batt.designedCapacity) * 100)
      : null;

    // Count real startup items
    const launchAgentDir = path.join(os.homedir(), 'Library/LaunchAgents');
    let startupItemsCount = 0;
    if (fs.existsSync(launchAgentDir)) {
      try { startupItemsCount = fs.readdirSync(launchAgentDir).filter(f => f.endsWith('.plist')).length; } catch {}
    }

    const profileNames = {
      firstRun: 'First-Run Baseline',
      '7day': '7-Day Rolling Baseline',
      '30day': '30-Day Baseline',
      developer: 'Developer Toolchain Baseline',
    };

    const metrics = [
      {
        name: 'Storage Used',
        current: `${storageUsedGB} GB`,
        freeDiskGB,
        severity: freeDiskGB < 10 ? 'critical' : freeDiskGB < 20 ? 'warning' : 'nominal',
        note: `${freeDiskGB} GB free`,
      },
      {
        name: 'RAM Active Usage',
        current: `${ramActiveGB} GB / ${ramTotalGB} GB`,
        severity: ramActiveGB / ramTotalGB > 0.9 ? 'critical' : ramActiveGB / ramTotalGB > 0.75 ? 'warning' : 'nominal',
        note: `${Math.round((ramActiveGB / ramTotalGB) * 100)}% active`,
      },
      {
        name: 'Startup Background Items',
        current: `${startupItemsCount} LaunchAgent(s)`,
        severity: startupItemsCount > 10 ? 'warning' : 'nominal',
        note: 'Counted from ~/Library/LaunchAgents',
      },
      ...(battHealthPct !== null ? [{
        name: 'Battery Health Condition',
        current: `${battHealthPct}%`,
        severity: battHealthPct < 80 ? 'warning' : 'nominal',
        note: battHealthPct < 80 ? 'Battery degraded — consider service' : 'Battery health nominal',
      }] : []),
    ];

    return {
      profileRequested: profile,
      profileName: profileNames[profile] || profile,
      availableProfiles: Object.entries(profileNames).map(([id, name]) => ({ id, name })),
      note: 'No persistent baseline store exists yet — all values are live snapshots. Run this endpoint periodically and store results to build a real baseline.',
      metrics,
      sampledAt: new Date().toISOString(),
    };
  }

  /**
   * Computes predictive storage forecast from real free disk space.
   */
  static getForecast(freeDiskGB = 0, averageDailyGrowthGB = 1.4) {
    const criticalThresholdGB = 15;
    const daysUntilCritical = freeDiskGB > criticalThresholdGB
      ? Math.round((freeDiskGB - criticalThresholdGB) / Math.max(averageDailyGrowthGB, 0.1))
      : 0;

    return {
      storageForecast: {
        currentFreeDiskGB: freeDiskGB,
        averageDailyGrowthGB,
        criticalThresholdGB,
        estimatedDaysUntilCritical: daysUntilCritical,
        forecastTrend: daysUntilCritical > 90
          ? 'Healthy (>90 days)'
          : daysUntilCritical > 30
            ? 'Moderate Depletion'
            : daysUntilCritical > 0
              ? 'Critical Warning — reclaim space soon'
              : 'Already below critical threshold',
        note: 'Growth rate is a configurable estimate. Provide actual measured growth for higher-confidence forecasting.',
      },
      sampledAt: new Date().toISOString(),
    };
  }
}
