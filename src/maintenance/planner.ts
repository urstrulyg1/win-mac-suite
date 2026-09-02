import type { RunMode } from '../types';
import type { PlatformConfig, PlatformCapabilities } from '../platform/types';
import type { MaintenancePlan, PlannedPhase } from './types';

export function createMaintenancePlan(
  config: PlatformConfig,
  mode: RunMode,
  _capabilities?: PlatformCapabilities,
  selectedPhaseIds?: string[],
): MaintenancePlan {
  const phases: PlannedPhase[] = config.phases.map((template) => {
    let skip = false;
    let skipReason: string | undefined;

    if (mode === 'Custom') {
      if (selectedPhaseIds && selectedPhaseIds.length > 0) {
        skip = !selectedPhaseIds.includes(template.id);
        skipReason = skip ? 'Deselected in Custom profile' : undefined;
      }
    } else {
      skip = template.skipModes.includes(mode);
      skipReason = skip ? `Excluded in ${mode} profile` : undefined;
    }

    return {
      template,
      phaseId: template.id,
      number: template.number,
      title: template.title,
      description: template.description,
      skip,
      skipReason,
      riskLevel: template.riskLevel,
      requiresElevation: template.requiresElevation,
      targetTools: template.targetTools,
    };
  });

  const activePhases = phases.filter((p) => !p.skip);
  const skippedPhases = phases.filter((p) => p.skip);

  // Highest risk calculation
  let highestRiskLevel: PlannedPhase['riskLevel'] = 'safe';
  if (activePhases.some((p) => p.riskLevel === 'advanced')) {
    highestRiskLevel = 'advanced';
  } else if (activePhases.some((p) => p.riskLevel === 'moderate')) {
    highestRiskLevel = 'moderate';
  }

  const estimatedDurationSeconds = activePhases.reduce(
    (acc, p) => acc + (p.template.minDuration + p.template.maxDuration) / 2,
    0,
  );

  return {
    mode,
    platform: config.platform,
    totalPhases: phases.length,
    activePhases,
    skippedPhases,
    phases,
    estimatedDurationSeconds: Math.round(estimatedDurationSeconds),
    highestRiskLevel,
    requiresElevation: activePhases.some((p) => p.requiresElevation),
  };
}
