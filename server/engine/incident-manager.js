/**
 * WinSuite & MacSuite — Persistent Incident Lifecycle Manager
 * Tracks incidents through: Detected -> Investigating -> Confirmed -> Remediation -> Resolved -> Verified.
 *
 * Truthfulness rule: no incidents are seeded. An incident exists only after it
 * is recorded from observed telemetry via recordIncident(). An empty store
 * means "no incidents observed", not "no incidents exist".
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
  }

  recordIncident(incident) {
    if (!incident || typeof incident.id !== 'string') return null;
    const entry = {
      ...incident,
      firstDetected: incident.firstDetected ?? new Date().toISOString(),
      lastDetected: incident.lastDetected ?? new Date().toISOString(),
      verified: false,
    };
    this.incidents.set(entry.id, entry);
    return entry;
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
      inc.verificationDetails = verificationDetails ?? 'UNAVAILABLE: no verification measurements supplied.';
    }
    return inc;
  }
}

export const incidentManager = new IncidentManager();
