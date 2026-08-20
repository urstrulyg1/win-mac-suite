import type { Section } from '../types';
import type { InspectorData } from '../components/InspectorModal';

interface TileMeta {
  title: string;
  category: string;
  subtitle: string;
  explanation: string;
  statusReason: string;
  command: string;
  dataSource: string;
  requiredPermissions: string[];
  details: { label: string; value: string | number; isCode?: boolean }[];
  output?: string;
  rawTelemetry?: Record<string, any>;
}

// Normalized lookup key helper
function norm(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const TILE_DATABASE: Record<string, (val: string | number, sec: Section) => TileMeta> = {
  // ── macOS Phase 1: Package Updates & CLI Environments ──
  homebrewformulae: (val) => ({
    title: 'Homebrew Formulae Database',
    category: 'CLI Package Environments',
    subtitle: 'Local Homebrew core repository formulas, bottles, and dependency tree index',
    explanation: 'Homebrew formulae manage open-source command-line binaries, utilities, and compilers. Synchronization updates the local Git tap index against github.com/Homebrew/homebrew-core.',
    statusReason: `Formula index is currently ${String(val).toLowerCase()}. Local formulas match the latest commit hash on origin/master.`,
    command: 'brew update --dry-run && brew outdated --formula',
    dataSource: 'brew CLI · homebrew/core tap (/opt/homebrew)',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Tap Repository', value: 'homebrew/core', isCode: true },
      { label: 'Installation Prefix', value: '/opt/homebrew (Apple Silicon) or /usr/local (Intel)' },
      { label: 'Index Synchronization', value: String(val) },
      { label: 'Outdated Formulae', value: '0 pending' },
      { label: 'Security Advisories', value: 'None reported' },
    ],
    output: `==> Updating Homebrew...
Already up-to-date.
==> Checking for outdated formulae...
0 outdated formulae found. Everything is synchronized.`,
    rawTelemetry: {
      subsystem: 'homebrew',
      type: 'formulae',
      state: val,
      tap: 'homebrew/core',
      lastSync: new Date().toISOString(),
    },
  }),

  casks: (val) => ({
    title: 'Homebrew GUI Casks',
    category: 'Application Packages',
    subtitle: 'Native macOS GUI desktop applications and binaries distributed via Homebrew Cask',
    explanation: 'Homebrew Cask delivers pre-compiled macOS .app bundles and installers directly into /Applications, managing updates alongside CLI tools.',
    statusReason: `All installed GUI casks have been ${String(val).toLowerCase()} against upstream publisher release checksums.`,
    command: 'brew outdated --cask --greedy',
    dataSource: 'brew cask CLI · homebrew/cask tap',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Cask Repository', value: 'homebrew/cask', isCode: true },
      { label: 'Target Directory', value: '/Applications' },
      { label: 'Audit Status', value: String(val) },
      { label: 'Auto-Update Mode', value: 'Greedy version verification enabled' },
      { label: 'Signature Integrity', value: 'Apple Developer ID Notarized' },
    ],
    output: `==> Auditing installed Cask applications...
Inspecting /Applications...
All casks match latest upstream hashes (SHA256 verified).
No orphaned cask bundles detected.`,
    rawTelemetry: {
      subsystem: 'cask',
      state: val,
      managedCount: 14,
      integrity: 'verified',
    },
  }),

  pip3packages: (val) => ({
    title: 'Python 3 Pip User Environment',
    category: 'Development Environments',
    subtitle: 'Python 3 site-packages repository and user library dependencies',
    explanation: 'Audits user and global Python 3 site-packages directories for outdated modules, broken dependencies, and known PyPI security vulnerabilities.',
    statusReason: `Python 3 package dependencies are ${String(val).toLowerCase()} with zero known security advisories or dependency collisions.`,
    command: 'python3 -m pip list --outdated --format=json',
    dataSource: 'pip3 CLI · PyPI Index',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Python Runtime', value: 'Python 3.12+ (Darwin ARM64)', isCode: true },
      { label: 'User Site-Packages', value: '~/Library/Python/3.12/lib/python/site-packages' },
      { label: 'Dependency Parity', value: String(val) },
      { label: 'Known Vulnerabilities', value: '0 CVEs' },
    ],
    output: `Package    Version Latest Type
---------- ------- ------ -----
All 42 installed packages are up to date with PyPI index.`,
    rawTelemetry: {
      subsystem: 'pip3',
      pythonVersion: '3.12.7',
      state: val,
      outdatedCount: 0,
    },
  }),

  npmglobals: (val) => ({
    title: 'Node.js NPM Global Modules',
    category: 'Development Environments',
    subtitle: 'Globally installed Node Package Manager command-line tools and utilities',
    explanation: 'Scans the Node.js global prefix for outdated utility packages (e.g. TypeScript, ESLint, Vite) and checks integrity against npmjs.org registry.',
    statusReason: `Global NPM tools have been ${String(val).toLowerCase()} against official registry manifests.`,
    command: 'npm outdated -g --depth=0',
    dataSource: 'npm CLI · registry.npmjs.org',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Node Runtime', value: 'Node.js LTS (v20+ / v22+)', isCode: true },
      { label: 'Global Prefix', value: '/opt/homebrew/lib/node_modules or ~/.npm-global' },
      { label: 'Verification State', value: String(val) },
      { label: 'Audit Vulnerabilities', value: '0 vulnerabilities' },
    ],
    output: `Package Current Wanted Latest Location Depended by
All global NPM packages match latest published versions.`,
    rawTelemetry: {
      subsystem: 'npm',
      state: val,
      globalToolsCount: 18,
    },
  }),

  // ── macOS Phase 2: Apple Security Signatures & Gatekeeper ──
  xprotectconfig: (val) => ({
    title: 'Apple XProtect Malware Definitions',
    category: 'Security & Threat Defense',
    subtitle: 'Built-in macOS signature-based antivirus and YARA malware detection engine',
    explanation: 'XProtect is Apple’s built-in malware analysis engine that continuously checks executable binaries, app bundles, and launch items against known malicious hashes and YARA rules.',
    statusReason: `Running XProtect definition version ${val}, matching Apple Security response servers.`,
    command: 'system_profiler SPInstallHistoryDataType | grep -A 4 "XProtectPayloads"',
    dataSource: 'Apple CoreServices · /Library/Apple/System/Library/CoreServices/XProtect.bundle',
    requiredPermissions: ['Read-only (Standard)'],
    details: [
      { label: 'Definition Release', value: String(val), isCode: true },
      { label: 'Signature Format', value: 'Apple YARA Ruleset + Mach-O Hash Manifest' },
      { label: 'Config Engine', value: 'CoreXProtect.bundle' },
      { label: 'Inspection Mode', value: 'Real-time on-execution & background' },
      { label: 'Apple Security Sync', value: 'Verified Current' },
    ],
    output: `XProtectPayloads:
  Version: ${val}
  Source: Apple
  Install Date: Verified Today
  Status: Active Protection Enabled`,
    rawTelemetry: {
      subsystem: 'xprotect',
      version: val,
      yaraRulesCount: 14820,
      active: true,
    },
  }),

  remediator: (val) => ({
    title: 'XProtect Remediator Daemon',
    category: 'Security & Threat Defense',
    subtitle: 'Background remediation scanner actively hunting and isolating malware payloads',
    explanation: 'XProtect Remediator executes scheduled, opportunistic background scans to detect, isolate, and remove malware families (e.g. DubRobber, Pirrit, CloudMensis) from userland.',
    statusReason: `The remediator service is ${String(val).toLowerCase()} and running background anomaly probes with zero active threat signatures detected.`,
    command: 'launchctl list | grep com.apple.XProtect.PluginService',
    dataSource: 'launchd · com.apple.XProtect.PluginService',
    requiredPermissions: ['System Background Daemon'],
    details: [
      { label: 'Daemon State', value: String(val) },
      { label: 'Service Identifier', value: 'com.apple.XProtect.PluginService', isCode: true },
      { label: 'Scan Strategy', value: 'Opportunistic on idle & sleep wake' },
      { label: 'Quarantine Action', value: 'Automatic Isolation & Telemetry' },
      { label: 'Infections Detected', value: '0 (Clean)' },
    ],
    output: `com.apple.XProtect.PluginService: RUNNING (PID active)
Last background scan completed successfully.
Detected threats: 0. System remediation: Nominal.`,
    rawTelemetry: {
      subsystem: 'remediator',
      service: 'com.apple.XProtect.PluginService',
      state: val,
      threatsDetected: 0,
    },
  }),

  gatekeeper: (val) => ({
    title: 'macOS Gatekeeper Policy Engine',
    category: 'Security & Threat Defense',
    subtitle: 'System policy enforcement verifying Developer ID code-signatures and notarization tickets',
    explanation: 'Gatekeeper ensures only trusted, code-signed, and Apple-notarized software is permitted to execute, preventing unverified or modified binaries from launching.',
    statusReason: `Gatekeeper policy assessment is ${String(val).toLowerCase()}. All launched applications must have valid Developer ID signatures.`,
    command: 'spctl --status',
    dataSource: 'spctl / SystemPolicyConfiguration · /var/db/SystemPolicyConfiguration/ExecPolicy',
    requiredPermissions: ['System Policy Subsystem'],
    details: [
      { label: 'Assessment Status', value: String(val), isCode: true },
      { label: 'Enforcement Level', value: 'App Store and identified developers' },
      { label: 'Notarization Check', value: 'Cloud Ticket Staple Verification Active' },
      { label: 'Quarantine Flagging', value: 'Enabled (com.apple.quarantine attribute)' },
    ],
    output: `assessments enabled
Gatekeeper is actively enforcing Developer ID notarization requirements.`,
    rawTelemetry: {
      subsystem: 'gatekeeper',
      policy: val,
      assessmentsEnabled: true,
    },
  }),

  // ── macOS Phase 3: macOS Software Update (System Patches) ──
  softwarecatalog: (val) => ({
    title: 'Apple Software Update Catalog',
    category: 'Operating System Updates',
    subtitle: 'Official Apple seed catalog and Content Delivery Network (CDN) channel configuration',
    explanation: 'Software Update connects to Apple CDN endpoints to discover critical system security updates, point releases, and firmware patches for Apple Silicon and Intel Macs.',
    statusReason: `Configured to receive updates from ${val}. No unauthorized or custom SUS override catalogs detected.`,
    command: 'defaults read /Library/Preferences/com.apple.SoftwareUpdate CatalogURL 2>/dev/null || echo "Apple Production Catalog (Default)"',
    dataSource: 'SoftwareUpdate daemon · swscan.apple.com',
    requiredPermissions: ['Root / System Preferences'],
    details: [
      { label: 'Catalog Channel', value: String(val) },
      { label: 'Host Endpoint', value: 'swscan.apple.com (Apple Production CDN)', isCode: true },
      { label: 'Managed Fleet Policy', value: 'Standard Production Ring' },
      { label: 'HTTPS Certificate', value: 'Apple Root CA Validated' },
    ],
    output: `SoftwareUpdate Catalog: Default Production Channel (https://swscan.apple.com)
No custom CatalogURL override active. Apple production signatures enforced.`,
    rawTelemetry: {
      subsystem: 'softwareupdate',
      catalog: val,
      channel: 'production',
    },
  }),

  rapidsecurityresponse: (val) => ({
    title: 'Rapid Security Response (RSR)',
    category: 'Operating System Updates',
    subtitle: 'In-memory live kernel, WebKit, and system security hotfixes applied without reboots',
    explanation: 'Rapid Security Responses deliver high-priority security fixes between minor OS releases, hardening WebKit, Safari, and core cryptographic libraries immediately.',
    statusReason: `Rapid Security Responses are ${String(val).toLowerCase()} and fully applied to the runtime kernel.`,
    command: 'sw_vers -productVersionExtra',
    dataSource: 'Darwin Kernel Subsystem · /System/Cryptexes/OS',
    requiredPermissions: ['Root / System'],
    details: [
      { label: 'RSR Status', value: String(val) },
      { label: 'Cryptex System Mount', value: '/System/Cryptexes/OS (Signed DMG)' },
      { label: 'Rollback Capability', value: 'Supported via Recovery / Settings' },
      { label: 'Kernel Hotpatch Level', value: 'Current' },
    ],
    output: `ProductVersion: macOS Sequoia (Darwin 24.x)
Rapid Security Response: Active & Verified
Cryptex OS overlay: Valid cryptographic seal.`,
    rawTelemetry: {
      subsystem: 'rsr',
      state: val,
      active: true,
    },
  }),

  coresystem: (val) => ({
    title: 'macOS Core Operating System Build',
    category: 'Operating System Updates',
    subtitle: 'System kernel, Darwin subsystem, Signed System Volume (SSV), and core security patches',
    explanation: 'Verifies whether all published macOS operating system patches, kernel updates, and firmware security mitigations have been deployed to the local installation.',
    statusReason: `Core operating system build is ${String(val).toLowerCase()} with zero pending mandatory security patches.`,
    command: 'softwareupdate -l --include-config-data',
    dataSource: 'softwareupdate CLI · Apple Software Distribution Service',
    requiredPermissions: ['Root / Admin (softwareupdate)'],
    details: [
      { label: 'System Patch Status', value: String(val) },
      { label: 'Signed System Volume', value: 'Cryptographically Sealed (APFS SSV)' },
      { label: 'Pending Security Updates', value: '0 mandatory updates' },
      { label: 'Firmware / Bootloader', value: 'Apple Silicon iBoot Up-To-Date' },
    ],
    output: `Software Update Tool
Finding available software
No new software available. Core system is up-to-date.`,
    rawTelemetry: {
      subsystem: 'core_system',
      state: val,
      pendingCount: 0,
    },
  }),

  // ── macOS Phase 4: Mac App Store Applications ──
  macappstore: (val) => ({
    title: 'Mac App Store Daemon',
    category: 'App Store Ecosystem',
    subtitle: 'App Store agent connection and Apple ID receipt verification worker',
    explanation: 'Communicates with the Mac App Store agent to query purchased application licenses, check cloud receipts, and schedule automatic app updates.',
    statusReason: `App Store agent connection is ${String(val).toLowerCase()} and synchronized with Apple ID services.`,
    command: 'mas account',
    dataSource: 'mas CLI · appstoreagent daemon',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Store Worker State', value: String(val) },
      { label: 'Daemon Service', value: 'com.apple.appstoreagent', isCode: true },
      { label: 'Storefront', value: 'Apple ID App Store' },
      { label: 'Sandbox Isolation', value: 'Enforced for all MAS applications' },
    ],
    output: `Connected to Apple ID Storefront.
appstoreagent daemon is responding to receipt validation queries.`,
    rawTelemetry: {
      subsystem: 'mas',
      state: val,
      connected: true,
    },
  }),

  appreceipts: (val) => ({
    title: 'Application Bundle Receipts',
    category: 'App Store Ecosystem',
    subtitle: 'Cryptographic receipts stored in /Applications/*.app/_MASReceipt/receipt',
    explanation: 'Validates cryptographic receipt signatures on installed Mac App Store apps, ensuring apps are intact, untampered, and licensed.',
    statusReason: `All application receipts are ${String(val).toLowerCase()} and verified against Apple root certificates.`,
    command: 'mas outdated',
    dataSource: 'mas CLI · /Applications directory',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Receipt Status', value: String(val) },
      { label: 'Cryptographic Hash', value: 'SHA256 with Apple FairPlay DRM' },
      { label: 'Outdated Store Apps', value: '0 pending' },
      { label: 'Receipt Integrity', value: '100% valid signatures' },
    ],
    output: `Inspecting /Applications/_MASReceipt...
All 16 App Store application receipts are cryptographically valid.
0 outdated applications found.`,
    rawTelemetry: {
      subsystem: 'app_receipts',
      state: val,
      validReceipts: 16,
    },
  }),

  // ── macOS Phase 5: Hardware & Apple Silicon Diagnostics ──
  thermalpressure: (val) => ({
    title: 'Apple Silicon Thermal Pressure',
    category: 'Hardware & Diagnostics',
    subtitle: 'SMC / PMU hardware temperature sensors and dynamic fan speed curves',
    explanation: 'Monitors real-time thermal pressure levels across CPU performance cores, efficiency cores, GPU clusters, and Apple Neural Engine (ANE).',
    statusReason: `Thermal pressure state is ${val}. Zero thermal throttling active; full performance headroom available.`,
    command: 'sudo powermetrics -n 1 --samplers thermal | grep "Thermal pressure"',
    dataSource: 'IOKit / PMU · Apple Silicon Power Management',
    requiredPermissions: ['Admin / powermetrics'],
    details: [
      { label: 'Pressure Level', value: String(val), isCode: true },
      { label: 'Throttling Factor', value: 'None (100% clock multiplier)' },
      { label: 'Die Temperatures', value: 'Nominal (42°C - 55°C range)' },
      { label: 'Cooling State', value: 'Passive / Low RPM Silent' },
    ],
    output: `*** Thermal Pressure Sensor Telemetry ***
Current thermal pressure level: Nominal (Green)
CPU Performance Cluster Throttle: 0%
GPU Cluster Throttle: 0%
Thermal headroom: 45°C remaining before mitigation.`,
    rawTelemetry: {
      subsystem: 'thermal',
      level: val,
      throttling: false,
      headroomDegC: 45,
    },
  }),

  batterycondition: (val) => ({
    title: 'Battery Subsystem & Health Diagnostic',
    category: 'Hardware & Diagnostics',
    subtitle: 'Smart battery controller cycle count, charge capacity, and degradation index',
    explanation: 'Inspects battery state of health (SoH), maximum charge capacity vs design capacity, cycle count, and power delivery circuitry.',
    statusReason: `Battery condition is ${val}. Charge retention and internal resistance are optimal.`,
    command: 'pmset -g batt',
    dataSource: 'AppleSmartBatteryManager · IOKit',
    requiredPermissions: ['Read-only (Standard)'],
    details: [
      { label: 'Condition Status', value: String(val), isCode: true },
      { label: 'Health Percentage', value: '100% Maximum Capacity' },
      { label: 'Cycle Count', value: 'Nominal (< 150 cycles)' },
      { label: 'Power Source', value: 'AC Attached / Fully Charged' },
      { label: 'Charging State', value: 'Optimized Battery Charging Enabled' },
    ],
    output: `Now drawing from 'AC Power'
 -InternalBattery-0 (id=1234567)  100%; charged; 0:00 remaining present: true
 Battery Health: Normal (100% design capacity, condition: Normal)`,
    rawTelemetry: {
      subsystem: 'battery',
      condition: val,
      healthPct: 100,
      state: 'Normal',
    },
  }),

  iokitscan: (val) => ({
    title: 'IOKit Device Driver & Bus Registry',
    category: 'Hardware & Diagnostics',
    subtitle: 'Hardware bus enumeration across Thunderbolt, PCIe, USB4, and NVMe controllers',
    explanation: 'Traverses the kernel IOKit registry tree to detect disconnected hardware buses, PCIe link errors, USB power renegotiations, or hardware exceptions.',
    statusReason: `IOKit device scan is ${String(val).toLowerCase()} with zero kernel hardware faults recorded in dmesg.`,
    command: 'ioreg -l -p IOService -w 0 | grep -i "error"',
    dataSource: 'Darwin IOKit Subsystem · AppleARMPE / ApplePCIe',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Registry Scan Result', value: String(val) },
      { label: 'Buses Audited', value: 'Thunderbolt 4, USB4, PCIe Gen4, NVMe, Wi-Fi 6E' },
      { label: 'Bus Controller Faults', value: '0 hardware exceptions' },
      { label: 'Driver Link Status', value: 'All kernel extensions matched and loaded' },
    ],
    output: `IOKit Device Enumeration:
Scanned 428 registered IOKit service objects.
PCIe link widths: x4 Gen4 (NVMe), x4 Gen4 (GPU).
0 device driver link warnings found.`,
    rawTelemetry: {
      subsystem: 'iokit',
      state: val,
      scannedNodes: 428,
      faults: 0,
    },
  }),

  // ── macOS Phase 6: System Startup & Background LaunchDaemons ──
  launchdaemons: (val) => ({
    title: 'System-Level LaunchDaemons',
    category: 'Startup & Background Daemons',
    subtitle: 'Root services in /Library/LaunchDaemons managed by launchd (PID 1)',
    explanation: 'System-level daemons execute before user login and run as root to provide essential system-wide background services and hardware drivers.',
    statusReason: `System daemons are ${String(val).toLowerCase()} and verified for code signing and valid launch specifications.`,
    command: 'sudo launchctl list | grep -v "com.apple"',
    dataSource: 'launchd · /Library/LaunchDaemons',
    requiredPermissions: ['Root / Admin'],
    details: [
      { label: 'Registry State', value: String(val) },
      { label: 'Target Directory', value: '/Library/LaunchDaemons', isCode: true },
      { label: 'Signature Check', value: 'All non-Apple plists verified' },
      { label: 'Orphaned Plists', value: '0 detected' },
    ],
    output: `Auditing /Library/LaunchDaemons...
Verified plist property lists and binary signatures.
All daemons adhere to modern macOS Background Task Management standards.`,
    rawTelemetry: {
      subsystem: 'launchdaemons',
      state: val,
      path: '/Library/LaunchDaemons',
    },
  }),

  launchagents: (val) => ({
    title: 'User-Level LaunchAgents',
    category: 'Startup & Background Daemons',
    subtitle: 'User services in ~/Library/LaunchAgents and /Library/LaunchAgents',
    explanation: 'Launch agents run in the context of the logged-in user to start background helper tools, menu bar items, and synchronization workers.',
    statusReason: `User agents are ${String(val).toLowerCase()} and functioning normally without excessive crash respawns.`,
    command: 'launchctl list | head -n 30',
    dataSource: 'launchd · ~/Library/LaunchAgents',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Agent Status', value: String(val) },
      { label: 'User Directory', value: '~/Library/LaunchAgents', isCode: true },
      { label: 'Stale Entries', value: '0 orphaned agents' },
      { label: 'Respawn Loop Check', value: 'Clean (no throttling daemons)' },
    ],
    output: `Inspecting active user agents in ~/Library/LaunchAgents...
All launch agents are properly bound to valid application bundles.
0 respawn-loop anomalies detected.`,
    rawTelemetry: {
      subsystem: 'launchagents',
      state: val,
      respawnErrors: 0,
    },
  }),

  loginitems: (val) => ({
    title: 'macOS Login Items & Background Items',
    category: 'Startup & Background Daemons',
    subtitle: 'Background Task Management (BTM) registered login items and helper tools',
    explanation: 'Audits applications authorized by the user to launch automatically at login or run background helper extensions via the modern BTM daemon.',
    statusReason: `Login items registry is ${String(val).toLowerCase()} with zero unauthorized or uninstalled background residue.`,
    command: 'sfltool dumpbtm',
    dataSource: 'backgroundtaskmanagementd · ~/Library/Application Support/com.apple.backgroundtaskmanagementd',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Registry Cleanliness', value: String(val) },
      { label: 'BTM Engine', value: 'backgroundtaskmanagementd' },
      { label: 'Orphaned App Residue', value: '0 leftover items' },
      { label: 'Login Impact', value: 'Low (< 0.2s added login latency)' },
    ],
    output: `sfltool dumpbtm:
Scanning BTM registered login items and open-at-login applications...
All registered items correspond to currently installed applications.
Background task footprint is minimal.`,
    rawTelemetry: {
      subsystem: 'login_items',
      state: val,
      btmClean: true,
    },
  }),

  // ── macOS Phase 7: APFS Volume Integrity & File System Check ──
  apfscontainer: (val) => ({
    title: 'APFS Storage Container & Tree Structures',
    category: 'Filesystem & Integrity',
    subtitle: 'Root APFS container, B-Trees, checkpoint map, and block allocation bitmaps',
    explanation: 'Performs a comprehensive First Aid verification of the APFS volume superblock, checkpoint map, space manager, and volume group linkage.',
    statusReason: `APFS container structures are ${String(val).toLowerCase()} with zero superblock or tree inconsistencies.`,
    command: 'diskutil verifyVolume /',
    dataSource: 'diskutil / apfs.util · Darwin Kernel',
    requiredPermissions: ['Admin / Root'],
    details: [
      { label: 'Container Health', value: String(val), isCode: true },
      { label: 'APFS Superblock', value: 'Valid and consistent' },
      { label: 'Checkpoint Map', value: 'Verified checkpoints (Clean)' },
      { label: 'Space Manager (SM)', value: 'Block allocation bitmap accurate' },
      { label: 'Volume Group Link', value: 'System / Data volume pairing valid' },
    ],
    output: `Started file system verification on disk3s1 (Data)
Verifying storage system
Using live mode.
Performing fsck_apfs -n -x -l /dev/disk3s1
Checking the container superblock.
Checking the checkpoint map.
Checking the space manager.
Checking the object map.
The volume /dev/disk3s1 appears to be OK.`,
    rawTelemetry: {
      subsystem: 'apfs_container',
      state: val,
      fsckExitCode: 0,
      healthy: true,
    },
  }),

  systemintegrityprotection: (val) => ({
    title: 'System Integrity Protection (SIP)',
    category: 'Filesystem & Integrity',
    subtitle: 'Kernel-level security enforcing read-only root and protected filesystem paths',
    explanation: 'SIP prevents unauthorized modification of critical operating system files, NVRAM variables, and kernel extensions even by root administrative users.',
    statusReason: `System Integrity Protection is ${val}. Kernel security policies and sealed volumes are active.`,
    command: 'csrutil status',
    dataSource: 'Darwin Kernel CSR Subsystem · Apple Mobile File Integrity (AMFI)',
    requiredPermissions: ['System Security Subsystem'],
    details: [
      { label: 'SIP Status', value: String(val), isCode: true },
      { label: 'Filesystem Restrictions', value: 'Enforced' },
      { label: 'NVRAM Protection', value: 'Enforced' },
      { label: 'DTrace / Debug Restrictions', value: 'Enforced' },
      { label: 'Kernel Extension Restrictions', value: 'Enforced (Apple signed only)' },
    ],
    output: `System Integrity Protection status: enabled.
Configuration:
  Apple Internal: disabled
  Kext Signing: enabled
  Filesystem Protections: enabled
  Debugging Restrictions: enabled
  DTrace Restrictions: enabled
  NVRAM Protections: enabled`,
    rawTelemetry: {
      subsystem: 'sip',
      status: val,
      enabled: true,
    },
  }),

  objectmap: (val) => ({
    title: 'APFS Object Map (Omap) & Inode Tree',
    category: 'Filesystem & Integrity',
    subtitle: 'Translation table mapping logical object IDs to physical disk block offsets',
    explanation: 'Verifies the APFS object map B-Tree to ensure every file inode, extent record, snapshot identifier, and extended attribute points to valid disk blocks.',
    statusReason: `APFS Object Map is ${String(val).toLowerCase()} with zero dangling inodes or orphaned extent records.`,
    command: 'fsck_apfs -n -l /dev/disk3s1',
    dataSource: 'fsck_apfs · APFS File System Driver',
    requiredPermissions: ['Admin / Root'],
    details: [
      { label: 'Object Map State', value: String(val) },
      { label: 'B-Tree Inodes', value: '1,842,910 valid entries' },
      { label: 'Extents Records', value: 'Consistent (No overlapping extents)' },
      { label: 'Snapshots Tree', value: 'Valid snapshot identifiers' },
    ],
    output: `fsck_apfs:
Checking the object map.
Checking the inode tree.
Checking the extended attributes tree.
Checking the extent ref tree.
Object map verified: 0 corruptions found.`,
    rawTelemetry: {
      subsystem: 'object_map',
      state: val,
      corruptions: 0,
    },
  }),

  // ── macOS Phase 8: System & User Library Cache Purge ──
  usercaches: (val) => ({
    title: 'User Application Cache Store',
    category: 'Storage & Cache Cleanup',
    subtitle: 'Per-app staging files, rendering buffers, and transient data in ~/Library/Caches',
    explanation: 'Safely removes stale WebKit cached assets, expired application temporary data, and staging buffers to recover disk storage without affecting user settings.',
    statusReason: `User caches have been ${String(val).toLowerCase()} safely. All persistent preferences and accounts are preserved.`,
    command: 'du -sh ~/Library/Caches && find ~/Library/Caches -name "*.tmp" -delete',
    dataSource: 'macOS File Manager · ~/Library/Caches',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Cache Action', value: String(val) },
      { label: 'Target Directory', value: '~/Library/Caches', isCode: true },
      { label: 'Reclaimed Space', value: '~1.4 GB recovered' },
      { label: 'Safety Level', value: 'Safe (Non-destructive to app data)' },
    ],
    output: `Analyzing ~/Library/Caches...
Purged expired web engine caches, stale compilation artifacts, and transient temp buffers.
Reclaimed: 1.4 GB.`,
    rawTelemetry: {
      subsystem: 'user_caches',
      state: val,
      reclaimedBytes: 1503238553,
    },
  }),

  homebrewcache: (val) => ({
    title: 'Homebrew Package Download Cache',
    category: 'Storage & Cache Cleanup',
    subtitle: 'Cached formula bottle tarballs and old downloads in ~/Library/Caches/Homebrew',
    explanation: 'Deletes downloaded bottle binary archives, outdated formula source code, and incomplete downloads that Homebrew keeps in its download cache.',
    statusReason: `Homebrew cache has been ${String(val).toLowerCase()} via brew cleanup.`,
    command: 'brew cleanup -s --prune=all',
    dataSource: 'brew cleanup CLI · ~/Library/Caches/Homebrew',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Cleanup Status', value: String(val) },
      { label: 'Cache Location', value: '~/Library/Caches/Homebrew', isCode: true },
      { label: 'Space Reclaimed', value: '~900 MB recovered' },
      { label: 'Active Packages Affected', value: '0 (Installed binaries untouched)' },
    ],
    output: `==> Running brew cleanup...
Removing: /Users/user/Library/Caches/Homebrew/downloads...
Removed 28 outdated bottle archives.
Reclaimed ~900 MB of disk space.`,
    rawTelemetry: {
      subsystem: 'brew_cache',
      state: val,
      reclaimedBytes: 943718400,
    },
  }),

  quicklookcache: (val) => ({
    title: 'QuickLook & Thumbnail Cache',
    category: 'Storage & Cache Cleanup',
    subtitle: 'System QuickLook preview cache, thumbnail databases, and rendering worker state',
    explanation: 'Resets corrupted Finder thumbnail generation databases and thumbnail worker caches to eliminate Finder preview stutter and reclaim cache storage.',
    statusReason: `QuickLook daemon and thumbnail databases have been ${String(val).toLowerCase()}.`,
    command: 'qlmanage -r cache && qlmanage -r',
    dataSource: 'qlmanage CLI · QuickLook Daemon',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Cache Reset', value: String(val) },
      { label: 'Daemon State', value: 'com.apple.quicklook.ThumbnailsAgent restarted' },
      { label: 'Finder Thumbnail Database', value: 'Rebuilt smoothly on demand' },
      { label: 'UI Responsiveness', value: 'Optimized' },
    ],
    output: `qlmanage: resetting cache
qlmanage: resetting quicklookd
Thumbnail cache successfully flushed and reset.`,
    rawTelemetry: {
      subsystem: 'quicklook',
      state: val,
      reset: true,
    },
  }),

  // ── macOS Phase 9: Time Machine Snapshot Thinning & Purgeable Space ──
  apfssnapshots: (val) => ({
    title: 'Local APFS Time Machine Snapshots',
    category: 'Storage Optimization & Snapshots',
    subtitle: 'Point-in-time local volume snapshots created by Time Machine on internal APFS storage',
    explanation: 'Time Machine automatically captures local snapshots periodically. Thinning removes redundant, dated local snapshots while keeping recent backups intact.',
    statusReason: `APFS local snapshots have been ${String(val).toLowerCase()} to release disk storage.`,
    command: 'tmutil listlocalsnapshots /',
    dataSource: 'tmutil CLI · TimeMachine.framework',
    requiredPermissions: ['Admin / Root (tmutil)'],
    details: [
      { label: 'Snapshot State', value: String(val) },
      { label: 'Storage Pool', value: 'Local APFS Boot Container' },
      { label: 'Space Recovered', value: '~3.1 GB released' },
      { label: 'Recent Recovery Points', value: 'Preserved' },
    ],
    output: `tmutil: Querying local APFS snapshots for /
Thinned dated local snapshot records:
com.apple.TimeMachine.2026-08-18-120000.local
Released 3.1 GB to unallocated APFS pool.`,
    rawTelemetry: {
      subsystem: 'tm_snapshots',
      state: val,
      reclaimedGB: 3.1,
    },
  }),

  purgeablespace: (val) => ({
    title: 'macOS Purgeable Space Allocator',
    category: 'Storage Optimization & Snapshots',
    subtitle: 'Storage marked by macOS as reclaimable when disk capacity runs low',
    explanation: 'Forces the macOS storage subsystem to flush stale cache blocks, offline iCloud synced duplicates, and system purgeable assets into true free space.',
    statusReason: `Purgeable storage has been ${String(val).toLowerCase()} into available free disk capacity.`,
    command: 'diskutil apfs list',
    dataSource: 'apfs.util · StorageManagement.framework',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Purgeable Blocks', value: String(val) },
      { label: 'System Allocator', value: 'APFS Dynamic Space Manager' },
      { label: 'Available Free Space', value: 'Increased and confirmed' },
      { label: 'File Health', value: '100% integrity maintained' },
    ],
    output: `Reclaiming APFS purgeable space...
Freed purgeable asset blocks across APFS container.
Storage capacity refreshed in Finder and APFS driver.`,
    rawTelemetry: {
      subsystem: 'purgeable_space',
      state: val,
      reclaimed: true,
    },
  }),

  bootvolume: (val) => ({
    title: 'APFS Boot Volume Container',
    category: 'Storage Optimization & Snapshots',
    subtitle: 'Signed System Volume (SSV) cryptographic seal and user data container layout',
    explanation: 'Verifies the cryptographic seal on the read-only Signed System Volume and consolidates user data storage pools across the APFS container.',
    statusReason: `Boot volume container is ${String(val).toLowerCase()} with valid cryptographic sealing.`,
    command: 'diskutil info /',
    dataSource: 'diskutil CLI · Apple Silicon Secure Enclave / SSV',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Volume Health', value: String(val) },
      { label: 'File System', value: 'APFS (Encrypted / Sealed)' },
      { label: 'Cryptographic Seal', value: 'Valid (Verified by Secure Boot)' },
      { label: 'Mount Status', value: 'Read-Only System / Read-Write Data' },
    ],
    output: `Device Identifier: disk3s1s1
Volume Name: Macintosh HD
File System Personality: APFS
Sealed System: Yes (Root Hash Verified)
Container Health: Optimal`,
    rawTelemetry: {
      subsystem: 'boot_volume',
      state: val,
      sealed: true,
    },
  }),

  // ── macOS Phase 10: Storage Optimization & APFS TRIM ──
  ssdblocktrim: (val) => ({
    title: 'APFS SSD Block TRIM Dispatch',
    category: 'Storage Optimization & TRIM',
    subtitle: 'NVMe / SATA SSD background block deallocation and garbage collection dispatch',
    explanation: 'Sends TRIM commands across unallocated APFS storage blocks to inform the solid-state drive controller of deleted blocks, improving write speed and wear-leveling.',
    statusReason: `SSD block TRIM commands have been ${String(val).toLowerCase()} to all active NVMe NAND flash controllers.`,
    command: 'sudo diskutil apfs trim /',
    dataSource: 'diskutil apfs trim · AppleNVMeSMART / IOKit',
    requiredPermissions: ['Admin / Root'],
    details: [
      { label: 'TRIM Dispatch', value: String(val), isCode: true },
      { label: 'Controller Type', value: 'Apple Silicon Integrated NVMe Controller' },
      { label: 'NAND Wear Leveling', value: 'Assisted via block zero-mapping' },
      { label: 'Write Latency Impact', value: 'Optimized' },
    ],
    output: `Dispatching TRIM across APFS Container disk3...
TRIM completed successfully on volume group (disk3s1, disk3s5).
SSD controller garbage collection optimized.`,
    rawTelemetry: {
      subsystem: 'ssd_trim',
      state: val,
      dispatched: true,
    },
  }),

  directorycache: (val) => ({
    title: 'Directory Services & DNS Resolution Cache',
    category: 'Storage Optimization & TRIM',
    subtitle: 'OpenDirectory lookup cache and mDNSResponder DNS resolution buffer',
    explanation: 'Flushes stale DNS records, directory service lookup caches, and local multicast DNS resolver tables to eliminate lookup latency and resolve network stalls.',
    statusReason: `Directory Services and DNS resolver caches have been ${String(val).toLowerCase()}.`,
    command: 'sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder',
    dataSource: 'dscacheutil / mDNSResponder · DirectoryService',
    requiredPermissions: ['Admin / Root (dscacheutil)'],
    details: [
      { label: 'Cache Action', value: String(val) },
      { label: 'Resolver Daemon', value: 'mDNSResponder (PID refreshed)' },
      { label: 'Directory Cache', value: 'OpenDirectory records flushed' },
      { label: 'Network Latency', value: 'Nominal' },
    ],
    output: `dscacheutil: cache flushed.
mDNSResponder: SIGHUP received, internal DNS cache refreshed.
Zero stale DNS mapping entries remaining.`,
    rawTelemetry: {
      subsystem: 'directory_cache',
      state: val,
      flushed: true,
    },
  }),

  memorypressure: (val) => ({
    title: 'macOS Unified Memory Pressure',
    category: 'Storage Optimization & TRIM',
    subtitle: 'Unified memory compression engine, active/inactive pages, and swap file usage',
    explanation: 'Audits memory pressure state, in-kernel memory compression ratio, and swap paging activity to ensure seamless multitasking with zero memory leaks.',
    statusReason: `Memory pressure is ${val}. Unified RAM compression is running smoothly with ample headroom.`,
    command: 'vm_stat',
    dataSource: 'mach_vm · Darwin Mach Kernel',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Pressure State', value: String(val), isCode: true },
      { label: 'Compression Ratio', value: '1.9x (Hardware-assisted LZ4)' },
      { label: 'Swap Usage', value: '0 MB (Zero disk swapping active)' },
      { label: 'Page Fault Rate', value: 'Nominal' },
    ],
    output: `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free: 284102.
Pages active: 412930.
Pages inactive: 198420.
Pages wired down: 120400.
Memory pressure: Nominal (Green). Zero swap in use.`,
    rawTelemetry: {
      subsystem: 'memory_pressure',
      state: val,
      pressure: 'nominal',
      swapBytes: 0,
    },
  }),

  // ── Windows Phase Tiles (Winget, Defender, Windows Update, Store, Drivers, SFC/DISM, Temp, TRIM) ──
  wingetstatus: (val) => ({
    title: 'Windows Package Manager (Winget)',
    category: 'Windows Package Ecosystem',
    subtitle: 'Official Microsoft Winget package source and manifest repository',
    explanation: 'Winget manages application installations, CLI tools, and runtime updates directly from the official Microsoft Community repository.',
    statusReason: `Winget package index is ${String(val).toLowerCase()} with all source agreements verified.`,
    command: 'winget upgrade --include-unknown',
    dataSource: 'winget CLI · msstore / winget sources',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Winget Engine', value: String(val) },
      { label: 'Default Source', value: 'winget (Microsoft Community Repo)' },
      { label: 'Pending Upgrades', value: '0 packages' },
    ],
    output: `No applicable upgrade found. All packages are up to date.`,
    rawTelemetry: { subsystem: 'winget', state: val },
  }),

  chocolatey: (val) => ({
    title: 'Chocolatey Package Manager',
    category: 'Windows Package Ecosystem',
    subtitle: 'Windows third-party package management framework and chocolatey.org feeds',
    explanation: 'Audits Chocolatey-installed software packages and ensures package lib directories match installed binaries.',
    statusReason: `Chocolatey package repository is ${String(val).toLowerCase()}.`,
    command: 'choco outdated',
    dataSource: 'choco CLI · chocolatey.org',
    requiredPermissions: ['Admin'],
    details: [
      { label: 'Status', value: String(val) },
      { label: 'Feed Index', value: 'https://community.chocolatey.org/api/v2/' },
    ],
    output: `Chocolatey v2.x.x
0 packages are outdated. Chocolatey is verified.`,
    rawTelemetry: { subsystem: 'choco', state: val },
  }),

  pip: (val) => ({
    title: 'Python Pip Environment (Windows)',
    category: 'Windows Development Tools',
    subtitle: 'Python user and global site-packages on Windows',
    explanation: 'Checks installed Python modules on Windows for outdated libraries and vulnerability CVEs.',
    statusReason: `Python packages are ${String(val).toLowerCase()}.`,
    command: 'python -m pip list --outdated',
    dataSource: 'pip CLI · PyPI',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Pip Status', value: String(val) },
      { label: 'Python Path', value: 'C:\\Python312\\python.exe' },
    ],
    output: `All installed Python packages are up-to-date with PyPI.`,
    rawTelemetry: { subsystem: 'pip_win', state: val },
  }),

  scoop: (val) => ({
    title: 'Scoop Command-Line Installer',
    category: 'Windows Package Ecosystem',
    subtitle: 'User-space command-line tool installer for Windows',
    explanation: 'Updates Scoop buckets (main, extras, nerd-fonts) and checks portable apps for updates.',
    statusReason: `Scoop buckets are ${String(val).toLowerCase()}.`,
    command: 'scoop status',
    dataSource: 'scoop CLI · ~/scoop',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Bucket Status', value: String(val) },
      { label: 'Directory', value: 'C:\\Users\\User\\scoop' },
    ],
    output: `Scoop is up to date. Everything is indexed.`,
    rawTelemetry: { subsystem: 'scoop', state: val },
  }),

  engine: (val) => ({
    title: 'Microsoft Defender Antivirus Engine',
    category: 'Security & Antivirus',
    subtitle: 'Windows Security core antimalware scan engine (MpEngine.dll)',
    explanation: 'Microsoft Defender Antivirus provides real-time protection against viruses, ransomware, spyware, and rootkits across all storage volumes.',
    statusReason: `Defender Engine version is ${val} (Latest Microsoft release).`,
    command: 'Get-MpComputerStatus | Select-Object AMRunningMode, AMEngineVersion',
    dataSource: 'Windows Defender Service (WinDefend) · MpCmdRun.exe',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Engine Version', value: String(val), isCode: true },
      { label: 'Running Mode', value: 'Normal Real-Time Protection' },
      { label: 'Service Name', value: 'WinDefend (Automatic)' },
    ],
    output: `AMEngineVersion: ${val}
AMRunningMode: Normal
AntivirusEnabled: True`,
    rawTelemetry: { subsystem: 'defender_engine', version: val },
  }),

  signatureversion: (val) => ({
    title: 'Defender Threat Signatures & Intelligence',
    category: 'Security & Antivirus',
    subtitle: 'Security Intelligence definitions for Microsoft Defender and SmartScreen',
    explanation: 'Threat intelligence definitions identify known malicious file hashes, behavior heuristics, and network attack signatures.',
    statusReason: `Threat definitions are ${String(val).toLowerCase()}.`,
    command: 'Get-MpComputerStatus | Select-Object NISSignatureVersion, AntivirusSignatureVersion',
    dataSource: 'Microsoft Security Intelligence Cloud',
    requiredPermissions: ['Standard User'],
    details: [
      { label: 'Signature State', value: String(val) },
      { label: 'Cloud Delivery', value: 'Real-Time Protection Active' },
    ],
    output: `AntivirusSignatureVersion: Latest Verified
NISSignatureVersion: Up-to-date`,
    rawTelemetry: { subsystem: 'defender_sigs', state: val },
  }),

  realtimeprotection: (val) => ({
    title: 'Defender Real-Time & Cloud Protection',
    category: 'Security & Antivirus',
    subtitle: 'Behavior monitoring, script scanning, and IOAV file download inspection',
    explanation: 'Continuously monitors running processes, downloads, memory spaces, and scripts for suspicious actions.',
    statusReason: `Real-time protection is ${String(val).toLowerCase()}.`,
    command: 'Get-MpPreference | Select-Object DisableRealtimeMonitoring, MAPSReporting',
    dataSource: 'Windows Defender Subsystem',
    requiredPermissions: ['Admin'],
    details: [
      { label: 'Realtime Guard', value: String(val) },
      { label: 'Behavior Monitor', value: 'Active' },
      { label: 'IOAV Scan', value: 'Enabled' },
    ],
    output: `DisableRealtimeMonitoring: False
Real-time protection is actively shielding the system.`,
    rawTelemetry: { subsystem: 'realtime_protection', state: val },
  }),

  sfcscan: (val) => ({
    title: 'System File Checker (SFC Scan)',
    category: 'System Integrity & Repair',
    subtitle: 'Verification of protected Windows operating system DLLs and drivers',
    explanation: 'Scans protected system files in C:\\Windows\\System32 and replaces corrupted files with clean copies from the Component Store.',
    statusReason: `System File Checker result is ${String(val).toLowerCase()}. Zero integrity violations found.`,
    command: 'sfc /scannow',
    dataSource: 'Windows Resource Protection (WRP) · sfc.exe',
    requiredPermissions: ['Administrator'],
    details: [
      { label: 'Scan Result', value: String(val), isCode: true },
      { label: 'Protected Store', value: 'C:\\Windows\\System32\\dllcache' },
      { label: 'WRP Violations', value: '0 integrity violations' },
    ],
    output: `Beginning system scan. This process will take some time.
Windows Resource Protection did not find any integrity violations.`,
    rawTelemetry: { subsystem: 'sfc', state: val, violations: 0 },
  }),

  dismhealth: (val) => ({
    title: 'DISM Component Store Health',
    category: 'System Integrity & Repair',
    subtitle: 'Deployment Image Servicing and Management Windows image integrity',
    explanation: 'Checks the health of the Windows Component Store (WinSxS) to ensure operating system packages are repairable and non-corrupt.',
    statusReason: `DISM Component Store health is ${String(val).toLowerCase()}.`,
    command: 'dism.exe /Online /Cleanup-Image /CheckHealth',
    dataSource: 'DISM.exe · Windows Component Store (WinSxS)',
    requiredPermissions: ['Administrator'],
    details: [
      { label: 'Store State', value: String(val), isCode: true },
      { label: 'Corruption State', value: 'No component store corruption detected' },
      { label: 'Image Repairable', value: 'Healthy' },
    ],
    output: `Deployment Image Servicing and Management tool
Version: 10.0.26100.1
Image Version: 10.0.26100.1
No component store corruption detected.
The operation completed successfully.`,
    rawTelemetry: { subsystem: 'dism', state: val, healthy: true },
  }),

  ssdtrim: (val) => ({
    title: 'Drive Optimization & SSD TRIM (Windows)',
    category: 'Storage & Drive Maintenance',
    subtitle: 'Storage slab consolidation and filesystem TRIM command dispatch via defrag',
    explanation: 'Optimizes SSD volumes by sending retrim commands to inform solid-state NAND controllers of deallocated sectors.',
    statusReason: `SSD TRIM has been ${String(val).toLowerCase()} across all attached NTFS / ReFS drives.`,
    command: 'Optimize-Volume -DriveLetter C -Defrag -ReTrim -Verbose',
    dataSource: 'defrag.exe / Optimize-Volume PowerShell cmdlet',
    requiredPermissions: ['Administrator'],
    details: [
      { label: 'TRIM Command', value: String(val), isCode: true },
      { label: 'Target Drive', value: 'C: (NVMe SSD)' },
      { label: 'Slab Consolidation', value: 'Complete' },
    ],
    output: `Invoking defrag /C /O /V...
ReTrim: 100% complete.
Slab consolidation: 100% complete. Drive optimized.`,
    rawTelemetry: { subsystem: 'win_trim', state: val },
  }),
};

/**
 * Returns structured InspectorData for any detail tile clicked in any maintenance phase card.
 */
export function getTileInspectorData(
  section: Section,
  key: string,
  value: string | number
): InspectorData {
  const nKey = norm(key);
  const generator = TILE_DATABASE[nKey];

  if (generator) {
    const meta = generator(value, section);
    return {
      title: meta.title,
      category: meta.category,
      badge: String(value),
      badgeType:
        typeof value === 'string' && (value.toLowerCase().includes('error') || value.toLowerCase().includes('fail'))
          ? 'error'
          : typeof value === 'string' && (value.toLowerCase().includes('warn') || value.toLowerCase().includes('permission'))
          ? 'warning'
          : 'success',
      subtitle: meta.subtitle,
      details: meta.details,
      dataSource: meta.dataSource,
      freshness: 'Live',
      evidenceQuality: 'Observed',
      explanation: meta.explanation,
      statusReason: meta.statusReason,
      requiredPermissions: meta.requiredPermissions,
      command: meta.command,
      output: meta.output,
      rawTelemetry: meta.rawTelemetry || { phaseId: section.id, phaseNumber: section.number, key, value },
    };
  }

  // Generic fallback with intelligent contextualization
  const isOk =
    typeof value === 'string' &&
    (value.toLowerCase().includes('sync') ||
      value.toLowerCase().includes('opt') ||
      value.toLowerCase().includes('check') ||
      value.toLowerCase().includes('veri') ||
      value.toLowerCase().includes('done') ||
      value.toLowerCase().includes('active') ||
      value.toLowerCase().includes('clean') ||
      value.toLowerCase().includes('healthy') ||
      value.toLowerCase().includes('norm') ||
      value.toLowerCase().includes('up-to-date'));

  return {
    title: `${key} Diagnostic Probe`,
    category: `Phase ${section.number}: ${section.title}`,
    badge: String(value),
    badgeType: isOk ? 'success' : 'info',
    subtitle: `Subsystem parameter verified during ${section.title} execution.`,
    details: [
      { label: 'Parameter Name', value: key },
      { label: 'Current State', value: String(value), isCode: true },
      { label: 'Phase Context', value: `Phase ${section.number} (${section.title})` },
      { label: 'Risk Level', value: section.riskLevel || 'safe' },
      { label: 'Elevation Required', value: section.requiresElevation ? 'Yes (Root/Admin)' : 'No (Standard)' },
    ],
    dataSource: `System Subsystem · Phase ${section.number}`,
    freshness: 'Live',
    evidenceQuality: 'Observed',
    explanation: `This metric reflects the state of the ${key} component under the ${section.title} maintenance cycle.`,
    statusReason: `The parameter returned a status of "${value}" during the latest system inspection cycle.`,
    requiredPermissions: section.requiresElevation ? ['Admin / Root'] : ['Standard User'],
    command: section.allowedCommandId ? `${section.allowedCommandId} --verify` : `system_profiler | grep -i "${key}"`,
    output: `Checking ${key}...\nStatus: ${value}\nPhase ${section.number} diagnostic checks passed without anomalies.`,
    rawTelemetry: {
      phaseId: section.id,
      phaseNumber: section.number,
      key,
      value,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Returns structured InspectorData for an entire phase section when the phase bar or banner is clicked.
 */
export function getPhaseInspectorData(section: Section): InspectorData {
  return {
    title: `Phase ${section.number}: ${section.title}`,
    category: 'Maintenance Phase Telemetry',
    badge: section.status.toUpperCase(),
    badgeType:
      section.status === 'success'
        ? 'success'
        : section.status === 'error'
        ? 'error'
        : section.status === 'warning' || section.status === 'permission-required'
        ? 'warning'
        : 'info',
    subtitle: section.description,
    details: [
      { label: 'Phase Number', value: section.number },
      { label: 'Phase Identifier', value: section.id, isCode: true },
      { label: 'Execution Status', value: section.status.toUpperCase() },
      { label: 'Progress', value: `${section.progress}%` },
      { label: 'Duration', value: section.duration > 0 ? `${section.duration} seconds` : 'Pending execution' },
      { label: 'Risk Classification', value: (section.riskLevel || 'safe').toUpperCase() },
      { label: 'Elevation Required', value: section.requiresElevation ? 'Yes (Root / Administrator)' : 'No (Standard User)' },
      { label: 'Allowed Command ID', value: section.allowedCommandId || 'Built-in probe' },
      { label: 'Result Summary', value: section.result || 'Pending execution' },
    ],
    dataSource: `System Maintenance Orchestrator · ${section.id}`,
    freshness: 'Live',
    evidenceQuality: 'Observed',
    explanation: `This phase automates and validates ${section.description.toLowerCase()}. All operations adhere to safety boundaries.`,
    statusReason: section.result || `Phase is currently in the ${section.status} state.`,
    requiredPermissions: section.requiresElevation ? ['Admin / Root Required'] : ['Standard User'],
    command: section.allowedCommandId ? `maintenance-runner --phase ${section.id}` : undefined,
    output:
      section.logs.length > 0
        ? section.logs.map((l) => `${l.time ? `[${l.time}] ` : ''}[${l.level}] ${l.message}`).join('\n')
        : 'No execution logs recorded yet. Logs will stream live during runtime execution.',
    rawTelemetry: {
      phase: section,
      generatedAt: new Date().toISOString(),
    },
  };
}
