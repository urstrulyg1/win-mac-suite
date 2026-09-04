/**
 * Windows Assistant — read-only, live telemetry-backed answers.
 * This route exists separately so the platform-specific assistant cannot fall back
 * to a fabricated canned response.
 */
import express from 'express';
import si from 'systeminformation';

const router = express.Router();

function pct(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
}

function buildDiagnosis(query, cpu, memory, disk) {
  const q = query.toLowerCase();
  if (/slow|performance|lag|freeze|hang/.test(q)) {
    const causes = [];
    if (cpu !== null && cpu >= 85) causes.push(`high CPU utilization (${cpu}%)`);
    if (memory !== null && memory >= 85) causes.push(`high memory utilization (${memory}%)`);
    if (disk !== null && disk >= 90) causes.push(`low available disk capacity (${disk}% used)`);
    if (causes.length) {
      return {
        diagnosis: `Live telemetry indicates ${causes.join(' and ')}. These are the observed resource signals most relevant to the reported performance issue.`,
        recommendation: 'Open Performance diagnostics to inspect the active resource consumers before making changes.',
        confidence: 'Observed',
        confidenceScore: 90,
      };
    }
    return {
      diagnosis: 'The current CPU, memory, and disk telemetry does not show a major resource saturation signal. More targeted diagnostics are required to identify the cause.',
      recommendation: 'Open Performance diagnostics for process-level and subsystem checks.',
      confidence: 'Observed',
      confidenceScore: 80,
    };
  }

  if (/disk|storage|space|100%/.test(q)) {
    return {
      diagnosis: disk === null
        ? 'Disk utilization could not be measured by the local telemetry service.'
        : `The root volume is currently ${disk}% used. This is the live filesystem signal available to the suite; it does not by itself identify which files consume the space.`,
      recommendation: 'Open Storage diagnostics to inspect measured filesystem usage and cleanup candidates.',
      confidence: disk === null ? 'Unavailable' : 'Observed',
      confidenceScore: disk === null ? 0 : 95,
    };
  }

  if (/memory|ram/.test(q)) {
    return {
      diagnosis: memory === null
        ? 'Memory utilization could not be measured by the local telemetry service.'
        : `Live telemetry reports memory utilization at ${memory}%.`,
      recommendation: 'Open Performance diagnostics to identify processes contributing to memory pressure.',
      confidence: memory === null ? 'Unavailable' : 'Observed',
      confidenceScore: memory === null ? 0 : 95,
    };
  }

  if (/cpu|processor/.test(q)) {
    return {
      diagnosis: cpu === null
        ? 'CPU utilization could not be measured by the local telemetry service.'
        : `Live telemetry reports CPU utilization at ${cpu}%.`,
      recommendation: 'Open Performance diagnostics to inspect process-level CPU consumers.',
      confidence: cpu === null ? 'Unavailable' : 'Observed',
      confidenceScore: cpu === null ? 0 : 95,
    };
  }

  return {
    diagnosis: 'The assistant collected live Windows resource telemetry, but the current query does not map to a specific supported diagnostic rule. No unsupported root cause is being inferred.',
    recommendation: 'Open Health or Performance diagnostics for a broader evidence-backed investigation.',
    confidence: 'Observed',
    confidenceScore: 70,
  };
}

router.post('/ask-assistant', async (req, res) => {
  if (process.platform !== 'win32') {
    return res.status(400).json({
      error: 'Windows Assistant is only available when the backend is running on Windows.',
    });
  }

  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (!query) return res.status(400).json({ error: 'Query parameter is required.' });

  try {
    const [load, mem, fs] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
    ]);

    const cpu = pct(load.currentLoad);
    const memory = mem.total > 0 ? pct(((mem.total - mem.available) / mem.total) * 100) : null;
    const root = Array.isArray(fs)
      ? fs.find((v) => String(v.mount || '').toLowerCase() === String(process.env.SystemDrive || 'C:').toLowerCase()) || fs[0]
      : null;
    const disk = root && Number.isFinite(root.use) ? pct(root.use) : null;
    const result = buildDiagnosis(query, cpu, memory, disk);

    res.json({
      query,
      topic: 'Windows System Intelligence',
      diagnosis: result.diagnosis,
      evidence: [
        `CPU utilization: ${cpu === null ? 'UNAVAILABLE' : `${cpu}%`}`,
        `Memory utilization: ${memory === null ? 'UNAVAILABLE' : `${memory}%`}`,
        `Disk utilization: ${disk === null ? 'UNAVAILABLE' : `${disk}%`}`,
        'Source: local systeminformation telemetry on the Windows host.',
      ],
      confidence: result.confidence,
      confidenceScore: result.confidenceScore,
      suggestedAction: {
        label: result.recommendation,
        tabTarget: /performance/i.test(result.recommendation) ? 'performance' : 'diagnostics',
      },
      timestamp: new Date().toISOString(),
      measurement: 'observed',
    });
  } catch (err) {
    res.status(500).json({
      error: 'Windows telemetry collection failed.',
      detail: err?.message || 'Unknown telemetry error',
      measurement: 'unavailable',
    });
  }
});

export default router;
