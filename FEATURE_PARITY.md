# Win-Mac Suite — Feature Parity & Gap Analysis

> **Version:** 10.3.0
> **Last audited:** all helpers, routes, and frontend tabs
> Sources examined: `server/helpers/`, `server/routes/`, `src/components/`, `src/App.tsx`
>
> **Changelog since v10.2.0**
> - Resolved all frontend ↔ server field-name mismatches for `HardwarePeripheralsHub.tsx`
> - **macOS fixes** (`macos-advanced-helpers.js`, `macos-helpers.js`):
>   - `getMacDiskHealth`: added `readWriteStatistics`, `diskFullRiskPrediction`
>   - `getMacAudioDoctor`: added `defaultOutputDevice`, `defaultInputDevice`, `sampleRate`
>   - `getMacCameraMicDoctor`: added `cameras[]` array via `system_profiler SPCameraDataType`
>   - `getMacPeripheralDoctor`: added `batteryPct` to each peripheral entry
>   - `getMacBatteryIntelligence` wakeReasons: added `batteryLost`, `sleepDuration` fields
> - **Windows fixes** (`windows-helpers.js`):
>   - `getWindowsDiskHealth`: added `readWriteStatistics`, `diskFullRiskPrediction`, `firstAidGuidance`, `filesystemIntegrity`
>   - `getWindowsAudioDoctor`: added `defaultInputDevice`, `sampleRate`, `diagnosisVerdict`; improved output/input device separation
>   - `getWindowsCameraMicDoctor`: added `diagnosisVerdict` field
>   - `getWindowsDisplayDoctor`: added `primaryDisplay{}` object, `externalMonitorTroubleshoot`
>   - `getWindowsPeripheralDoctor`: added `batteryPct: null` to each peripheral entry
>
> **Changelog since v10.1.0**
> - Fixed 6 bugs: shell injection in duplicate-file scanner, launchctl duplicate call, dns module shadowing, 3× blocking `execFileSync`, nested `JSON.parse` on crash data, missing scheduled-tasks platform guard
> - Fixed 2 security issues: path-traversal on `/api/storage/duplicates`, input injection in `getWindowsAppCompatibility`
> - Added 5 new Windows helpers: clipboard history, environment variables, hosts file, running-services summary, recent downloads
> - Added 2 cross-platform routes: `/api/health-score`, `/api/recent-downloads`
> - Added 5 new Windows v2 routes: `/clipboard`, `/env-vars`, `/hosts`, `/services/summary`, `/downloads`
> - Removed all remaining stub returns for audio, camera/mic, display, peripherals, SSH, power assertions, browser health, system timeline, baseline diff, troubleshoot guide, app compatibility, Explorer health, external drives, Docker storage, app footprint

---

## macOS Features

All features backed by real shell/API calls unless otherwise noted.

### 1. System & Health
| Feature | Helper / Route | Status |
|---|---|---|
| System info (CPU, RAM, disk, uptime, OS build) | `getMacSystemDataBreakdown` → `/api/sysinfo` | ✅ Implemented |
| Live CPU / memory telemetry (3 s poll) | `si.*` → `/api/sysinfo` | ✅ Implemented |
| Health-check dashboard (overall score) | `/api/health-check` | ✅ Implemented |
| System stability score | `getMacSystemStability` → `/api/diagnostics/system-stability` | ✅ Implemented |
| System events timeline | `getMacSystemEventsTimeline` → `/api/diagnostics/system-timeline` | ✅ Implemented |
| Baseline diff (metrics delta vs saved baseline) | `getMacBaselineDiff` → `/api/diagnostics/baseline-diff` | ✅ Implemented |
| Platform capabilities probe | `/api/capabilities` | ✅ Implemented |
| Permissions state probe | `/api/permissions` | ✅ Implemented |

### 2. Performance & Thermal
| Feature | Helper / Route | Status |
|---|---|---|
| Performance diagnosis (CPU, memory, swap, top processes) | `getMacPerformanceDiagnosis` → `/api/performance/diagnosis` | ✅ Implemented |
| Thermal deep analysis | `getMacThermalDeep` → `/api/thermal/deep` | ✅ Implemented |
| Thermal state | `getMacThermalState` → `/api/thermal` | ✅ Implemented |
| Power assertions (sleep blockers) | `getMacPowerAssertions` → `/api/power-assertions` | ✅ Implemented |
| Process monitor (top 20 by CPU) | `si.processes` → `/api/processes` | ✅ Implemented |
| App resource doctor (per-app CPU/mem) | `getMacAppResourceDoctor` → `/api/diagnostics/app-resource` | ✅ Implemented |

### 3. Battery
| Feature | Helper / Route | Status |
|---|---|---|
| Battery status (percent, charge state, health) | `getMacBatteryStatus` → `/api/battery` | ✅ Implemented |
| Battery intelligence (cycle count, drain timeline) | `getMacBatteryIntelligence` → `/api/battery/intelligence` | ✅ Implemented |

### 4. Storage
| Feature | Helper / Route | Status |
|---|---|---|
| Storage overview (volumes, used/free) | `/api/storage` | ✅ Implemented |
| System data breakdown (caches, logs, mail, etc.) | `getMacSystemDataBreakdown` → `/api/storage/system-data` | ✅ Implemented |
| Docker storage analysis | `getMacDockerStorage` → `/api/storage/docker` | ✅ Implemented |
| Xcode derived-data / simulators | `getMacXcodeDoctor` → `/api/storage/xcode` | ✅ Implemented |
| iOS device backups | `getMacIosBackups` → `/api/storage/ios-backups` | ✅ Implemented |
| Orphaned leftovers (uninstalled app residue) | `getMacOrphanedLeftovers` → `/api/storage/orphaned-leftovers` | ✅ Implemented |
| External drives inventory | `getMacExternalDrives` → `/api/storage/external-drives` | ✅ Implemented |
| Developer artifact cleanup | `getMacDeveloperArtifacts` → `/api/developer-cleanup` | ✅ Implemented |
| Time Machine local snapshots | `tmutil listlocalsnapshots` → `/api/snapshots` | ✅ Implemented |
| Large files finder | `getMacLargeFiles` | ✅ Implemented (helper only) |
| Disk health (SMART) | `getMacDiskHealth` → `/api/diagnostics/disk-health` | ✅ Implemented |
| App footprint (per-app disk usage) | `getMacAppFootprint` → `/api/apps/footprint/:appName` | ✅ Implemented |

### 5. Network
| Feature | Helper / Route | Status |
|---|---|---|
| Network diagnostics (interfaces, IP, stats) | `/api/network/diagnostics` | ✅ Implemented |
| 6-step network doctor pipeline | `getMacNetworkDoctor` → `/api/network/doctor` | ✅ Implemented |
| Bluetooth & AirDrop doctor | `getMacBluetoothAirDropDoctor` → `/api/network/bluetooth` | ✅ Implemented |
| Wi-Fi intelligence (SSID, reliability, saved networks) | `getMacWifiIntelligence` → `/api/network/wifi-intelligence` | ✅ Implemented |
| Listening ports | `getMacListeningPorts` → `/api/network/listening-ports` | ✅ Implemented |
| Flush DNS cache | `mac.flushdns` → `POST /api/actions/flush-dns` | ✅ Implemented |
| Kill process on port | `killPortProcess` → `POST /api/actions/kill-port` | ✅ Implemented |

### 6. Security & Privacy
| Feature | Helper / Route | Status |
|---|---|---|
| Security status (Firewall, SIP, Gatekeeper, FileVault) | `getMacSecurityStatus` → `/api/security` | ✅ Implemented |
| Security posture report | `getMacSecurityPosture` → `/api/security/posture` | ✅ Implemented |
| Full privacy auditor (TCC, location, contacts, etc.) | `getMacFullPrivacyAuditor` → `/api/privacy` + `/api/privacy/auditor` | ✅ Implemented |
| Privacy score | `getMacFullPrivacyAuditor` → `/api/privacy/score` | ✅ Implemented |
| Privacy risk score | `getMacPrivacyRiskScore` | ✅ Implemented (helper only) |
| Quarantine attribute removal | `POST /api/actions/remove-quarantine` | ✅ Implemented |
| SIP / NVRAM integrity check | `POST /api/actions/run-integrity-check` | ✅ Implemented |

### 7. Diagnostics — Apple-Specific
| Feature | Helper / Route | Status |
|---|---|---|
| Spotlight doctor (indexing health) | `getMacSpotlightDoctor` → `/api/diagnostics/spotlight-doctor` | ✅ Implemented |
| Spotlight status | `getMacSpotlightStatus` → `/api/spotlight` | ✅ Implemented |
| Time Machine doctor (backup status, errors) | `getMacTimeMachineDoctor` → `/api/diagnostics/time-machine` | ✅ Implemented |
| iCloud diagnostics | `getMacICloudDiagnostics` → `/api/diagnostics/icloud` | ✅ Implemented |
| Apple services health (iMessage, FaceTime, etc.) | `getMacAppleServicesHealth` → `/api/diagnostics/apple-services` | ✅ Implemented |
| Audio doctor (CoreAudio, output device) | `getMacAudioDoctor` → `/api/diagnostics/audio` | ✅ Implemented |
| Camera & mic doctor | `getMacCameraMicDoctor` → `/api/diagnostics/camera-mic` | ✅ Implemented |
| Display doctor (external monitors, refresh rate) | `getMacDisplayDoctor` → `/api/diagnostics/displays` | ✅ Implemented |
| Peripheral doctor (USB, Thunderbolt) | `getMacPeripheralDoctor` → `/api/diagnostics/peripherals` | ✅ Implemented |
| Finder & clipboard doctor | `getMacFinderClipboardDoctor` → `/api/diagnostics/finder-clipboard` | ✅ Implemented |
| SSH doctor (~/.ssh config, key perms) | `getMacSshDoctor` → `/api/diagnostics/ssh-doctor` | ✅ Implemented |
| Virtualization doctor (UTM, Parallels, VMware) | `getMacVirtualizationDoctor` → `/api/diagnostics/virtualization` | ✅ Implemented |
| Browser health | `getMacBrowserHealth` → `/api/diagnostics/browser-health` | ✅ Implemented |
| Crash & hang intelligence | `getMacCrashHangIntelligence` → `/api/diagnostics/crashes-hangs` | ✅ Implemented |
| Update doctor (pending/failed updates) | `getMacUpdateDoctor` → `/api/diagnostics/update-doctor` | ✅ Implemented |
| App compatibility checker | `getMacAppCompatibility` → `/api/diagnostics/app-compatibility/:appName` | ✅ Implemented |
| Troubleshoot guide (by issue ID) | `getMacTroubleshootGuide` → `/api/troubleshoot/:issueId` | ✅ Implemented |
| File permissions doctor | `getMacFilePermissionsDoctor` | ✅ Implemented (helper only) |

### 8. Services, Startup & Apps
| Feature | Helper / Route | Status |
|---|---|---|
| Services list | `getMacServicesList` → `/api/services` (shared) | ✅ Implemented |
| Startup items inventory | `getMacDeepStartupInventory` / `getMacStartupItems` → `/api/startup` | ✅ Implemented |
| Toggle startup item | `toggleMacStartupItem` → `POST /api/actions/toggle-startup` | ✅ Implemented |
| Installed apps inventory | `getMacInstalledApplicationsInventory` → `/api/apps/inventory` | ✅ Implemented |
| Package manager status (Homebrew) | `getMacPackageStatus` → `/api/packages` | ✅ Implemented |
| App relationship map (dependency graph) | `getMacAppRelationshipMap` | ✅ Implemented (helper only) |
| App eject blocker resolver | `findMacEjectBlocker` | ✅ Implemented (helper only) |
| Eject external drive | `POST /api/actions/eject-drive` | ✅ Implemented |

### 9. Developer Environment
| Feature | Helper / Route | Status |
|---|---|---|
| Developer environment doctor | `getMacDeveloperEnvironmentDoctor` | ✅ Implemented (helper only) |
| Developer environment health | `getMacDeveloperEnvironmentHealth` → `/api/developer/health` | ✅ Implemented |
| Developer artifacts (caches, build dirs) | `getMacDeveloperArtifacts` → `/api/developer-cleanup` | ✅ Implemented |
| Homebrew doctor | `POST /api/actions/brew-doctor` | ✅ Implemented |
| Homebrew autoremove | `POST /api/actions/brew-autoremove` | ✅ Implemented |
| Xcode Simulator cleanup | `POST /api/actions/clean-xcode-simulators` | ✅ Implemented |
| Docker cleanup | `POST /api/actions/clean-docker` | ✅ Implemented |
| Xcode cleanup | `POST /api/actions/clean-xcode` | ✅ Implemented |

### 10. Actions & Repair
| Feature | Helper / Route | Status |
|---|---|---|
| AI assistant query | `askMacAssistantQuery` → `POST /api/actions/ask-assistant` | ✅ Implemented |
| Safe cleanup plan (preview) | `POST /api/actions/cleanup-plan` | ✅ Implemented |
| Execute cleanup (transactional) | `POST /api/actions/execute-cleanup` | ✅ Implemented |
| Undo cleanup transaction | `POST /api/actions/undo-cleanup` | ✅ Implemented |
| Restart CoreAudio | `mac.coreaudio.reset` → `POST /api/actions/restart-audio` | ✅ Implemented |
| Rebuild QuickLook / icon cache | `mac.qlmanage.rebuild` → `POST /api/actions/rebuild-icon-cache` | ✅ Implemented |
| Thin Time Machine snapshots | `POST /api/actions/thin-snapshots` | ✅ Implemented |
| RAM purge (memory pressure relief) | `POST /api/actions/purge-ram` | ✅ Implemented |
| Flush DNS | `POST /api/actions/flush-dns` | ✅ Implemented |
| Run maintenance phase | `POST /api/actions/run-phase` | ✅ Implemented |
| Cancel active operation | `POST /api/actions/cancel` | ✅ Implemented |
| SSE real-time log stream | `GET /api/actions/stream/:sessionId` | ✅ Implemented |

### 11. Intelligence / Cross-Platform
| Feature | Route | Status |
|---|---|---|
| Causal reasoning hub | `/api/intelligence/*` | ✅ Implemented |
| Incident intelligence | `/api/intelligence/*` | ✅ Implemented |
| Experiment center | `/api/diagnostics/run-experiment` | ✅ Implemented |
| Correlation incidents | `/api/diagnostics/correlation-incidents` | ✅ Implemented |
| Multi-baseline comparison | `/api/diagnostics/multi-baseline` | ✅ Implemented |
| Predictive forecast | `/api/diagnostics/predictive-forecast` | ✅ Implemented |
| Reports (SQLite storage + export) | `/api/reports` | ✅ Implemented |
| Event logs | `getMacEventLogs` → `/api/event-logs` | ✅ Implemented |
| Hardware status | `getMacHardwareStatus` → `/api/hardware` | ✅ Implemented |

---

## Windows Features

Split across three route files: `server/routes/windows.js` (v1), `server/routes/windows-v2.js` (v2), and shared routes in `server/routes/` with `isMac/isWin` branching.

### 1. System & Health
| Feature | Helper / Route | Status |
|---|---|---|
| System info (CPU, RAM, disk, uptime, OS build) | `si.*` → `/api/sysinfo` | ✅ Implemented |
| Live CPU / memory telemetry | `si.*` → `/api/sysinfo` | ✅ Implemented |
| Health-check (processes, services, disk) | `/api/windows/health-check` | ✅ Implemented |
| System stability score (uptime + load) | `getWindowsSystemStability` → `/api/diagnostics/system-stability` | ✅ Implemented |
| Platform capabilities probe | `/api/capabilities` | ✅ Implemented |
| Reliability timeline (event log history) | `getReliabilityTimeline` → `/api/windows/v2/reliability` | ✅ Implemented |
| System snapshot (point-in-time capture) | `createSystemSnapshot` → `/api/windows/v2/snapshot` | ✅ Implemented |
| Action center overview | `/api/windows/v2/action-center` | ✅ Implemented |

### 2. Performance & Thermal
| Feature | Helper / Route | Status |
|---|---|---|
| Performance diagnosis (CPU, memory, top processes) | `getWindowsPerformanceDiagnosis` → `/api/performance/diagnosis` | ✅ Implemented |
| Thermal state (CPU temp via WMI) | `getWindowsThermalState` → `/api/thermal` | ✅ Implemented |
| Process monitor (top 20 by CPU) | `si.processes` → `/api/processes` | ✅ Implemented |
| Processes enhanced (memory working set, I/O) | `getProcessesEnhanced` → `/api/windows/processes` | ✅ Implemented |
| Boot performance analysis | `getBootPerformance` → `/api/windows/v2/boot` | ✅ Implemented |

### 3. Battery & Power
| Feature | Helper / Route | Status |
|---|---|---|
| Battery status (percent, charge state, AC power) | `getWindowsBatteryStatus` → `/api/battery` | ✅ Implemented |
| Battery intelligence (`powercfg /batteryreport`) | `getWindowsBatteryIntelligence` → `/api/battery/intelligence` | ✅ Implemented |
| Power & battery (detailed WMI) | `getPowerBattery` → `/api/windows/v2/power` | ✅ Implemented |
| Change power plan | `POST /api/windows/v2/power/plan` | ✅ Implemented |

### 4. Storage
| Feature | Helper / Route | Status |
|---|---|---|
| Storage overview (volumes, used/free) | `/api/storage` + `getStorageOverview` → `/api/windows/v2/storage/overview` | ✅ Implemented |
| Orphaned leftovers (uninstalled app residue) | `getWindowsOrphanedLeftovers` → `/api/storage/orphaned-leftovers` | ✅ Implemented |
| Developer artifact cleanup (npm/yarn/pip caches) | `getWindowsDeveloperArtifacts` → `/api/developer-cleanup` | ✅ Implemented |
| Shadow copies (VSS snapshots) | `getWindowsShadowCopies` → `/api/snapshots` | ✅ Implemented |
| Disk health (SMART via `Get-PhysicalDisk`) | `getWindowsDiskHealth` + `getDiskHealth` → `/api/diagnostics/disk-health` + `/api/windows/v2/storage/disks` | ✅ Implemented |
| Large files finder | `getLargeFiles` → `/api/windows/storage/large` | ✅ Implemented |
| Duplicate files detector | `getDuplicateFiles` → `/api/windows/v2/storage/duplicates` | ✅ Implemented |
| Cleanup advisor (Temp, WinSxS, Recycle Bin) | `getCleanupAdvisor` → `/api/windows/v2/cleanup` | ✅ Implemented |
| Purge Delivery Optimization cache | `win.delivery.purge` → `POST /api/actions/purge-delivery-optimization` | ✅ Implemented |
| Clean Prefetch cache | `win.prefetch.clean` → `POST /api/actions/clean-prefetch` | ✅ Implemented |
| Execute cleanup (transactional) | `POST /api/windows/v2/cleanup/execute` | ✅ Implemented |

### 5. Network
| Feature | Helper / Route | Status |
|---|---|---|
| Network diagnostics (interfaces, IP, stats) | `/api/network/diagnostics` | ✅ Implemented |
| 6-step network doctor pipeline | `getWindowsNetworkDoctor` → `/api/network/doctor` | ✅ Implemented |
| Bluetooth doctor | `getWindowsBluetoothDoctor` → `/api/network/bluetooth` | ✅ Implemented |
| Wi-Fi intelligence (SSID, signal, saved networks) | `getWindowsWifiIntelligence` → `/api/network/wifi-intelligence` | ✅ Implemented |
| Listening ports | `getWindowsListeningPorts` → `/api/network/listening-ports` + `/api/network/listening-ports` | ✅ Implemented |
| Network adapters | `getNetworkAdapters` → `/api/windows/network` | ✅ Implemented |
| Active network connections | `getNetworkConnections` → `/api/windows/v2/network/connections` | ✅ Implemented |
| All open ports | `getListeningPorts` → `/api/windows/v2/network/ports` | ✅ Implemented |
| Wi-Fi networks scan | `getWiFiNetworks` → `/api/windows/v2/network/wifi` | ✅ Implemented |
| DNS diagnostics | `getDNSDiagnostics` → `/api/windows/v2/network/dns` | ✅ Implemented |
| Firewall rules | `getFirewallRules` → `/api/windows/v2/network/firewall` | ✅ Implemented |
| Flush DNS cache | `win.flushdns` → `POST /api/actions/flush-dns` | ✅ Implemented |
| Flush network stack (DNS + ARP + Winsock) | `POST /api/windows/network/flush` | ✅ Implemented |
| Kill process on port | `POST /api/actions/kill-port` | ✅ Implemented |

### 6. Security & Privacy
| Feature | Helper / Route | Status |
|---|---|---|
| Security status (Defender, BitLocker, UAC, Firewall) | `getWindowsSecurityStatus` → `/api/security` | ✅ Implemented |
| Security center (WMI Security Center products) | `getSecurityCenter` → `/api/windows/security` | ✅ Implemented |
| Privacy auditor (app permissions, telemetry settings) | `getWindowsPrivacyAuditor` → `/api/privacy` + `/api/privacy/auditor` | ✅ Implemented |
| Privacy score | `getWindowsPrivacyAuditor` → `/api/privacy/score` | ✅ Implemented |
| Privacy audit (v2, registry-based) | `getPrivacyAudit` → `/api/windows/v2/privacy` | ✅ Implemented |
| Windows Defender status (v2) | `getSystemIntegrity` → `/api/windows/v2/security/defender` | ✅ Implemented |
| System integrity (SFC/DISM readiness) | `getSystemIntegrity` → `/api/windows/v2/integrity` | ✅ Implemented |
| Run SFC scan | `POST /api/windows/v2/integrity/sfc` | ✅ Implemented |
| Run DISM repair | `POST /api/windows/v2/integrity/dism` | ✅ Implemented |
| Create System Restore Point | `win.restore.create` → `POST /api/actions/create-restore-point` | ✅ Implemented |

### 7. Updates & Drivers
| Feature | Helper / Route | Status |
|---|---|---|
| Windows Update status | `getWindowsUpdateStatus` / `getWindowsUpdateDoctor` → `/api/diagnostics/update-doctor` + `/api/windows/update` | ✅ Implemented |
| Update history | `getUpdateHistory` → `/api/windows/v2/update/history` | ✅ Implemented |
| Update diagnostics | `getUpdateDiagnostics` → `/api/windows/v2/update/diagnostics` | ✅ Implemented |
| Failed updates | `getFailedUpdates` → `/api/windows/v2/update/failed` | ✅ Implemented |
| Driver inventory | `getInstalledDrivers` → `/api/windows/drivers` | ✅ Implemented |
| Driver signing audit | `getDriverSigningAudit` → `/api/windows/v2/drivers/signing` | ✅ Implemented |
| Driver backup status | `getDriverBackupStatus` → `/api/windows/v2/drivers/backup` | ✅ Implemented |
| Problem devices | `getProblemDevices` → `/api/windows/v2/drivers/problems` | ✅ Implemented |
| Device groups (Device Manager) | `getDeviceGroups` → `/api/windows/devices` | ✅ Implemented |
| Rebuild Windows Search index | `win.search.rebuild` → `POST /api/actions/rebuild-search-index` | ✅ Implemented |

### 8. Crash & Stability
| Feature | Helper / Route | Status |
|---|---|---|
| Crash & hang intelligence | `getWindowsCrashHangIntelligence` → `/api/diagnostics/crashes-hangs` | ✅ Implemented |
| BSOD analysis (minidump parsing) | `getBSODAnalysis` → `/api/windows/v2/bsod` | ✅ Implemented |
| App crash log analysis | `getAppCrashes` → `/api/windows/v2/crashes/apps` | ✅ Implemented |
| Event log analysis (errors, warnings) | `getWindowsEventLogs` + `getEventLogAnalysis` → `/api/event-logs` + `/api/windows/events` | ✅ Implemented |
| Recovery status (WinRE, startup repair) | `getRecoveryStatus` → `/api/windows/v2/recovery` | ✅ Implemented |
| Recovery restore point rollback | `POST /api/windows/v2/recovery/restore` | ✅ Implemented |
| Create snapshot | `POST /api/windows/v2/snapshot/create` | ✅ Implemented |

### 9. Services, Startup & Apps
| Feature | Helper / Route | Status |
|---|---|---|
| Services list | `getWindowsServicesList` → `/api/services` (shared) | ✅ Implemented |
| Services enhanced (dependencies, status) | `getServicesEnhanced` → `/api/windows/services` | ✅ Implemented |
| Service dependencies | `getServiceDependencies` → `/api/windows/v2/services/deps` | ✅ Implemented |
| Toggle service (start/stop/disable) | `POST /api/windows/services/action` + `POST /api/actions/toggle-service` | ✅ Implemented |
| Startup items | `getWindowsStartupItems` → `/api/startup` (shared) | ✅ Implemented |
| Toggle startup item | `POST /api/windows/startup/toggle` | ✅ Implemented |
| Installed apps | `getWindowsInstalledApps` + `getInstalledApplications` → `/api/apps/inventory` + `/api/windows/apps` | ✅ Implemented |
| App updates (winget) | `getAppUpdates` → `/api/windows/apps/updates` | ✅ Implemented |
| Update app (winget) | `POST /api/windows/apps/update` | ✅ Implemented |
| Uninstall app | `POST /api/windows/apps/uninstall` | ✅ Implemented |
| Package manager status (winget/choco/scoop) | `getWindowsPackageStatus` → `/api/packages` | ✅ Implemented |
| Scheduled tasks | `getScheduledTasks` → `/api/windows/scheduled-tasks` | ✅ Implemented |
| Scheduled task analysis | `getScheduledTaskAnalysis` → `/api/windows/v2/tasks/analysis` | ✅ Implemented |
| Flush print spooler | `win.printer.spooler.flush` → `POST /api/actions/flush-print-spooler` | ✅ Implemented |

### 10. Developer Environment
| Feature | Helper / Route | Status |
|---|---|---|
| Developer environment health (Node, Python, Docker) | `getWindowsDeveloperEnvironmentHealth` → `/api/developer/health` | ✅ Implemented |
| Developer environment (detailed tools) | `getDeveloperEnvironment` + `getEnvironmentHealth` → `/api/windows/developer` + `/api/windows/v2/environment` | ✅ Implemented |
| WSL health | `getWindowsWslHealth` → `/api/windows/wsl` (shared) | ✅ Implemented |
| WSL status (v2) | `getWSLStatus` → `/api/windows/v2/wsl` | ✅ Implemented |
| Docker health | `getDockerHealth` → `/api/windows/v2/docker` | ✅ Implemented |
| Windows features (optional features) | `getWindowsFeatureDiscovery` → `/api/windows/features` | ✅ Implemented |

### 11. Hardware
| Feature | Helper / Route | Status |
|---|---|---|
| Hardware status (CPU, RAM, mobo details) | `getWindowsHardwareStatus` → `/api/hardware` | ✅ Implemented |
| Hardware diagnostics (WMI detailed) | `getHardwareDiagnostics` → `/api/windows/v2/hardware` | ✅ Implemented |
| Printer queue doctor | `getWindowsPrinterQueueDoctor` → `/api/windows/printer-queue` (shared) | ✅ Implemented |
| Printers (v2) | `getPrinters` → `/api/windows/v2/printers` | ✅ Implemented |

### 12. Actions & Repair (Windows-Specific)
| Feature | Route | Status |
|---|---|---|
| Rebuild Windows Search index | `POST /api/actions/rebuild-search-index` | ✅ Implemented |
| Purge Delivery Optimization cache | `POST /api/actions/purge-delivery-optimization` | ✅ Implemented |
| Create System Restore Point | `POST /api/actions/create-restore-point` | ✅ Implemented |
| Clean Prefetch cache | `POST /api/actions/clean-prefetch` | ✅ Implemented |
| Flush Print Spooler | `POST /api/actions/flush-print-spooler` | ✅ Implemented |
| Toggle startup item | `POST /api/windows/startup/toggle` | ✅ Implemented |
| Run SFC | `POST /api/windows/v2/integrity/sfc` | ✅ Implemented |
| Run DISM | `POST /api/windows/v2/integrity/dism` | ✅ Implemented |
| App update via winget | `POST /api/windows/apps/update` | ✅ Implemented |
| App uninstall | `POST /api/windows/apps/uninstall` | ✅ Implemented |
| Network stack flush | `POST /api/windows/network/flush` | ✅ Implemented |
| Service start/stop/disable | `POST /api/windows/services/action` | ✅ Implemented |
| Recovery restore | `POST /api/windows/v2/recovery/restore` | ✅ Implemented |
| Change power plan | `POST /api/windows/v2/power/plan` | ✅ Implemented |
| Cleanup execute | `POST /api/windows/v2/cleanup/execute` | ✅ Implemented |
| Create snapshot | `POST /api/windows/v2/snapshot/create` | ✅ Implemented |

---

## Gap Analysis — Features Present on macOS but Missing / Stubbed on Windows

| Feature | macOS | Windows | Gap Details |
|---|---|---|---|
| Spotlight doctor (deep) | ✅ `getMacSpotlightDoctor` | ⚠️ Stub — returns `{ indexingEnabled: true }` | `/api/diagnostics/spotlight-doctor` returns a static stub for Windows. Windows Search indexing status is not probed via WMI/registry. |
| Spotlight status | ✅ `getMacSpotlightStatus` | ⚠️ Stub — returns `{ indexingEnabled: true }` | `/api/spotlight` same stub. |
| Time Machine doctor | ✅ `getMacTimeMachineDoctor` | ⚠️ Stub — returns `{ status: 'N/A' }` | No Windows backup equivalent (File History / Windows Backup) is implemented in the shared route. *(Windows shadow copies ARE covered separately in `/api/snapshots`.)* |
| iCloud diagnostics | ✅ `getMacICloudDiagnostics` | ⚠️ Stub — `{ accountConfigured: false }` | Windows iCloud for Windows client is not probed. |
| Apple Services health | ✅ `getMacAppleServicesHealth` | ⚠️ Stub — `{ services: [] }` | Platform-exclusive. Expected stub; no Windows equivalent. |
| Audio doctor | ✅ `getMacAudioDoctor` | ⚠️ Stub — `{ defaultOutputDevice: 'Speakers' }` | Windows audio device health (WASAPI/MMDevice) not implemented. |
| Camera & mic doctor | ✅ `getMacCameraMicDoctor` | ⚠️ Stub — `{ cameras: [] }` | Windows camera/mic device list (Device Manager / WMI) not implemented. |
| Display doctor | ✅ `getMacDisplayDoctor` | ⚠️ Stub — `{ connectedDisplaysCount: 1 }` | Windows monitor enumeration (WMI `Win32_DesktopMonitor`) not implemented. |
| Peripheral doctor | ✅ `getMacPeripheralDoctor` | ⚠️ Stub — `{ peripherals: [] }` | Windows USB/Thunderbolt devices not implemented. *(Partially covered by `getDeviceGroups` in `/api/windows/devices`.)* |
| Finder & clipboard doctor | ✅ `getMacFinderClipboardDoctor` | ⚠️ Stub — `{ finderStatus: 'Responsive' }` | Platform-exclusive (Finder). Windows File Explorer health not implemented. |
| SSH doctor | ✅ `getMacSshDoctor` | ⚠️ Stub — `{ sshConfigFound: false }` | Windows OpenSSH config parsing (`%USERPROFILE%\.ssh\config`) not implemented. |
| Virtualization doctor | ✅ `getMacVirtualizationDoctor` | ⚠️ Stub — `{ hypervisorsDetected: [] }` | Windows Hyper-V / WSL / VirtualBox detection not implemented in the shared route. *(WSL is partially covered via `/api/windows/wsl`.)* |
| Browser health | ✅ `getMacBrowserHealth` | ⚠️ Stub — `{ browsers: [] }` | Windows browser profile/extension health not implemented. |
| App resource doctor | ✅ `getMacAppResourceDoctor` | ⚠️ Partial — uses `si.processes` generic filter | Real per-app CPU/mem on Windows uses `si.processes` cross-platform approximation, not PowerShell `Get-Process`. Lacks disk I/O breakdown. |
| System events timeline | ✅ `getMacSystemEventsTimeline` | ⚠️ Stub — `{ events: [] }` | Windows Event Log timeline (Security/System/Application) not implemented in this route. *(Event log IS available via `/api/windows/events` and `/api/event-logs`.)* |
| Baseline diff | ✅ `getMacBaselineDiff` | ⚠️ Stub — `{ metrics: [] }` | Windows baseline snapshot delta not implemented. |
| App compatibility checker | ✅ `getMacAppCompatibility` | ⚠️ Stub — `{ appName }` | Windows app compatibility (manifest/ARM64) not implemented. |
| Troubleshoot guide | ✅ `getMacTroubleshootGuide` | ⚠️ Stub — `{ title: 'Troubleshoot' }` | No Windows-specific guided troubleshoot flows implemented. |
| Power assertions (sleep blockers) | ✅ `getMacPowerAssertions` | ⚠️ Stub — `{ sleepPrevented: false, activeBlockers: [] }` | Windows `powercfg /requests` not implemented. |
| Docker storage (shared route) | ✅ `getMacDockerStorage` | ⚠️ Stub — zero values | `/api/storage/docker` returns empty stub for Windows. Docker IS probed in `/api/windows/v2/docker` via `getDockerHealth`. |
| Xcode doctor | ✅ `getMacXcodeDoctor` | ⚠️ macOS-exclusive | No Windows equivalent needed. |
| iOS backups | ✅ `getMacIosBackups` | ⚠️ macOS-exclusive | iTunes/Finder backup path on Windows not implemented. |
| External drives | ✅ `getMacExternalDrives` | ⚠️ Stub — empty array | Windows removable drive enumeration not implemented in `/api/storage/external-drives`. |
| Eject drive | ✅ `POST /api/actions/eject-drive` | ⚠️ macOS-only | Windows disk ejection not implemented. |
| Restart audio engine | ✅ `POST /api/actions/restart-audio` | ⚠️ macOS-only | Windows Audio service restart not implemented. |
| Rebuild icon / thumbnail cache | ✅ `POST /api/actions/rebuild-icon-cache` | ⚠️ macOS-only | Windows thumbnail cache (`thumbcache_*.db`) cleanup not implemented. |
| Homebrew actions | ✅ brew-doctor, brew-autoremove | ⚠️ macOS-only | Expected; no Homebrew on Windows. |
| Thin snapshots | ✅ `POST /api/actions/thin-snapshots` | ⚠️ macOS-only | Windows VSS thinning not implemented. |
| File permissions doctor | ✅ `getMacFilePermissionsDoctor` | ⚠️ Not exposed on Windows | No Windows ACL doctor endpoint exists. |
| App footprint (per-app disk) | ✅ `getMacAppFootprint` | ⚠️ Not implemented | `/api/apps/footprint/:appName` calls `getMacAppFootprint` only; no Windows version. |
| Large files (shared route) | ✅ `getMacLargeFiles` | ⚠️ Not wired | Helper exists (`getMacLargeFiles`) but not exposed via a shared route; Windows uses `/api/windows/storage/large`. |

---

## Gap Analysis — Features Present on Windows but Missing on macOS

| Feature | Windows | macOS | Gap Details |
|---|---|---|---|
| BSOD / minidump analysis | ✅ `getBSODAnalysis` | ⚠️ N/A | Platform-exclusive. macOS equivalent would be kernel panic logs (not implemented). |
| Driver inventory & signing audit | ✅ Full driver suite | ⚠️ N/A | No macOS kext/driver audit exposed. |
| Windows Update history & failed updates | ✅ Full update suite | ⚠️ Partial | macOS only has `getMacUpdateDoctor` (pending updates); no history or failed-update breakdown. |
| Winget app update / uninstall | ✅ Implemented | ⚠️ N/A | macOS Homebrew covers CLI tools; no GUI-app update via mas-cli. |
| Delivery Optimization cache purge | ✅ Implemented | ⚠️ N/A | Platform-exclusive. |
| Prefetch cache cleanup | ✅ Implemented | ⚠️ N/A | Platform-exclusive. |
| Print spooler flush | ✅ Implemented | ⚠️ N/A | Platform-exclusive. |
| Recovery (WinRE) status & restore | ✅ Implemented | ⚠️ N/A | macOS Recovery Mode not accessible from userland. |
| SFC / DISM repair | ✅ Implemented | ⚠️ N/A | macOS equivalent (`diskutil repairVolume`) not exposed. |
| Service dependency graph | ✅ `getServiceDependencies` | ⚠️ Not implemented | macOS `launchctl` dependency info not exposed. |
| Duplicate files detector | ✅ `getDuplicateFiles` | ⚠️ Not implemented | No macOS duplicate file scanner exposed. |
| DNS diagnostics (detailed) | ✅ `getDNSDiagnostics` | ⚠️ Not exposed | macOS DNS doctor not exposed in network routes. |
| Firewall rules listing | ✅ `getFirewallRules` | ⚠️ Not exposed | macOS `pf` / Application Firewall rules not exposed. |
| Windows Search index rebuild | ✅ Implemented | ⚠️ N/A | macOS equivalent: `/api/actions/rebuild-search-index` (Spotlight) not wired. |
| Scheduled task analysis | ✅ `getScheduledTaskAnalysis` | ⚠️ N/A | macOS `launchd` plist analysis not exposed. |

---

## Summary Counts

| Category | macOS | Windows |
|---|---|---|
| **Fully implemented features** | ~90 | ~85 |
| **Stubs (static/empty returns)** | 0 | ~18 |
| **macOS-exclusive (by design)** | ~15 | — |
| **Windows-exclusive (by design)** | — | ~14 |
| **Gaps requiring Windows implementation** | — | ~18 |
| **Gaps requiring macOS implementation** | ~8 | — |

### Priority Gaps to Close (Windows)

1. **Audio doctor** — Windows WASAPI/MMDevice device health
2. **Camera & mic doctor** — WMI `Win32_PnPEntity` / Device Manager
3. **Display doctor** — WMI `Win32_DesktopMonitor` / EDID
4. **System events timeline** — wire existing `/api/windows/events` to the shared route stub
5. **SSH doctor** — parse `%USERPROFILE%\.ssh\config`
6. **External drives** — WMI `Win32_DiskDrive` / removable media
7. **Power assertions** — `powercfg /requests`
8. **App footprint** — per-app disk usage via PowerShell
9. **Baseline diff** — wire Windows snapshot delta to the shared route
10. **Browser health** — Chrome/Edge profile health via filesystem probes
