import {
  armLockDeg,
  barBodyGap,
  hipExtensionDeg,
  kneeExtensionDeg,
  torsoLeanDeg,
} from '../pose/angles';
import { detectProfileSide } from '../pose/detectProfileSide';
import { pickPoseKeyframes, PoseKeyframe } from '../pose/keyframes';
import { CameraSide, PoseFrame } from '../pose/types';
import {
  SnatchPhase,
  avgMetric,
  detectPhases,
  framesInPhase,
  maxMetric,
  minMetric,
} from './phases';
import { buildScoreReport, ScoreReport } from './scoring';

export type FindingSeverity = 'info' | 'warn' | 'error';

export type Finding = {
  code: string;
  severity: FindingSeverity;
  phase: SnatchPhase;
  messageEs: string;
  /** Points subtracted from 100 when this finding fires. */
  pointsLost?: number;
};

export type SnatchAnalysis = {
  phases: ReturnType<typeof detectPhases>;
  findings: Finding[];
  overallScore: number;
  score: ScoreReport;
  keyframes: PoseKeyframe[];
  usedDemoPose: boolean;
  /** Auto from pose visibility — which flank faces the camera. */
  detectedProfileSide: CameraSide | null;
};

/** Tunable thresholds — adjust after real snatches. */
export const THRESHOLDS = {
  firstPullMaxBarGap: 0.12,
  secondPullMinHipExt: 155,
  secondPullMinKneeExt: 160,
  earlyArmBendMax: 155,
  catchMinArmLock: 160,
  catchMaxTorsoLean: 25,
  catchMaxKnee: 120,
} as const;

function pushFinding(list: Finding[], f: Finding | null) {
  if (f) list.push(f);
}

export function runSnatchRules(frames: PoseFrame[], usedDemoPose = false): SnatchAnalysis {
  const phases = detectPhases(frames);
  const findings: Finding[] = [];
  const detectedProfileSide = detectProfileSide(frames);

  const first = phases.find((p) => p.phase === 'first_pull');
  const second = phases.find((p) => p.phase === 'second_pull');
  const turnover = phases.find((p) => p.phase === 'turnover');
  const catchPhase = phases.find((p) => p.phase === 'catch');

  if (first) {
    const gap = avgMetric(framesInPhase(frames, first), barBodyGap);
    pushFinding(
      findings,
      gap != null && gap > THRESHOLDS.firstPullMaxBarGap
        ? {
            code: 'BAR_FAR_FIRST_PULL',
            severity: 'warn',
            phase: 'first_pull',
            messageEs:
              'En el first pull la barra se aleja del cuerpo. Mantenela cerca de espinillas/muslos.',
          }
        : null
    );
  }

  if (second) {
    const hip = maxMetric(framesInPhase(frames, second), hipExtensionDeg);
    const knee = maxMetric(framesInPhase(frames, second), kneeExtensionDeg);
    pushFinding(
      findings,
      hip != null && hip < THRESHOLDS.secondPullMinHipExt
        ? {
            code: 'INCOMPLETE_HIP_EXT',
            severity: 'error',
            phase: 'second_pull',
            messageEs:
              'Falta extensión de cadera antes del turnover. Terminá el second pull más alto.',
          }
        : null
    );
    pushFinding(
      findings,
      knee != null && knee < THRESHOLDS.secondPullMinKneeExt
        ? {
            code: 'INCOMPLETE_KNEE_EXT',
            severity: 'warn',
            phase: 'second_pull',
            messageEs: 'Rodillas no llegan a extensión completa en el second pull.',
          }
        : null
    );
  }

  if (turnover && second) {
    const earlyArms = minMetric(framesInPhase(frames, second), armLockDeg);
    pushFinding(
      findings,
      earlyArms != null && earlyArms < THRESHOLDS.earlyArmBendMax
        ? {
            code: 'EARLY_ARM_BEND',
            severity: 'warn',
            phase: 'second_pull',
            messageEs:
              'Los brazos se doblan temprano. Empujá con piernas/cadera antes de tirar de brazos.',
          }
        : null
    );
  }

  if (catchPhase) {
    const catchFrames = framesInPhase(frames, catchPhase);
    const arms = avgMetric(catchFrames, armLockDeg);
    const lean = avgMetric(catchFrames, torsoLeanDeg);
    const knee = minMetric(catchFrames, kneeExtensionDeg);

    pushFinding(
      findings,
      arms != null && arms < THRESHOLDS.catchMinArmLock
        ? {
            code: 'SOFT_CATCH_ARMS',
            severity: 'error',
            phase: 'catch',
            messageEs: 'Catch con brazos blandos. Buscá lock overhead firme.',
          }
        : null
    );
    pushFinding(
      findings,
      lean != null && lean > THRESHOLDS.catchMaxTorsoLean
        ? {
            code: 'CATCH_TORSO_LEAN',
            severity: 'warn',
            phase: 'catch',
            messageEs: 'Torso muy inclinado en el catch. Buscá torso más erecto bajo la barra.',
          }
        : null
    );
    pushFinding(
      findings,
      knee != null && knee > THRESHOLDS.catchMaxKnee
        ? {
            code: 'HIGH_CATCH',
            severity: 'info',
            phase: 'catch',
            messageEs: 'Catch alto (poca profundidad). Si buscás full snatch, sentá más el catch.',
          }
        : null
    );
  }

  if (!findings.length) {
    findings.push({
      code: 'LOOKS_SOLID',
      severity: 'info',
      phase: 'unknown',
      messageEs: 'No saltaron flags fuertes con los umbrales actuales. Seguí grabando para calibrar.',
      pointsLost: 0,
    });
  }

  const score = buildScoreReport(findings);
  for (const f of findings) {
    const d = score.deductions.find((x) => x.code === f.code);
    f.pointsLost = d?.points ?? 0;
  }

  findings.sort((a, b) => (b.pointsLost ?? 0) - (a.pointsLost ?? 0));
  const keyframes = pickPoseKeyframes(frames, phases);

  return {
    phases,
    findings: findings.slice(0, 6),
    overallScore: score.overallScore,
    score,
    keyframes,
    usedDemoPose,
    detectedProfileSide,
  };
}
