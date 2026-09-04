import type { PlatformType } from './types';

/**
 * Platform detection hierarchy:
 * 1. Backend response (/api/sysinfo platform)
 * 2. OS string from backend telemetry
 * 3. Browser platform only when the backend has not identified the host
 * 4. Unsupported when no trustworthy platform signal exists
 */
export function detectPlatform(backendPlatform?: string, osString?: string): PlatformType {
  if (backendPlatform === 'darwin' || backendPlatform === 'macos' || backendPlatform === 'mac') return 'macos';
  if (backendPlatform === 'win32' || backendPlatform === 'windows' || backendPlatform === 'win') return 'windows';
  if (backendPlatform === 'unsupported' || backendPlatform === 'linux') return 'unsupported';

  if (osString) {
    const s = osString.toLowerCase();
    if (s.includes('mac') || s.includes('darwin') || s.includes('os x') || s.includes('apple')) return 'macos';
    if (s.includes('win')) return 'windows';
  }

  if (typeof window !== 'undefined') {
    const nav = window.navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform?.toLowerCase() || nav.userAgent?.toLowerCase() || nav.platform?.toLowerCase() || '';
    if (platform.includes('mac') || platform.includes('darwin') || platform.includes('os x')) return 'macos';
    if (platform.includes('win')) return 'windows';
  }

  return 'unsupported';
}
