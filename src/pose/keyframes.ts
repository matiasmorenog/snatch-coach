import { PhaseSpan } from '../snatch/phases';
import { Landmark, PoseFrame } from './types';

export type PoseKeyframe = {
  phase: PhaseSpan['phase'];
  labelEs: string;
  tMs: number;
  landmarks: Landmark[];
  /** Shown in the default (collapsed) skeleton gallery. */
  primary: boolean;
};

const PHASE_LABELS: Record<PhaseSpan['phase'], string> = {
  setup: 'Setup',
  first_pull: 'First pull',
  second_pull: 'Second pull',
  turnover: 'Turnover',
  catch: 'Catch',
  stand: 'Stand',
  unknown: 'Momento clave',
};

/** Default collage: richest coaching moments (not the full snatch timeline). */
export const PRIMARY_PHASES: PhaseSpan['phase'][] = [
  'first_pull',
  'second_pull',
  'catch',
];

const FULL_ORDER: PhaseSpan['phase'][] = [
  'setup',
  'first_pull',
  'second_pull',
  'turnover',
  'catch',
  'stand',
];

/**
 * One mid-phase frame per detected snatch phase (all of them).
 * `primary` marks the default gallery set.
 */
export function pickPoseKeyframes(frames: PoseFrame[], phases: PhaseSpan[]): PoseKeyframe[] {
  if (!frames.length) return [];

  const out: PoseKeyframe[] = [];
  for (const phase of FULL_ORDER) {
    const span = phases.find((p) => p.phase === phase);
    if (!span) continue;
    const mid = (span.startMs + span.endMs) / 2;
    const frame = nearestFrame(frames, mid);
    if (!frame) continue;
    out.push({
      phase,
      labelEs: PHASE_LABELS[phase],
      tMs: frame.tMs,
      landmarks: frame.landmarks.map((l) => ({ ...l })),
      primary: PRIMARY_PHASES.includes(phase),
    });
  }

  if (!out.length) {
    const mid = frames[Math.floor(frames.length / 2)];
    out.push({
      phase: 'unknown',
      labelEs: PHASE_LABELS.unknown,
      tMs: mid.tMs,
      landmarks: mid.landmarks.map((l) => ({ ...l })),
      primary: true,
    });
  }

  // If somehow no primary matched, promote first ones
  if (!out.some((k) => k.primary)) {
    out.slice(0, 3).forEach((k) => {
      k.primary = true;
    });
  }

  return out;
}

function nearestFrame(frames: PoseFrame[], tMs: number): PoseFrame | null {
  let best = frames[0] ?? null;
  let bestDist = Infinity;
  for (const f of frames) {
    const d = Math.abs(f.tMs - tMs);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}
