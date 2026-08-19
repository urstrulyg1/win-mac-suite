import type { PlatformCapabilities, PlatformType, CapabilityStatus } from './types';

export const DEFAULT_WINDOWS_CAPABILITIES: PlatformCapabilities = {
  winget: 'available',
  chocolatey: 'available',
  scoop: 'available',
  pip: 'available',
  npm: 'available',
  powershell: 'available',
  getWinEvent: 'available',
  getService: 'available',
  getPnpDevice: 'available',
  sfc: 'available',
  dism: 'available',
  defender: 'available',
  windowsUpdate: 'available',
  storageSense: 'available',
  systemRestore: 'available',
};

export const DEFAULT_MACOS_CAPABILITIES: PlatformCapabilities = {
  homebrew: 'available',
  macports: 'not-installed',
  mas: 'available',
  pip: 'available',
  npm: 'available',
  softwareupdate: 'available',
  diskutil: 'available',
  launchctl: 'available',
  tmutil: 'available',
  systemProfiler: 'available',
  mdutil: 'available',
  xcode: 'available',
  cocoapods: 'available',
  gatekeeper: 'available',
  xprotect: 'available',
  sip: 'available',
  fileVault: 'available',
  fullDiskAccess: 'permission-required',
};

export function getDefaultCapabilities(platform: PlatformType): PlatformCapabilities {
  return platform === 'macos' ? DEFAULT_MACOS_CAPABILITIES : DEFAULT_WINDOWS_CAPABILITIES;
}

export function isCapabilityAvailable(caps: PlatformCapabilities, tool: string): boolean {
  const key = tool.toLowerCase().replace(/[^a-z0-9]/g, '');
  const status = caps[key] as CapabilityStatus | undefined;
  return status === 'available';
}
