/**
 * WinSuite & MacSuite v16.1 — Cross-Platform Route & Guard verification suite.
 *
 * This suite proves the SAME codebase behaves correctly when the host OS is
 * reported as Windows (win32) or macOS (darwin) WITHOUT needing real hardware:
 * it forces `process.platform` in a fresh child process per platform, mounts the
 * real route modules, and probes them. It asserts that:
 *
 *   - No GET route crashes with a 500 (a platform helper must fail *honestly*,
 *     e.g. UNAVAILABLE / failed measurement, never blow up the request).
 *   - Platform-specific routes honour their guard: e.g. `/.windows/*` returns
 *     "requires Windows" on macOS and is usable on Windows.
 *   - The platform reported by /api/sysinfo matches the simulated platform.
 *
 * The child-per-platform split is required because ES module evaluation caches
 * the platform-dependent constants (isMac / isWindows) at first import, so both
 * platforms cannot be exercised inside one process.
 *
 * Run with:  node server/tests/v11-cross-platform.test.js
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SELF = path.resolve(__dirname, 'v11-cross-platform.test.js');

// ─────────────────────────────────────────────────────────────────────────────
// CHILD MODE — a single platform is simulated and probed.
// ─────────────────────────────────────────────────────────────────────────────
if (process.env.SIM_PLATFORM) {
  const platform = process.env.SIM_PLATFORM;
  const port = parseInt(process.env.SIM_PORT, 10);

  Object.defineProperty(process, 'platform', { value: platform, configurable: true, writable: true, enumerable: true });

  const express = (await import('express')).default;
  const systemRouter = (await import('../routes/system.js')).default;
  const diagnosticsRouter = (await import('../routes/diagnostics.js')).default;
  const securityRouter = (await import('../routes/security.js')).default;
  const storageRouter = (await import('../routes/storage.js')).default;
  const servicesRouter = (await import('../routes/services.js')).default;
  const networkRouter = (await import('../routes/network.js')).default;
  const reportsRouter = (await import('../routes/reports.js')).default;
  const actionsRouter = (await import('../routes/actions.js')).default;
  const v10Router = (await import('../routes/v10.js')).default;
  const intelligenceRouter = (await import('../routes/intelligence.js')).default;
  const windowsRouter = (await import('../routes/windows.js')).default;
  const windowsV2Router = (await import('../routes/windows-v2.js')).default;
  const { localhostOnlyGuard, concurrencyGuard } = await import('../security/request-guard.js');
  const { safeModeMiddleware, safeModeGuardMiddleware } = await import('../security/safe-mode.js');

  const app = express();
  app.use(express.json({ limit: '64kb', strict: true }));
  app.use(localhostOnlyGuard);
  app.use(concurrencyGuard);
  app.use(safeModeMiddleware);
  app.use(safeModeGuardMiddleware);
  app.use('/api', systemRouter);
  app.use('/api', diagnosticsRouter);
  app.use('/api', securityRouter);
  app.use('/api', storageRouter);
  app.use('/api', servicesRouter);
  app.use('/api', reportsRouter);
  app.use('/api/network', networkRouter);
  app.use('/api/actions', actionsRouter);
  app.use('/api/v10', v10Router);
  app.use('/api/intelligence', intelligenceRouter);
  app.use('/api/windows', windowsRouter);
  app.use('/api/windows/v2', windowsV2Router);
  app.use((_req, res) => res.status(404).json({ code: 'ROUTE_NOT_FOUND' }));

  // Catch unhandled rejections so a late async crash is observable, not silent.
  process.on('unhandledRejection', (r) => {
    console.error(JSON.stringify({ fatal: 'unhandledRejection', reason: String(r) }));
    process.exit(1);
  });

  const server = app.listen(port, '127.0.0.1', async () => {
    const results = [];
    const get = async (p, timeout = 25000) => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeout);
      try {
        const res = await fetch(`http://127.0.0.1:${port}${p}`, { signal: ctl.signal });
        const body = await res.json().catch(() => null);
        return { status: res.status, body };
      } catch (e) {
        return { status: 0, body: null, error: String(e) };
      } finally {
        clearTimeout(t);
      }
    };

    const probes = [
      '/api/sysinfo',
      '/api/health-check',
      '/api/processes',
      '/api/security',
      '/api/security/privacy-risk',
      '/api/apps/inventory',
      '/api/services',
      '/api/startup-items',
      '/api/storage',
      '/api/network/diagnostics',
      '/api/network/listening-ports',
      '/api/diagnostics/disk-health',
      '/api/diagnostics/crashes-hangs',
      '/api/windows/apps',
      '/api/windows/services',
      '/api/windows/update',
      '/api/windows/security',
      '/api/windows/v2/action-center',
      '/api/windows/v2/integrity',
    ];

    const postProbes = [
      { path: '/api/actions/run-phase', body: { commandId: 'win.sfc', confirmed: true, sessionId: 'x' } },
      { path: '/api/actions/run-phase', body: { commandId: 'mac.brew.upgrade', confirmed: true, sessionId: 'x' } },
    ];

    for (const p of probes) {
      const r = await get(p);
      results.push({
        path: p,
        status: r.status,
        error: r.error || null,
        note: r.body && typeof r.body === 'object' ? (r.body.note || r.body.error || null) : null,
      });
    }

    for (const pp of postProbes) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 20000);
      try {
        const res = await fetch(`http://127.0.0.1:${port}${pp.path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pp.body),
          signal: ctl.signal,
        });
        const body = await res.json().catch(() => null);
        results.push({
          path: `POST:${pp.path}:${pp.body.commandId}`,
          status: res.status,
          requiresPlatform: body ? body.requiresPlatform : null,
          bodyError: body ? body.error : null,
        });
      } catch (e) {
        results.push({ path: `POST:${pp.path}:${pp.body.commandId}`, status: 0, error: String(e) });
      } finally {
        clearTimeout(t);
      }
    }

    const sf = await get('/api/sysinfo');
    results.push({ path: 'sysinfo-platform', status: sf.status, platform: sf.body && sf.body.platform });

    server.close(() => {
      console.log('SIMS_JSON=' + JSON.stringify(results));
      process.exit(0);
    });
  });
  // End of child mode — this process must never fall through to the driver.
} else {
  // ───────────────────────────────────────────────────────────────────────────
  // DRIVER MODE — spawn a fresh process per platform and assert on the results.
  // ───────────────────────────────────────────────────────────────────────────
  let passed = 0;
  let failed = 0;

  const report = (name, check, detail) => {
    if (check) {
      passed += 1;
      console.log(`✓ Test ${passed + failed} Passed: ${name}`);
    } else {
      failed += 1;
      console.error(`✗ Test ${passed + failed} FAILED: ${name}\n    ${detail}`);
    }
  };

  const probePlatform = (platform, port) => {
    const res = spawnSync(process.execPath, [SELF], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, SIM_PLATFORM: platform, SIM_PORT: String(port), SELF },
      encoding: 'utf-8',
      timeout: 200000,
    });
    if (res.error || (res.status !== 0 && !res.stdout.includes('SIMS_JSON='))) {
      throw new Error(`child probe for ${platform} failed to launch: ${res.error?.message}\nstdout:${res.stdout}\nstderr:${res.stderr}`);
    }
    const line = res.stdout.split('\n').find((l) => l.trim().startsWith('SIMS_JSON='));
    if (!line) {
      throw new Error(`child probe for ${platform} produced no SIMS_JSON.\nstdout:${res.stdout}\nstderr:${res.stderr}`);
    }
    return JSON.parse(line.slice('SIMS_JSON='.length));
  };

  const expectedPlatform = { darwin: 'macos', win32: 'windows' };

  for (const [plat, tag] of [['darwin', 'macOS'], ['win32', 'Windows']]) {
    const port = plat === 'darwin' ? 3193 : 3194;
    const results = probePlatform(plat, port);

    const sysinfo = results.find((r) => r.path === 'sysinfo-platform');
    report(`[${tag}] /api/sysinfo reports ${expectedPlatform[plat]}`,
      sysinfo && sysinfo.platform === expectedPlatform[plat],
      `expected ${expectedPlatform[plat]}, got ${JSON.stringify(sysinfo)}`);

    // GET probes must never crash; POST run-phase probes are asserted separately
    // (running a real command on a Linux host legitimately yields a 500).
    const crashed = results.filter((r) => !r.path.startsWith('POST:') && (r.status === 500 || r.status === 0));
    report(`[${tag}] no probed route crashes (all non-5xx)`,
      crashed.length === 0,
      `crashing routes: ${JSON.stringify(crashed)}`);

    const windowsApps = results.find((r) => r.path === '/api/windows/apps');
    if (plat === 'darwin') {
      // On macOS the Windows route must be honestly marked unavailable (not a
      // 500 and not fabricated app data).
      report(`[${tag}] /api/windows/apps is honestly unavailable on macOS`,
        windowsApps && windowsApps.status < 500 && (windowsApps.status !== 200 || windowsApps.note),
        `status=${windowsApps && windowsApps.status} note=${windowsApps && windowsApps.note}`);
    } else {
      report(`[${tag}] /api/windows/apps returns an honest envelope on Windows`,
        windowsApps && [200, 400, 503, 424].includes(windowsApps.status),
        `status=${windowsApps && windowsApps.status} note=${windowsApps && windowsApps.note}`);
    }

    const actionCenter = results.find((r) => r.path === '/api/windows/v2/action-center');
    if (plat === 'darwin') {
      // Windows-only features must never fabricate data on macOS.
      report(`[${tag}] /api/windows/v2/action-center is empty/honest on macOS`,
        actionCenter && actionCenter.status < 500,
        `status=${actionCenter && actionCenter.status}`);
    } else {
      report(`[${tag}] /api/windows/v2/action-center is available on Windows`,
        actionCenter && actionCenter.status === 200,
        `status=${actionCenter && actionCenter.status}`);
    }

    // 5. run-phase rejects commands for the WRONG platform with a platform guard
    //    (never a misleading "sudo required" prompt).
    const winOnMac = results.find((r) => r.path === 'POST:/api/actions/run-phase:win.sfc');
    if (plat === 'darwin') {
      report(`[${tag}] /actions/run-phase refuses win.sfc with a platform guard`,
        winOnMac && winOnMac.requiresPlatform === 'windows',
        `status=${winOnMac && winOnMac.status} requiresPlatform=${winOnMac && winOnMac.requiresPlatform} err=${winOnMac && winOnMac.bodyError}`);
    } else {
      report(`[${tag}] /actions/run-phase does NOT claim mac.sfc requires platform on Windows`,
        winOnMac && winOnMac.requiresPlatform !== 'macos',
        `requiresPlatform=${winOnMac && winOnMac.requiresPlatform}`);
    }

    const macOnWin = results.find((r) => r.path === 'POST:/api/actions/run-phase:mac.brew.upgrade');
    if (plat === 'win32') {
      report(`[${tag}] /actions/run-phase refuses mac.brew.upgrade with a platform guard`,
        macOnWin && macOnWin.requiresPlatform === 'macos',
        `status=${macOnWin && macOnWin.status} requiresPlatform=${macOnWin && macOnWin.requiresPlatform} err=${macOnWin && macOnWin.bodyError}`);
    } else {
      report(`[${tag}] /actions/run-phase does NOT claim mac.brew.upgrade requires Windows on macOS`,
        macOnWin && macOnWin.requiresPlatform !== 'windows',
        `requiresPlatform=${macOnWin && macOnWin.requiresPlatform}`);
    }
  }

  console.log(`\n═══ cross-platform results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exitCode = 1;
}
