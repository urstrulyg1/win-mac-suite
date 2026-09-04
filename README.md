# WinSuite & MacSuite

> **Cross-platform system maintenance, diagnostics, and optimization suite for Windows and macOS.**

**Version:** 16.1.1  
**Status:** CONDITIONALLY PRODUCTION READY — native Windows/macOS validation is still required  
**Last Updated:** 2026-09-04

---

## Overview

WinSuite & MacSuite is a trust-first local system management suite for Windows and macOS. It combines system telemetry, diagnostics, maintenance, security controls, storage analysis, network diagnostics, developer tooling, reporting, and evidence-based intelligence behind a common UI and backend.

The central rule is:

> **IF YOU KNOW IT, PROVE IT. IF YOU DON'T KNOW IT, SAY SO. IF YOU CHANGE IT, VERIFY IT.**

The application is intentionally fail-closed around system state. It does **not** invent telemetry, scores, reclaim amounts, process lists, versions, temperatures, health states, or capability claims when the underlying system cannot be observed.

---

## Core Principles

1. **REAL DATA ONLY** — Runtime machine state must come from actual OS APIs, filesystem inspection, or command execution.
2. **NO FABRICATED TELEMETRY** — No fake CPU/RAM/disk/temperature/security values or synthetic machine state in production code.
3. **UNKNOWN STAYS UNKNOWN** — Missing observations are represented as `null`, `UNAVAILABLE`, `UNKNOWN`, `NOT_MEASURED`, `NOT_CHECKED`, `UNSUPPORTED`, or `PERMISSION_REQUIRED` as appropriate.
4. **NULL IS NOT ZERO** — An unmeasured value is never silently converted into a measured zero.
5. **EMPTY IS NOT UNAVAILABLE** — An observed empty result is different from a probe that could not run.
6. **REAL EXECUTION** — Maintenance mutations execute through the backend command/action layer rather than simulated progress or fake logs.
7. **REAL VERIFICATION** — Mutations use before/after state and runtime evidence where verification is supported.
8. **FAIL CLOSED** — A subsystem cannot be reported as healthy merely because no error was observed.
9. **RUNTIME CAPABILITIES** — Static feature definitions describe what the application supports; they are not treated as proof that a host currently supports a capability.
10. **SECURITY BY DEFAULT** — Mutating operations use Safe Mode, validation, allowlists, confirmation, protected paths, and audit logging.

---

## Runtime Truth & Evidence Model

The current implementation contains a repository-wide truthfulness hardening layer.

### What changed

- Removed production fixtures containing fabricated machine telemetry.
- Removed fabricated Windows and macOS phase results, logs, reclaim amounts, versions, temperatures, health states, and battery values from platform configuration.
- Frontend system telemetry now starts as unknown instead of using placeholder host, user, OS, CPU, RAM, disk, connectivity, or utilization values.
- Runtime polling only accepts values of the expected type from `/api/sysinfo`; missing values remain unknown.
- Removed UI logic that artificially adds reclaimed space to current free disk space.
- Maintenance completion is only presented as a success when all expected sections actually pass; otherwise the UI reports warnings/errors.
- Health contracts no longer allow `HEALTHY` to be inferred from configuration or an empty evidence set.
- Health aggregation does not treat `INFORMATIONAL` as a measured healthy state.
- Health scores return `null` when there is insufficient runtime evidence.
- Evidence defaults to `UNAVAILABLE`; confidence is not fabricated when evidence is absent.
- Degraded-mode probes no longer return caller-provided fallback telemetry after a failed probe.
- Runtime permission state is no longer optimistically granted. Unknown permissions remain unknown until observed.
- Platform capabilities are probed at runtime rather than assumed from static configuration.
- `/api/v10/capabilities-matrix` reports `NOT_CHECKED` with empty evidence until an actual capability probe is executed by that endpoint.
- Correlation and baseline logic no longer invents CPU, memory, disk growth, process, incident, or other telemetry when observations are missing.
- Unsupported platforms are represented explicitly instead of silently falling back to Windows or macOS behavior.

### Truthful UI states

| State | Meaning |
|---|---|
| `OBSERVED` | A runtime probe produced the value and its source is known. |
| `UNAVAILABLE` | The requested observation could not be collected. |
| `NOT_MEASURED` | The feature is known, but the requested measurement was not performed. |
| `NOT_CHECKED` | Capability/support has not been probed for this request. |
| `UNKNOWN` | The system cannot currently determine the value. |
| `UNSUPPORTED` | The current platform does not provide the feature. |
| `PERMISSION_REQUIRED` | A required OS permission prevents observation. |
| `INFORMATIONAL` | Information is available, but it is not a health observation. |

### Important rule

A static configuration value such as a phase title, expected command, risk level, supported platform, or target tool is **metadata**, not runtime evidence.

---

## Quick Start

### Requirements

- Node.js 18+ (LTS recommended)
- npm 9+
- Windows or macOS for platform-specific functionality
- Linux can be used for development and cross-platform testing where supported

### Install and run

```bash
npm install
npm start
```

The default services are:

- Backend: `127.0.0.1:3131`
- Vite frontend: `5173` during development

### Development commands

```bash
npm run dev
npm run server
npm start
npm run build
npm test
```

---

## Architecture

```text
src/
├── App.tsx                         # Main application shell and runtime telemetry polling
├── components/                    # React UI and platform-specific hubs
├── maintenance/
│   ├── planner.ts                 # Maintenance plan construction
│   ├── executor.ts                # Real backend command execution
│   └── verifier.ts                # Evidence-based verification
├── platform/
│   ├── detector.ts                # Runtime platform detection
│   ├── capabilities.ts            # Capability definitions/runtime handling
│   ├── macos.ts                   # macOS metadata/configuration
│   └── windows.ts                 # Windows metadata/configuration
└── utils/api.ts                   # Frontend API client

server/
├── routes/                        # Express API routes
├── helpers/                       # Windows/macOS OS probes
├── core/
│   ├── contract.js               # Health/report contract enforcement
│   ├── evidence.js               # Runtime evidence quality
│   ├── permissions.js             # Permission state and feature availability
│   └── calibration.js             # Prediction calibration
├── runtime/
│   ├── operation-executor.js      # Protected mutation execution lifecycle
│   ├── degraded-mode.js           # Explicit degraded/offline behavior
│   └── operations.js              # Operation registry
├── security/                      # Safe Mode, allowlists, validation, protected paths
├── engine/                        # Correlation, baseline, recommendation, experiments
├── intelligence/                  # Causal and incident intelligence
├── audit/                         # Audit trail and transactions
└── db/                            # Local SQLite persistence
```

---

## Main Features

### Cross-platform

- System information and live telemetry
- Process monitoring
- Health and diagnostics
- Storage analysis
- Network diagnostics
- Developer environment inspection
- Security and privacy inspection
- Maintenance planning and execution
- Reports and audit history
- Safe Mode
- Evidence and contract enforcement
- Causal/correlation intelligence
- Global search and command palette

### Windows

The Windows Management Center provides system, application, driver, service, startup, task, update, storage, network, security, recovery, hardware, power, WSL, Docker, and developer tooling.

Major Windows data sources include:

- PowerShell/CIM/WMI
- `Win32_Service`
- `Win32_Process`
- `Win32_PnPSignedDriver`
- `Win32_LogicalDisk`
- `Get-WinEvent`
- Windows Update COM APIs
- Defender/security APIs
- `Get-NetTCPConnection`
- `Get-NetFirewallRule`
- `Get-PhysicalDisk`
- `Get-ScheduledTask`
- `wsl`
- `winget`
- Docker CLI where installed

### macOS

macOS diagnostics include system, performance, battery, storage, network, security/privacy, Apple services, crash/hang, startup, developer, virtualization, browser, display, peripheral, audio, camera/microphone, Spotlight, Time Machine, and software-update diagnostics.

Major data sources include:

- `systeminformation`
- `system_profiler`
- `diskutil`
- `df` / `du`
- `tmutil`
- `pmset`
- `powermetrics`
- `sysctl`
- `log show`
- `lsof`
- `mdutil` / `mdfind`
- `softwareupdate`
- `launchctl`
- `defaults`
- `xattr`
- `xcrun`
- Homebrew and Docker CLI where installed

---

## Maintenance Pipeline

Maintenance is designed as a real execution lifecycle rather than a UI simulation:

1. **Scan** — inspect actual system state
2. **Plan** — generate actions from observed data
3. **Preview** — show the user what was actually found
4. **Confirm** — require explicit confirmation for mutations
5. **Snapshot** — capture pre-action state where supported
6. **Execute** — invoke an allowlisted backend command/action
7. **Verify** — compare actual post-action state where supported
8. **Record** — persist runtime evidence and audit information
9. **Report** — expose observed results and failures
10. **Undo** — use transaction/rollback support where available

If a reclaim amount cannot be measured, the application does **not** display a guessed number.

---

## Security Model

Mutations are protected by multiple controls, including:

- Localhost-only backend binding
- Request validation
- Safe Mode enforcement
- Route-level mutation checks
- Strict boolean confirmation
- Command and action allowlists
- `execFile`/argument-based execution where applicable
- PowerShell non-interactive execution
- Command timeouts and output limits
- Protected-path checks
- Path traversal and symlink/TOCTOU protections
- Critical Windows service protection
- Audit logging
- Post-action verification
- Sensitive-output redaction

### Safe Mode

Safe Mode is enforced in the backend. It is not merely a UI switch. Mutating endpoints are expected to reject operations while Safe Mode is active, including Windows mutation routes and cross-platform action routes.

---

## API Highlights

### System

```text
GET /api/sysinfo
GET /api/capabilities
GET /api/permissions
GET /api/health
GET /api/health-score
```

`/api/sysinfo` reports actual host/system telemetry. Missing observations are returned as unavailable rather than substituted with placeholders.

### Diagnostics

```text
GET /api/health-check
GET /api/processes
GET /api/performance/diagnosis
GET /api/thermal
GET /api/thermal/deep
GET /api/battery
GET /api/battery/intelligence
GET /api/hardware
GET /api/event-logs
```

### Storage and network

```text
GET /api/storage
GET /api/network/diagnostics
GET /api/network/doctor
GET /api/network/listening-ports
GET /api/network/wifi-intelligence
```

### v10 trust/runtime APIs

```text
GET /api/v10/health
GET /api/v10/permissions/matrix
GET /api/v10/permissions/scenarios
GET /api/v10/runtime/status
GET /api/v10/operations
GET /api/v10/calibration
GET /api/v10/contracts/schemas
GET /api/v10/capabilities-matrix
GET /api/v10/evidence/quality-demo
```

The v10 capability matrix is intentionally fail-closed: this endpoint does not claim a capability is available unless it actually probes it during the request.

### Mutations

Representative mutation endpoints include:

```text
POST /api/actions/run-phase
POST /api/actions/cleanup-plan
POST /api/actions/execute-cleanup
POST /api/actions/undo-cleanup
POST /api/actions/kill-port
POST /api/actions/toggle-startup
POST /api/windows/apps/update
POST /api/windows/apps/uninstall
POST /api/windows/services/action
POST /api/windows/v2/cleanup/execute
POST /api/windows/v2/integrity/sfc
POST /api/windows/v2/integrity/dism
```

All destructive or state-changing operations are expected to use the backend security lifecycle and explicit confirmation where required.

---

## Testing

The test command includes the repository's safety, trust, platform, intelligence, and truthfulness regression suites.

Important suites include:

| Suite | Purpose |
|---|---|
| `v8-safety-and-correlation` | Safety policy, correlation, and baseline behavior |
| `v9-comprehensive-suite` | Allowlist, knowledge graph, and experiment behavior |
| `v10-validation-and-trust` | Permissions, evidence, calibration, chaos, and contracts |
| `v10-path-security` | Traversal, symlink, and TOCTOU protections |
| `v10-intelligence` | Causal reasoning, incidents, and experiments |
| `v10-production-audit` | Production zero-fabrication regression checks |
| `v11-platform-bugs` | Cross-platform regression coverage |
| `v11-cross-platform` | Real route modules under simulated platform environments |
| `v16-truth-contract` | Truth-contract regression checks |
| `v17-repository-truth` | Repository-wide scan for known fabricated production telemetry patterns |

### Truthfulness regression coverage

`v17-repository-truth` verifies important invariants such as:

- no deleted production fixture directory is referenced
- no known fabricated telemetry patterns remain in production `src`/`server` code
- App initial telemetry is unknown rather than fabricated
- health defaults fail closed
- permission state is not optimistic
- system capabilities are runtime probes
- v10 capability matrix is `NOT_CHECKED` with empty evidence
- degraded probes do not return fallback telemetry

This suite is a regression detector, not a mathematical proof that arbitrary future code can never contain fabricated data. New features must therefore follow the same evidence-first rules.

---

## Native Cross-Platform Validation

The repository contains a native GitHub Actions workflow at:

```text
.github/workflows/cross-platform-native.yml
```

It validates the built application and native smoke endpoints on:

- `windows-2025`
- `macos-13`
- `macos-15`

The native smoke checks exercise real platform runners and endpoints including `/api/health`, `/api/sysinfo`, `/api/capabilities`, `/api/permissions`, `/api/health-score`, and `/api/v10/capabilities-matrix`.

**Current validation state:** the latest run triggered from commit `53600689f44aa8915784ec6c9c8c627d6fed1823` was still queued when this README was updated. Therefore native validation must not be represented as passed until GitHub Actions reports a successful conclusion.

---

## Platform Support

| Capability | Windows | macOS | Linux |
|---|:---:|:---:|:---:|
| Core system telemetry | ✅ | ✅ | Development support |
| Process monitoring | ✅ | ✅ | Development support |
| Storage analysis | ✅ | ✅ | Partial |
| Network diagnostics | ✅ | ✅ | Partial/feature-dependent |
| Security diagnostics | ✅ | ✅ | Limited |
| Platform-specific maintenance | ✅ | ✅ | ❌ |
| Safe Mode | ✅ | ✅ | Development support |
| Native CI validation | ⏳ | ⏳ | N/A |

`⏳` means the native validation workflow exists but the current validation result has not been confirmed as successful.

---

## Known Limitations

1. Native Windows execution still requires a completed successful Windows CI run and/or real Windows validation.
2. Native macOS execution still requires a completed successful macOS CI run and/or real macOS validation.
3. Some features require administrator privileges or macOS privacy permissions such as Full Disk Access.
4. Some platform-specific tools may not be installed on every host; those features must report unavailable rather than fabricate results.
5. Linux is primarily a development/testing environment and does not provide the complete Windows/macOS feature set.
6. Some operations cannot provide post-action verification when the underlying platform does not expose a reliable observable state.
7. Capability inventory is intentionally conservative: static support metadata is not treated as current host capability evidence.

---

## Development Rules for New Features

When adding a feature:

1. Start with the real OS/API/command data source.
2. Never add sample machine values to production code.
3. Do not use `0`, `false`, empty arrays, or arbitrary strings as fallbacks unless that value was actually observed.
4. Use `null` or an explicit unavailable status when a measurement cannot be made.
5. Include evidence/source information for diagnostic findings.
6. Keep static configuration separate from runtime observations.
7. Protect mutations with validation, allowlists, Safe Mode, and confirmation.
8. Verify mutations using actual before/after state whenever possible.
9. Add regression tests for the failure/unknown path as well as the success path.
10. Update this README whenever runtime behavior, validation coverage, or supported capabilities change.

---

## Changelog

### 2026-09-04 — Runtime Truth & Evidence Hardening

- Removed fabricated production fixtures from `server/fixtures`.
- Removed fabricated Windows/macOS phase details, logs, versions, health states, temperatures, and reclaim values from platform configuration.
- Hardened `src/App.tsx` so initial system telemetry is unknown and polling accepts only typed runtime values.
- Removed artificial free-disk adjustments based on cleanup summaries.
- Made maintenance completion messaging reflect actual section outcomes.
- Reworked `/api/sysinfo`, `/api/capabilities`, `/api/permissions`, and `/api/health-score` around runtime evidence.
- Hardened the health contract so `HEALTHY` requires evidence and empty observations cannot produce a healthy score.
- Hardened evidence quality defaults and degraded-mode behavior.
- Removed optimistic permission defaults.
- Reworked capability reporting so `/api/v10/capabilities-matrix` reports `NOT_CHECKED` until the endpoint actually probes a capability.
- Removed fabricated telemetry defaults from correlation and baseline forecasting logic.
- Added repository truthfulness regression coverage through `server/tests/v17-repository-truth.test.js`.
- Added native smoke validation coverage for Windows 2025, macOS 13, and macOS 15.
- Kept native validation status explicitly pending until the GitHub Actions run completes successfully.

### v16.1.1 — Cross-Platform Bug Fixes

- Fixed platform-aware operation failure messaging.
- Removed hardcoded Windows `C:\` assumptions from relevant commands.
- Added bounded network/DNS diagnostics probes.
- Added platform validation to maintenance phase execution.
- Removed fabricated report-header values.
- Made navigation platform-aware.
- Added cross-platform regression tests.

### v16.0.0 — Production Hardening

- Centralized frontend API access.
- Added Global Search and Command Palette.
- Added structured error codes.
- Strengthened Safe Mode and mutation controls.
- Added repository-wide real-data and security audits.

---

## Production Gate

The project should be considered **CONDITIONALLY PRODUCTION READY** until all required native validation is complete.

| Gate | Current state |
|---|---|
| No known fabricated production telemetry | ✅ Enforced by current code and regression tests |
| Health requires runtime evidence | ✅ |
| Permission state is fail-closed | ✅ |
| Capability claims are fail-closed | ✅ |
| Mutations protected by backend controls | ✅ |
| Build/test regression coverage | ✅ Configured |
| Windows native validation | ⏳ Pending current native workflow |
| macOS native validation | ⏳ Pending current native workflow |
| 100% end-to-end validation | ❌ Not claimed until native validation completes |

**Do not interpret the repository's static feature list as proof that every feature is currently available on every host. Runtime evidence is authoritative.**

---

## License

Proprietary — All rights reserved.

---

*Made with ❤️ by Jeevan*
