/**
 * WinSuite local telemetry server
 * Reads real system info via `systeminformation` and exposes it on
 * http://localhost:3131/api/sysinfo  (polled every 3 s by the UI)
 *
 * Run:  node server.js   (or  npm run server)
 */

import si from 'systeminformation';
import express from 'express';
import cors from 'cors';
import os from 'os';

const PORT = 3131;
const app = express();
app.use(cors());

// ── helpers ─────────────────────────────────────────────────────────────────
function fmtUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} day${d !== 1 ? 's' : ''}, ${h} hour${h !== 1 ? 's' : ''}`;
  if (h > 0) return `${h} hour${h !== 1 ? 's' : ''}, ${m} min`;
  return `${m} min`;
}

function toGB(bytes) {
  return Math.round((bytes / 1073741824) * 10) / 10;   // 1 GiB
}

// ── one-time static data (fetched on startup) ───────────────────────────────
let staticInfo = null;

async function loadStatic() {
  const [cpu, mem, osInfo, osData, disk, system] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.osInfo(),
    si.osInfo(),
    si.fsSize(),
    si.system(),
  ]);

  // pick the largest disk (usually the boot drive)
  const mainDisk = disk
    .filter(d => d.size > 0)
    .sort((a, b) => b.size - a.size)[0] || { size: 0, used: 0 };

  staticInfo = {
    hostName:   os.hostname(),
    user:       os.userInfo().username,
    os:         `${osInfo.distro} ${osInfo.release}`,
    build:      osInfo.build || osData.kernel || '',
    processor:  `${cpu.manufacturer} ${cpu.brand}`,
    ramGB:      toGB(mem.total),
    totalDiskGB: toGB(mainDisk.size),
    model:      system.model || '',
  };
}

await loadStatic();

// ── live endpoint – called every ~3 s by the browser ────────────────────────
app.get('/api/sysinfo', async (_req, res) => {
  try {
    const [cpuLoad, mem, disk, net] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
    ]);

    const mainDisk = disk
      .filter(d => d.size > 0)
      .sort((a, b) => b.size - a.size)[0] || { size: 0, used: 0 };

    const freeDiskGB  = toGB(mainDisk.size - mainDisk.used);
    const cpuUsage    = Math.round(cpuLoad.currentLoad);
    const memUsage    = Math.round((mem.active / mem.total) * 100);
    const isOnline    = net.some(n => n.operstate === 'up');
    const uptimeSec   = os.uptime();

    res.json({
      ...staticInfo,
      freeDiskGB,
      cpuUsage,
      memoryUsage: memUsage,
      isOnline,
      uptime: fmtUptime(uptimeSec),
    });
  } catch (err) {
    console.error('sysinfo error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅  WinSuite telemetry server listening on http://127.0.0.1:${PORT}`);
  console.log(`    Serving real system data for: ${os.hostname()}`);
});
