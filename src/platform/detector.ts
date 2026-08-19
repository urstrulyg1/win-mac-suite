import type { PlatformType } from './types';

/**
 * Authoritative platform detection hierarchy:
 * 1. Backend response (/api/sysinfo `platform` property)
 * 2. System OS strings from telemetry
 * 3. Browser navigator fallback
 */
export function detectPlatform(backendPlatform?: string, osString?: string): PlatformType {
  // 1. Authoritative backend response
  if (backendPlatform === 'darwin' || backendPlatform === 'macos' || backendPlatform === 'mac') {
    return 'macos';
  }
  if (backendPlatform === 'win32' || backendPlatform === 'windows' || backendPlatform === 'win') {
    return 'windows';
  }
  if (backendPlatform === 'unsupported' || backendPlatform === 'linux') {
    return 'unsupported';
  }

  // 2. OS string from telemetry
  if (osString) {
    const s = osString.toLowerCase();
    if (s.includes('mac') || s.includes('darwin') || s.includes('os x') || s.includes('apple')) {
      return 'macos';
    }
    if (s.includes('win')) {
      return 'windows';
    }
  }

  // 3. Browser runtime environment fallback
  if (typeof window !== 'undefined') {
    const nav = window.navigator as any;
    if (nav?.userAgentData?.platform) {
      const p = nav.userAgentData.platform.toLowerCase();
      if (p.includes('mac')) return 'macos';
      if (p.includes('win')) return 'windows';
    }
    const ua = (nav?.userAgent || nav?.platform || '').toLowerCase();
    if (ua.includes('mac') || ua.includes('darwin') || ua.includes('os x')) {
      return 'macos';
    }
    if (ua.includes('win')) {
      return 'windows';
    }
  }

  // Fallback to windows on development host
  return 'windows';
}
