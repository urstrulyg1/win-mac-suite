import { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import type { PlatformConfig, PlatformType, PlatformCapabilities } from './types';
import { WINDOWS_CONFIG } from './windows';
import { MACOS_CONFIG } from './macos';
import { detectPlatform } from './detector';
import { getDefaultCapabilities } from './capabilities';
import type { SystemInfo, Section } from '../types';

interface PlatformContextValue {
  platform: PlatformType;
  config: PlatformConfig;
  capabilities: PlatformCapabilities;
  isWindows: boolean;
  isMac: boolean;
  isSupported: boolean;
  createPlatformSections: () => Section[];
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({
  children,
  systemInfo,
  backendPlatform,
  backendCapabilities,
}: {
  children: ReactNode;
  systemInfo: SystemInfo;
  backendPlatform?: string;
  backendCapabilities?: PlatformCapabilities;
}) {
  const platform = useMemo(() => {
    return detectPlatform(backendPlatform, systemInfo.os);
  }, [backendPlatform, systemInfo.os]);

  const config = useMemo(() => {
    return platform === 'macos' ? MACOS_CONFIG : WINDOWS_CONFIG;
  }, [platform]);

  const capabilities = useMemo(() => {
    return backendCapabilities || getDefaultCapabilities(platform);
  }, [backendCapabilities, platform]);

  // Update browser document title dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (platform === 'unsupported') {
        document.title = 'System Maintenance Suite — Unsupported OS';
      } else {
        document.title = `${config.productName} — ${config.subtitle}`;
      }
    }
  }, [config.productName, config.subtitle, platform]);

  const createPlatformSections = useMemo(() => {
    return (): Section[] => {
      return config.phases.map((p) => ({
        id: p.id,
        number: p.number,
        title: p.title,
        description: p.description,
        icon: p.icon,
        status: 'pending',
        progress: 0,
        duration: 0,
        result: '',
        logs: [],
        details: p.details,
      }));
    };
  }, [config.phases]);

  const value: PlatformContextValue = {
    platform,
    config,
    capabilities,
    isWindows: platform === 'windows',
    isMac: platform === 'macos',
    isSupported: platform !== 'unsupported',
    createPlatformSections,
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    const platform = detectPlatform();
    const config = platform === 'macos' ? MACOS_CONFIG : WINDOWS_CONFIG;
    return {
      platform,
      config,
      capabilities: getDefaultCapabilities(platform),
      isWindows: platform === 'windows',
      isMac: platform === 'macos',
      isSupported: platform !== 'unsupported',
      createPlatformSections: () => config.phases.map((p) => ({
        id: p.id,
        number: p.number,
        title: p.title,
        description: p.description,
        icon: p.icon,
        status: 'pending',
        progress: 0,
        duration: 0,
        result: '',
        logs: [],
        details: p.details,
      })),
    };
  }
  return ctx;
}
