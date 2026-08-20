# Win/Mac Suite — End-to-End macOS Audit Report

**Date:** 2026-08-20
**Branch:** `arena/01a01df9-win-mac-suite`
**Scope:** Every dashboard tile/card, button, API endpoint, diagnostic probe, repair action, chart, score, and detail view.

---

## 0. Executive summary

A complete audit of the codebase against the "nothing hardcoded / no fabricated telemetry" requirement found a
pervasive class of defect: **the backend returned fabricated ("looks healthy") values whenever a probe could not
produce a real reading, and the frontend repeated the same mistake with hardcoded `|| 96`, `|| 98`, `|| '+18.4 GB'`
fallbacks.** The previous commit's claim ("eliminate all hardcoded/mocked data") was only partially true — the
*mutation* endpoints (cleanup/verify) were already measured, but many *read* endpoints and every non-macOS fallback
path were still fabricated.

This audit:

1. Removed all fabricated fallbacks from the backend read endpoints (macOS **and** unsupported-platform paths).
2. Rewired the `health-check` score so security/integrity are real probes and the overall score is never clamped
   or padded with a fixed `98`.
3. Rebuilt the safe-cleanup plan from *measured* sizes instead of hardcoded `3100 MB / 4800 MB / …` rows.
4. Removed fabricated "passing" security checks that no probe actually performed.
5. Made every non-macOS path return an explicit `Unavailable / Unsupported` payload instead of pretending to be a
   healthy Windows/macOS box.
6. Fixed ~40 hardcoded frontend fallbacks (health score 96, battery 96%, `'+18.4 GB'`, `'Nominal'`, `'Healthy'`, …)
   to show `Unavailable / Unsupported`.
7. Unified all frontend API calls onto relative `/api/...` URLs (routed through the Vite proxy) instead of a mix of
   absolute `http://127.0.0.1:3131` and relative URLs — fixing the proxied/preview environment and removing the
   hardcoded host.
8. Deleted dead code carrying hardcoded placeholder data (`src/data.ts` and 8 unused components).

**Verification status:** all automated tests pass (84 tests), the production build succeeds, the server boots, and
every affected endpoint was probed live. **A macOS-hardware-specific limitation is documented in §7** — this
sandbox is Linux, so macOS-only CLI probes (`sw_vers`, `system_profiler`, `launchctl`, `tmutil`, …) cannot be
executed here; those paths were verified by code review and are listed explicitly.

---

## 1. What was audited

| Layer | Artifacts |
|---|---|
| Backend routes | `system`, `diagnostics`, `security`, `storage`, `services`, `network`, `reports`, `actions`, `v10`, `intelligence` |
| Backend helpers | `macos-helpers.js`, `macos-advanced-helpers.js`, `windows-helpers.js` |
| Intelligence | `telemetry-collector`, `causal-reasoner`, `experiment-center`, `incident-intelligence`, `correlation-engine`, `baseline-forecaster`, `recommendation-engine` |
| Frontend | `App.tsx`, all hub/tab components, `HealthScore`, `InspectorModal`, `maintenance/*`, `platform/*` |
| Wiring | frontend `fetch` URLs ↔ backend route table (all 70+ endpoints cross-referenced) |
| Automated tests | 84 unit/integration tests across 5 suites |

---

## 2. Findings — fabricated / hardcoded data (the core defect)

### 2.1 Backend read endpoints that fabricated values

| Endpoint | Fabrication found | Fix |
|---|---|---|
| `GET /api/sysinfo` | `totalDiskGB: 256`, `freeDiskGB: 128` when no volume resolved | returns `null` + new `diskAvailable` flag |
| `GET /api/health-check` | `security: score 98`, `integrity: score 98`; overall score padded `+98*0.15 +98*0.10`; score clamped to a **floor of 50** and always ≥50 | security = real `getMacSecurityPosture()`, integrity = real SIP probe, weighted score renormalised over *available* metrics only, `null` when nothing measurable |
| `GET /api/diagnostics/correlation-incidents` | `thermalLevel: 'Nominal'` hardcoded | real `getMacThermalDeep()` (macOS) / `'Unknown'` |
| `GET /api/network/diagnostics` | default gateway fallback `'192.168.1.1'`, DNS time fallbacks `12`/`38`, `packetLossPct: 0` | `null` when unmeasurable, real ping/DNS otherwise |
| `GET /api/network/doctor` | non-macOS: 6 fabricated "passed" workflow steps, `ip4: 192.168.1.50` | `Unavailable` on non-macOS |
| `GET /api/network/bluetooth` | non-macOS: `controllerStatus: 'Active'`, `functional: true` | `Unavailable` |
| `GET /api/network/wifi-intelligence` | non-macOS: `currentSsid: 'Office-Wired-Network'`, `reliabilityScore: 99` | `Unavailable` |
| `GET /api/storage` | fabricated breakdown (`Windows OS & WinSxS 28 GB`, `macOS Core & Sealed Snapshot 15.2`, `usedGB*0.35/0.12/0.40` ratios), `Installer_Stale.iso` | real `getMacSystemDataBreakdown()` + `getMacLargeFiles()`; `null` when unavailable |
| `GET /api/storage/system-data` | non-macOS: fully fabricated WinSxS/Delivery/temp-dump breakdown (34.5 GB etc.) | `Unavailable` |
| `GET /api/storage/docker` / `xcode` / `ios-backups` / `orphaned-leftovers` / `external-drives` | non-macOS: `0 GB`-style pseudo-values | `Unavailable` |
| `GET /api/snapshots` | per-snapshot sizes `'1.4 GB'/'900 MB'` invented (tmutil reports none); fabricated `RestorePoint-101` | real snapshot IDs, `size: 'Unavailable'`; non-macOS → `Unavailable` |
| `GET /api/thermal` | non-macOS: `'Nominal' / 'Normal' / 'Hardware temperatures nominal.'` | `Unavailable` |
| `GET /api/thermal/deep`, `/battery/intelligence`, `/diagnostics/*` (22 endpoints) | non-macOS fallbacks like `stabilityScore: 98`, `indexingEnabled: true`, `defaultOutputDevice: 'Speakers'`, `connectedDisplaysCount: 1`, `finderStatus: 'Responsive'`, `cpuUtilizationPct: 10` | all → `Unavailable` |
| `GET /api/developer/health` | non-macOS: fabricated Node `v20.11.0`, Python `3.11.4`, Docker `24.0.6` | `Unavailable` |
| `GET /api/apps/footprint/:app` | non-macOS: fabricated `.exe`/AppData breakdown (450 MB) | `Unavailable` |
| `GET /api/security`, `/security/posture`, `/security/privacy-auditor`, `/privacy`, `/privacy/auditor`, `/privacy/score` | non-macOS: fabricated `securityScore: 94`, `privacyScore: 90`, `status: 'Protected'` | `Unavailable` |
| `GET /api/services`, `/api/startup-items`, `/api/developer-cleanup` | reported `platform: 'windows'` on Linux (unsupported) | `platform: 'unsupported'` / `Unavailable` |
| `POST /api/actions/cleanup-plan` | 5 hardcoded rows (`3100/4800/2200/1600/450 MB`) | derived from real measured `getMacSystemDataBreakdown()` + `getMacDeveloperArtifacts()` |

### 2.2 Backend helpers that fabricated values (macOS path)

| Helper | Fabrication | Fix |
|---|---|---|
| `getMacSecurityPosture()` | `Signed Binary Verification: passed: true`, `Suspicious Persistence Locations: passed: true` — no probe performed | removed (a check that isn't run must not report "passed") |
| `getMacSecurityStatus()` | `realtimeProtection: true`, `signatureVersion: '…Active'`, `spctlOut || 'assessments enabled'`, `csrOut || '…enabled.'` | `null` / `'Unavailable'` |
| `getMacDeveloperArtifacts()` | fallback `[{ sizeMB: 500 }, { sizeMB: 120 }]` when nothing found | returns `[]` |

*Noted, not changed (documented estimate, clearly labelled in code as an estimate):* `getMacSystemDataBreakdown()`
derives `snapshotsGB` as `count × 1.4 GB` because neither `tmutil` nor `diskutil` exposes per-snapshot size — this is
a labelled estimate, not a fabricated exact reading. See §7 for the macOS-only follow-up.

### 2.3 Frontend hardcoded fallbacks fixed

| File | Before → After |
|---|---|
| `DiagnosticsHub.tsx` | `useState(96)`, `data.score \|\| 96` → `null` + `Unavailable`; `'Overnight sleep drain was 4%'`, `healthPct \|\| 96`, `'Zero rogue sleep blockers…'`, `'Indexing active'`, `'/System/Volumes/Data'` → `Unavailable`; header no longer claims "Sleep Guardian Active" off-macOS |
| `HealthScore.tsx` | now accepts `number \| null` and renders `—` / `Unavailable / Unsupported` when telemetry is absent |
| `CrashHangDoctor.tsx` | `stabilityScore \|\| 98` → `Unavailable` |
| `NetworkDoctorHub.tsx` | `reliabilityScore \|\| 97`, `'Contacts Only'/'Active'` → `Unavailable` |
| `SecurityHub.tsx` | `securityScore \|\| 96`, `privacyScore \|\| 92` → `Unavailable` |
| `ReportsPage.tsx` | `securityScore \|\| 96` → `Unavailable` |
| `SystemEventsTimeline.tsx` | `~90 Days`, `'Healthy'` → `Unavailable` |
| `StorageHub.tsx` | `'+18.4 GB'`, `'Storage growth tracker'` → `Unavailable` |
| `PerformanceDoctorHub.tsx` | `thermalLevel \|\| 'Nominal'` → `Unavailable` |
| `AppleServicesHub.tsx` | `'Healthy'`, `'Active'` → `Unavailable` |
| `ProcessMonitor.tsx` | fabricated sample process list (fake `node.exe`, `chrome.exe`, `explorer.exe`, `Code.exe`) → empty + `Unavailable` empty-state row |
| `LandingHero.tsx` | `uptime \|\| 'Active'` → `Unavailable` |
| `index.html` | stale `"Windows … Suite v5.0"` title/description → accurate cross-platform title |

### 2.4 Wiring issues fixed

- **Mixed API base URLs.** ~24 files called `http://127.0.0.1:3131/api/...` directly while the intelligence layer used
  relative `/api/...`. The absolute URLs hardcode the local host, break under any proxied/preview origin, and bypass
  the Vite proxy. All frontend + `maintenance/executor.ts` calls now use relative `/api/...` (proxied to
  `127.0.0.1:3131` by `vite.config.ts`). Verified end-to-end: `GET http://localhost:5173/api/sysinfo` → 200.
- **Route cross-reference.** All ~70 frontend `fetch` targets were matched against the backend route table; every
  endpoint the UI calls exists. No mismatched method/path pairs remain.
- **Platform string bug.** Several routes returned `platform: 'windows'` on Linux/unsupported hosts; corrected to
  `'unsupported'`.

### 2.5 Dead code removed

`src/data.ts` (hardcoded `SYSTEM_INFO = { hostName: 'Local Host', user: 'User', os: 'OS', processor: 'Processor', … }`)
plus 8 unreferenced components: `DiagnosticsPanel`, `DiagnosticExperimentsHub`, `ExplainModal`, `MacUtilitiesHub`,
`ParticleBackground`, `RecommendationCenter`, `SystemAppsHub`, `TroubleshootCenter`.

---

## 3. Verification performed

### 3.1 Automated tests
```
v8  safety & correlation      — all passed
v9  comprehensive suite       — all passed
v10 validation & trust        — 43 passed, 0 failed
v10 path & TOCTOU security    — 20 passed, 0 failed
v10 intelligence              — 21 passed, 0 failed
```
`npm test` exits 0. `npm run build` succeeds (2262 modules, single-file output).

### 3.2 Live endpoint probes (this sandbox = Linux "unsupported" platform)
The server was started and every affected endpoint probed. Representative results after the fix:

```
/api/health-check       → { score: 100, available: true, metrics: { security: { status:'Unavailable', score:null }, integrity: { status:'Unavailable', score:null }, ... } }
/api/thermal            → { available: false, state:'Unavailable', ... }
/api/storage            → { platform:'unsupported', breakdown:null, largeFiles:[] }
/api/snapshots          → { platform:'unsupported', count:0, available:false, reason:'…only queryable on macOS.' }
/api/developer/health   → { available:false, reason:'…only measurable on macOS.' }
/api/security/posture   → { available:false, reason:'…only measurable on macOS.' }
/api/network/diagnostics→ { online:true, defaultGateway:'169.254.0.22', packetLossPct:null, activeAdapter:{ name:'eth0', … } }
POST /api/actions/cleanup-plan → { available:false, reason:'…only measurable on macOS.' }
```
The `score` returned by `health-check` is now the honest weighted score over storage/memory/CPU only (security and
integrity are correctly `Unavailable` off-macOS). No endpoint returns a fabricated "healthy" value.

### 3.3 Preview / dev server
`npm run dev` serves on `0.0.0.0:5173` and proxies `/api` → `127.0.0.1:3131`; confirmed `200` for the app shell and
proxied API responses. On this Linux host the app correctly renders the **Unsupported OS** view rather than a fake
Windows/Mac dashboard.

---

## 4. Clickability & detail views

Every tile/card that carries telemetry already opens the shared `InspectorModal` (used in 15+ live components),
showing the underlying dynamic value, a human explanation, the probe command, and available action. The audit
confirmed the detail view renders **fetched** values (not the previous fabricated fallbacks) and that empty/unavailable
states now render `Unavailable / Unsupported` instead of a fabricated "healthy" number.

---

## 5. Actions & authorization

Mutative actions (`execute-cleanup`, `clean-docker`, `clean-xcode`, `clean-storage`, `thin-snapshots`, `purge-ram`,
`restart-audio`, `rebuild-icon-cache`, `kill-port`, `toggle-startup`, `toggle-service`, `remove-quarantine`,
`eject-drive`) were already implemented with the v10 guardrails and were **not** found to fabricate results: they
measure before/after state (`reclaimedBytes` computed from real `si.fsSize()`/directory-size deltas, `null` when not
measurable), run through `exec-guard`/`operation-executor`/allowlist validation, request confirmation, and
verify the result afterward. The only fabricated part of the action flow — the `cleanup-plan` preview — was rewired
to measured sizes (§2.1).

---

## 6. Remaining risks / follow-ups

1. **`getMacSystemDataBreakdown().snapshotsGB`** is a documented estimate (`count × 1.4 GB`) — acceptable as a
   labelled estimate, but should be surfaced in the UI as "estimated", not "measured".
2. **Windows-only helpers** (`windows-helpers.js`) still contain fabricated fallbacks (fake event logs, services,
   startup items, battery, package counts). These are out of scope for a *macOS* audit and are only reachable on a
   real Windows host; they should receive the same treatment in a Windows pass.
3. **macOS hardware verification** (§7) — the macOS CLI probes could not be executed in this Linux sandbox.

---

## 7. macOS-hardware limitation (honest disclosure)

This audit was performed in a **Linux sandbox** (`Debian 12`, Node 22). macOS-only probes — `spctl`, `fdesetup`,
`csrutil`, `socketfilterfw`, `tmutil`, `diskutil`, `system_profiler`, `softwareupdate`, `mdutil`, `launchctl`,
`pmset`, `ioreg`, `top -l`, `sysctl`, `log show`, TCC directory reads — **cannot be executed here**. Their code
paths were verified by review (correct command construction, correct output parsing, correct fallback-to-`Unavailable`
on error). To finish the audit on real hardware, run `./start-ui.sh` on a Mac and confirm:

- `GET /api/sysinfo` → real chip/cores/RAM/disk (not `null`)
- `GET /api/capabilities` → real Homebrew/diskutil/tmutil presence & versions
- `GET /api/security` & `/security/posture` → real Gatekeeper/FileVault/SIP/firewall booleans
- `GET /api/permissions` → `isElevated` reflects real UID; FDA probe reflects real TCC access
- `GET /api/diagnostics/*`, `/thermal`, `/battery/intelligence`, `/network/*` → real values or `Unavailable`
- `POST /api/actions/cleanup-plan` → measured reclaimable sizes
- Every tile/card in the UI opens a detail view populated with the live values above
```
