/**
 * v10.1 — Telemetry Collector (P1-A backbone)
 *
 * The causal reasoner refuses to invent measurements: it only scores a hypothesis
 * against discriminator keys it was actually given, and records anything missing as
 * INDETERMINATE. That contract is only worth something if the values reaching it are
 * genuinely collected rather than typed into a fixture.
 *
 * This module is the single place where raw system probes become the 14 discriminator
 * keys the reasoner understands. Its three rules:
 *
 *   1. A probe that fails yields NO key at all. It never yields a zero, a default, or
 *      a "looks fine" placeholder. A missing key becomes INDETERMINATE downstream,
 *      which is the honest answer — "we could not evaluate this", never "this is fine".
 *   2. Every value carries an evidence record stating how it was obtained: observed
 *      from a real probe, inferred from an observed aggregate, or unavailable with a
 *      reason. Nothing is silently upgraded to fact.
 *   3. Probes are platform-gated. On a platform where a probe cannot exist, the key is
 *      reported unavailable with the reason, not fabricated.
 */

import os from 'os';
import si from 'systeminformation';
import { observed, inferred, unavailable, summarizeEvidence, EVIDENCE_QUALITY } from '../core/evidence.js';
import { runSafeCommand } from '../helpers/macos-helpers.js';

/** The exact discriminator keys `analyzeCauses()` matches on. Aliases are silently ignored
 *  by the reasoner, so this list is the contract between collection and reasoning. */
export const DISCRIMINATOR_KEYS = [
  'memoryPressurePct',
  'swapUsedGB',
  'pageInsPerSec',
  'topMemoryConsumerGB',
  'diskQueueDepth',
  'diskUtilPct',
  'freeDiskPct',
  'sustainedCpuPct',
  'runQueueLength',
  'thermalPressure',
  'cpuThrottleEvents',
  'launchAgentCount',
  'backgroundCpuPct',
  'mdsCpuPct',
];

const isMac = () => process.platform === 'darwin';

/** Runs a probe and converts any throw into an explicit unavailability, never a default. */
async function attempt(fn, fallbackReason) {
  try {
    const v = await fn();
    return { ok: v !== null && v !== undefined, value: v, reason: v === null || v === undefined ? fallbackReason : null };
  } catch (err) {
    return { ok: false, value: null, reason: err?.message ? `probe failed: ${err.message}` : fallbackReason };
  }
}

const round = (n, dp = 1) => (Number.isFinite(n) ? +n.toFixed(dp) : null);

/* ───────────────────────── individual probes ───────────────────────── */

async function probeMemory() {
  const out = [];
  const mem = await attempt(() => si.mem(), 'systeminformation could not read memory statistics');
  if (!mem.ok) {
    out.push({ key: 'memoryPressurePct', evidence: unavailable('Memory pressure', mem.reason, { key: 'memoryPressurePct' }) });
    out.push({ key: 'swapUsedGB', evidence: unavailable('Swap in use', mem.reason, { key: 'swapUsedGB' }) });
    out.push({ key: 'topMemoryConsumerGB', evidence: unavailable('Largest memory consumer', mem.reason, { key: 'topMemoryConsumerGB' }) });
    return out;
  }
  const m = mem.value;

  // macOS "memory pressure" is not (active/total). The kernel's own figure comes from
  // memory_pressure(1); we only claim the real thing when we actually read it.
  if (isMac()) {
    const raw = await runSafeCommand('/usr/bin/memory_pressure', [], 4000);
    const match = /System-wide memory free percentage:\s*(\d+)%/i.exec(raw || '');
    if (match) {
      const pressure = 100 - Number(match[1]);
      out.push({
        key: 'memoryPressurePct',
        evidence: observed('Memory pressure', pressure, { key: 'memoryPressurePct', unit: '%', source: 'memory_pressure(1)' }),
      });
    } else {
      // The kernel figure was not obtainable. We can still derive a proxy, but it is a
      // derivation from an observed aggregate — it is labelled inferred, not observed.
      const proxy = Math.round(((m.total - m.available) / m.total) * 100);
      out.push({
        key: 'memoryPressurePct',
        evidence: inferred('Memory pressure', proxy, {
          key: 'memoryPressurePct', unit: '%', source: 'derived from si.mem()',
          reason: 'memory_pressure(1) was unreadable; this is a used/total proxy, not the kernel pressure figure',
        }),
      });
    }
  } else {
    const proxy = Math.round(((m.total - m.available) / m.total) * 100);
    out.push({
      key: 'memoryPressurePct',
      evidence: inferred('Memory pressure', proxy, {
        key: 'memoryPressurePct', unit: '%', source: 'derived from si.mem()',
        reason: 'this platform exposes no kernel memory-pressure metric; used/total is a proxy',
      }),
    });
  }

  out.push({
    key: 'swapUsedGB',
    evidence: observed('Swap in use', round((m.swapused || 0) / 1024 ** 3), { key: 'swapUsedGB', unit: 'GB', source: 'si.mem()' }),
  });

  const procs = await attempt(() => si.processes(), 'process table unreadable');
  if (procs.ok && Array.isArray(procs.value?.list) && procs.value.list.length) {
    const top = procs.value.list.slice().sort((a, b) => (b.memRss || 0) - (a.memRss || 0))[0];
    // si reports memRss in KB on most platforms.
    const gb = round((top.memRss || 0) * 1024 / 1024 ** 3, 2);
    out.push({
      key: 'topMemoryConsumerGB',
      evidence: observed('Largest memory consumer', gb, {
        key: 'topMemoryConsumerGB', unit: 'GB', source: 'si.processes()',
      }),
      subject: top.name,
    });
  } else {
    out.push({ key: 'topMemoryConsumerGB', evidence: unavailable('Largest memory consumer', procs.reason || 'process table unreadable', { key: 'topMemoryConsumerGB' }) });
  }

  // Page-in RATE requires two samples over time; a cumulative counter is not a rate.
  // Rather than divide a lifetime total by uptime and call it a rate, report it missing.
  out.push({
    key: 'pageInsPerSec',
    evidence: unavailable('Page-in rate', 'requires two vm_stat samples separated in time; not sampled in a single-shot collection', { key: 'pageInsPerSec' }),
  });

  return out;
}

async function probeDisk() {
  const out = [];
  const fs = await attempt(() => si.fsSize(), 'filesystem table unreadable');
  if (fs.ok && Array.isArray(fs.value) && fs.value.length) {
    const root = fs.value.find((f) => f.mount === '/') || fs.value[0];
    const freePct = round(100 - (root.use ?? 0), 1);
    out.push({ key: 'freeDiskPct', evidence: observed('Free disk space', freePct, { key: 'freeDiskPct', unit: '%', source: 'si.fsSize()' }) });
  } else {
    out.push({ key: 'freeDiskPct', evidence: unavailable('Free disk space', fs.reason || 'filesystem table unreadable', { key: 'freeDiskPct' }) });
  }

  const io = await attempt(() => si.disksIO(), 'disk I/O counters unavailable');
  if (io.ok && Number.isFinite(io.value?.rIO_sec) && io.value.rIO_sec !== null) {
    const util = round(Math.min(100, ((io.value.tIO_sec || 0) / 500) * 100), 1);
    out.push({
      key: 'diskUtilPct',
      evidence: inferred('Disk utilisation', util, {
        key: 'diskUtilPct', unit: '%', source: 'si.disksIO()',
        reason: 'derived from IOPS against a 500 IOPS reference; not a kernel busy-time figure',
      }),
    });
  } else {
    out.push({ key: 'diskUtilPct', evidence: unavailable('Disk utilisation', io.reason || 'disk I/O counters unavailable on this platform', { key: 'diskUtilPct' }) });
  }

  // Queue depth needs iostat sampling. Not guessed.
  out.push({
    key: 'diskQueueDepth',
    evidence: unavailable('Disk queue depth', 'requires sampled iostat output; a single-shot read cannot produce an average queue depth', { key: 'diskQueueDepth' }),
  });
  return out;
}

async function probeCpu() {
  const out = [];
  const load = await attempt(() => si.currentLoad(), 'CPU load unreadable');
  if (load.ok && Number.isFinite(load.value?.currentLoad)) {
    // A single sample is an instantaneous load, not a *sustained* figure. Saying
    // "sustained" of one sample would overstate it, so it is marked inferred with
    // the limitation attached rather than presented as an observed sustained value.
    out.push({
      key: 'sustainedCpuPct',
      evidence: inferred('Sustained CPU', round(load.value.currentLoad, 1), {
        key: 'sustainedCpuPct', unit: '%', source: 'si.currentLoad()',
        reason: 'single instantaneous sample; sustained load requires a window of samples',
      }),
    });
  } else {
    out.push({ key: 'sustainedCpuPct', evidence: unavailable('Sustained CPU', load.reason || 'CPU load unreadable', { key: 'sustainedCpuPct' }) });
  }

  const cores = os.cpus()?.length || 0;
  const la = typeof os.loadavg === 'function' ? os.loadavg()[0] : null;
  if (Number.isFinite(la) && cores > 0 && !(la === 0 && process.platform === 'win32')) {
    out.push({
      key: 'runQueueLength',
      evidence: observed('Run queue length', round(la / cores, 2), {
        key: 'runQueueLength', source: 'os.loadavg() normalised by core count',
      }),
    });
  } else {
    out.push({ key: 'runQueueLength', evidence: unavailable('Run queue length', 'load average is not reported on this platform', { key: 'runQueueLength' }) });
  }
  return out;
}

async function probeThermal() {
  const out = [];
  if (!isMac()) {
    out.push({ key: 'thermalPressure', evidence: unavailable('Thermal pressure', 'pmset is macOS-only; no equivalent probe on this platform', { key: 'thermalPressure' }) });
    out.push({ key: 'cpuThrottleEvents', evidence: unavailable('CPU throttle events', 'CPU_Speed_Limit is macOS-only', { key: 'cpuThrottleEvents' }) });
    return out;
  }
  const raw = await runSafeCommand('/usr/bin/pmset', ['-g', 'therm'], 3000);
  if (!raw) {
    out.push({ key: 'thermalPressure', evidence: unavailable('Thermal pressure', 'pmset -g therm returned no output', { key: 'thermalPressure' }) });
    out.push({ key: 'cpuThrottleEvents', evidence: unavailable('CPU throttle events', 'pmset -g therm returned no output', { key: 'cpuThrottleEvents' }) });
    return out;
  }
  const limit = /CPU_Speed_Limit\s*=\s*(\d+)/i.exec(raw);
  const speedLimit = limit ? Number(limit[1]) : null;
  const pressure = speedLimit === null ? null : speedLimit >= 100 ? 'nominal' : speedLimit >= 75 ? 'fair' : speedLimit >= 50 ? 'serious' : 'critical';
  if (pressure) {
    out.push({ key: 'thermalPressure', evidence: observed('Thermal pressure', pressure, { key: 'thermalPressure', source: 'pmset -g therm (CPU_Speed_Limit)' }) });
    out.push({
      key: 'cpuThrottleEvents',
      evidence: observed('CPU throttle events', speedLimit >= 100 ? 0 : 1, {
        key: 'cpuThrottleEvents', source: 'pmset -g therm',
        reason: speedLimit >= 100 ? null : 'presence of an active speed limit, not a historical event count',
      }),
    });
  } else {
    out.push({ key: 'thermalPressure', evidence: unavailable('Thermal pressure', 'CPU_Speed_Limit not present in pmset output', { key: 'thermalPressure' }) });
    out.push({ key: 'cpuThrottleEvents', evidence: unavailable('CPU throttle events', 'CPU_Speed_Limit not present in pmset output', { key: 'cpuThrottleEvents' }) });
  }
  return out;
}

async function probeBackground() {
  const out = [];
  if (isMac()) {
    const raw = await runSafeCommand('/bin/launchctl', ['list'], 4000);
    const lines = (raw || '').split('\n').filter((l) => l.trim() && !/^PID\s/.test(l));
    if (lines.length) {
      out.push({ key: 'launchAgentCount', evidence: observed('Launch agents', lines.length, { key: 'launchAgentCount', source: 'launchctl list' }) });
    } else {
      out.push({ key: 'launchAgentCount', evidence: unavailable('Launch agents', 'launchctl list produced no readable entries', { key: 'launchAgentCount' }) });
    }
  } else {
    out.push({ key: 'launchAgentCount', evidence: unavailable('Launch agents', 'launchd is macOS-only', { key: 'launchAgentCount' }) });
  }

  const procs = await attempt(() => si.processes(), 'process table unreadable');
  if (procs.ok && Array.isArray(procs.value?.list)) {
    const list = procs.value.list;
    const mds = list.filter((p) => /^mds|mdworker|mds_stores/i.test(p.name || ''));
    if (isMac()) {
      out.push({
        key: 'mdsCpuPct',
        evidence: observed('Spotlight (mds) CPU', round(mds.reduce((s, p) => s + (p.cpu || 0), 0), 1), { key: 'mdsCpuPct', unit: '%', source: 'si.processes()' }),
      });
    } else {
      out.push({ key: 'mdsCpuPct', evidence: unavailable('Spotlight (mds) CPU', 'Spotlight indexing is macOS-only', { key: 'mdsCpuPct' }) });
    }
    // "Background" here means non-foreground-owned CPU. We approximate it as total CPU
    // held by processes outside the top consumer, and label the approximation.
    const sorted = list.slice().sort((a, b) => (b.cpu || 0) - (a.cpu || 0));
    const background = sorted.slice(1).reduce((s, p) => s + (p.cpu || 0), 0);
    out.push({
      key: 'backgroundCpuPct',
      evidence: inferred('Background CPU', round(background, 1), {
        key: 'backgroundCpuPct', unit: '%', source: 'si.processes()',
        reason: 'approximated as CPU held by all processes except the single largest consumer',
      }),
    });
  } else {
    out.push({ key: 'mdsCpuPct', evidence: unavailable('Spotlight (mds) CPU', procs.reason || 'process table unreadable', { key: 'mdsCpuPct' }) });
    out.push({ key: 'backgroundCpuPct', evidence: unavailable('Background CPU', procs.reason || 'process table unreadable', { key: 'backgroundCpuPct' }) });
  }
  return out;
}

/* ───────────────────────── collection ───────────────────────── */

/**
 * Collects the discriminator set from live probes.
 *
 * @returns {Promise<{
 *   schemaVersion: string, platform: string, collectedAt: string,
 *   telemetry: Record<string, any>,   // ONLY keys that were genuinely measured
 *   evidence: Array<object>,          // one record per discriminator, including the missing ones
 *   coverage: object, unavailable: Array<object>, subjects: Record<string,string>
 * }>}
 */
export async function collectTelemetry() {
  const collectedAt = new Date().toISOString();
  const groups = await Promise.all([probeMemory(), probeDisk(), probeCpu(), probeThermal(), probeBackground()]);
  const records = groups.flat();

  const telemetry = {};
  const subjects = {};
  const evidence = [];
  const missing = [];

  for (const r of records) {
    evidence.push(r.evidence);
    if (r.subject) subjects[r.key] = r.subject;
    if (r.evidence.quality === EVIDENCE_QUALITY.UNAVAILABLE || r.evidence.value === null) {
      missing.push({ key: r.key, label: r.evidence.label, reason: r.evidence.reason });
      continue; // deliberately absent — the reasoner will mark it INDETERMINATE
    }
    telemetry[r.key] = r.evidence.value;
  }

  // Any discriminator no probe even attempted is still accounted for.
  for (const key of DISCRIMINATOR_KEYS) {
    if (!(key in telemetry) && !missing.some((m) => m.key === key)) {
      missing.push({ key, label: key, reason: 'no probe is registered for this discriminator' });
      evidence.push(unavailable(key, 'no probe is registered for this discriminator', { key }));
    }
  }

  const measured = Object.keys(telemetry).length;
  const coveragePct = Math.round((measured / DISCRIMINATOR_KEYS.length) * 100);

  return {
    schemaVersion: '10.1',
    platform: process.platform,
    collectedAt,
    telemetry,
    subjects,
    evidence,
    unavailable: missing,
    evidenceQuality: summarizeEvidence(evidence),
    coverage: {
      discriminatorsTotal: DISCRIMINATOR_KEYS.length,
      discriminatorsMeasured: measured,
      coveragePct,
      isComplete: measured === DISCRIMINATOR_KEYS.length,
      // The sentence the UI must print instead of implying a clean bill of health.
      qualifier: measured === DISCRIMINATOR_KEYS.length
        ? null
        : `${DISCRIMINATOR_KEYS.length - measured} of ${DISCRIMINATOR_KEYS.length} diagnostic inputs could not be measured on this system. Causes depending on them are reported as undetermined — they are neither confirmed nor excluded.`,
    },
  };
}
