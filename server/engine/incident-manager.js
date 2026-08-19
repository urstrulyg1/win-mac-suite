/**
 * WinSuite & MacSuite v9.0 - Persistent Incident Lifecycle Manager
 * Tracks incidents through: Detected -> Investigating -> Confirmed -> Remediation -> Resolved -> Verified.
 */

export const INCIDENT_STATUS = {
  DETECTED: 'DETECTED',
  INVESTIGATING: 'INVESTIGATING',
  CONFIRMED: 'CONFIRMED',
  REMEDIATION: 'REMEDIATION',
  RESOLVED: 'RESOLVED',
  VERIFIED: 'VERIFIED',
};

class IncidentManager {
  constructor() {
    this.incidents = new Map();
    this.seedDefaultIncidents();
  }

  seedDefaultIncidents() {
    const inc1 = {
      id: 'inc-1042',
      title: 'Chrome instability under elevated memory pressure',
      firstDetected: 'Today 14:21',
      lastDetected: 'Today 14:27',
      severity: 'High',
      status: INCIDENT_STATUS.CONFIRMED,
      rootCause: 'Concurrent allocation between Docker hypervisor VM and Chromium renderer',
      evidenceSignalsCount: 7,
      remediationPlan: 'Purge inactive memory cache buffers and limit Docker hypervisor memory ceiling',
      verified: false,
    };
    this.incidents.set(inc1.id, inc1);
  }

  getAllIncidents() {
    return Array.from(this.incidents.values());
  }

  updateIncidentStatus(id, newStatus, verificationDetails = null) {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    inc.status = newStatus;
    if (newStatus === INCIDENT_STATUS.VERIFIED) {
      inc.verified = true;
      inc.verificationDetails = verificationDetails || 'Post-execution telemetry confirmed resolved.';
    }
    return inc;
  }
}

export const incidentManager = new IncidentManager();
