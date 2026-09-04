import type { PlatformCapabilities, PlatformType, CapabilityStatus } from './types';

/**
 * Capabilities are observations, not platform constants. Until the backend
 * probes the host, no capability is assumed to exist or be installed.
 */
export function getDefaultCapabilities(_platform: PlatformType): PlatformCapabilities {
  return {};
}

export function isCapabilityAvailable(caps: PlatformCapabilities, tool: string): boolean {
  const key = tool.toLowerCase().replace(/[^a-z0-9]/g, '');
  const status = caps[key] as CapabilityStatus | undefined;
  return status === 'available';
}
