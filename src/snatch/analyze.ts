import { PoseFrame } from '../pose/types';
import {
  buildDemoSnatchFrames,
  DemoScenarioId,
} from './demoTrajectory';
import { Finding, runSnatchRules, SnatchAnalysis } from './rules';
import { ScoreReport } from './scoring';

export type AnalyzeInput = {
  frames?: PoseFrame[];
  forceDemo?: boolean;
  /** Which synthetic snatch to use when demo. */
  demoScenarioId?: DemoScenarioId;
  /**
   * Real video but no usable pose/skeleton extracted.
   * Do not fall back to a fake demo score.
   */
  noBodyDetected?: boolean;
};

const NO_BODY_MESSAGE =
  'No se pudo detectar el cuerpo ni armar un esqueleto digital en este video. Revisá que se vea una persona de perfil, cuerpo completo, buena luz, y que no sea solo pared/piso/vacío.';

/**
 * Honest result when pose cannot be read from the clip.
 * No letter-grade pretending it was a snatch analysis.
 */
export function buildNoBodyAnalysis(): SnatchAnalysis {
  const finding: Finding = {
    code: 'NO_BODY_DETECTED',
    severity: 'error',
    phase: 'unknown',
    messageEs: NO_BODY_MESSAGE,
    pointsLost: 0,
  };

  const score: ScoreReport = {
    overallScore: 0,
    grade: 'F',
    gradeLabelEs: 'Sin detección de cuerpo',
    base: 0,
    deductions: [
      {
        code: 'NO_BODY_DETECTED',
        phase: 'unknown',
        points: 0,
        messageEs: NO_BODY_MESSAGE,
      },
    ],
    phaseScores: [],
  };

  return {
    phases: [],
    findings: [finding],
    overallScore: 0,
    score,
    keyframes: [],
    usedDemoPose: false,
    detectedProfileSide: null,
  };
}

/**
 * Entry point for snatch analysis.
 * Demo uses varied named scenarios — not the same trajectory every tap.
 * Real video without frames → no-body result (never a fake demo grade).
 */
export function analyzeSnatch(input: AnalyzeInput = {}): SnatchAnalysis {
  if (input.noBodyDetected) {
    return buildNoBodyAnalysis();
  }

  if (input.forceDemo) {
    const frames = buildDemoSnatchFrames(input.demoScenarioId ?? 'bar_away');
    return runSnatchRules(frames, true);
  }

  if (!input.frames?.length) {
    return buildNoBodyAnalysis();
  }

  return runSnatchRules(input.frames, false);
}

export function hasNoBodyDetection(findings: { code: string }[]): boolean {
  return findings.some((f) => f.code === 'NO_BODY_DETECTED');
}
