import {
  armLockDeg,
  barBodyGap,
  hipExtensionDeg,
  kneeExtensionDeg,
  shoulderCenter,
  wristCenter,
} from '../pose/angles';
import { PoseFrame } from '../pose/types';

export type SnatchPhase =
  | 'setup'
  | 'first_pull'
  | 'second_pull'
  | 'turnover'
  | 'catch'
  | 'stand'
  | 'unknown';

export type PhaseSpan = {
  phase: SnatchPhase;
  startMs: number;
  endMs: number;
};

/**
 * Heuristic phase segmentation from side-view pose series.
 * Tunable thresholds — calibrate with real snatches.
 */
export function detectPhases(frames: PoseFrame[]): PhaseSpan[] {
  if (frames.length < 5) {
    return [{ phase: 'unknown', startMs: 0, endMs: frames.at(-1)?.tMs ?? 0 }];
  }

  const labeled = frames.map((f) => {
    const hip = hipExtensionDeg(f) ?? 90;
    const knee = kneeExtensionDeg(f) ?? 90;
    const armsRaw = armLockDeg(f);
    // ~0° usually means broken colinearity during turnover, not a real lock
    const arms = armsRaw == null || armsRaw < 25 ? 140 : armsRaw;
    const wrists = wristCenter(f);
    const shoulders = shoulderCenter(f);
    const overhead = wrists && shoulders ? wrists.y < shoulders.y - 0.05 : false;
    return { tMs: f.tMs, hip, knee, arms, overhead };
  });

  // Peak extension ≈ second pull
  let maxHip = -Infinity;
  let peakIdx = 0;
  for (let i = 0; i < labeled.length; i++) {
    if (labeled[i].hip > maxHip) {
      maxHip = labeled[i].hip;
      peakIdx = i;
    }
  }

  const minCatchIdx = Math.max(peakIdx + 1, Math.floor(labeled.length * 0.55));
  const catchIdx = labeled.findIndex(
    (r, i) =>
      i >= minCatchIdx && r.overhead && r.arms > 155 && r.knee < 135
  );
  const catchStart = catchIdx >= 0 ? catchIdx : Math.min(peakIdx + 3, labeled.length - 1);

  const standIdx = labeled.findIndex(
    (r, i) => i > catchStart && r.overhead && r.knee > 160 && r.hip > 150
  );

  const firstPullEnd = Math.max(1, Math.floor(peakIdx * 0.55));
  const secondPullEnd = peakIdx;
  const turnoverEnd = catchStart;
  const catchEnd = standIdx >= 0 ? standIdx : labeled.length - 1;

  const spans: PhaseSpan[] = [
    { phase: 'setup', startMs: labeled[0].tMs, endMs: labeled[Math.min(3, labeled.length - 1)].tMs },
    {
      phase: 'first_pull',
      startMs: labeled[Math.min(3, labeled.length - 1)].tMs,
      endMs: labeled[firstPullEnd].tMs,
    },
    {
      phase: 'second_pull',
      startMs: labeled[firstPullEnd].tMs,
      endMs: labeled[secondPullEnd].tMs,
    },
    {
      phase: 'turnover',
      startMs: labeled[secondPullEnd].tMs,
      endMs: labeled[turnoverEnd].tMs,
    },
    {
      phase: 'catch',
      startMs: labeled[turnoverEnd].tMs,
      endMs: labeled[catchEnd].tMs,
    },
  ];

  if (standIdx >= 0) {
    spans.push({
      phase: 'stand',
      startMs: labeled[catchEnd].tMs,
      endMs: labeled[labeled.length - 1].tMs,
    });
  }

  return spans;
}

export function framesInPhase(frames: PoseFrame[], span: PhaseSpan): PoseFrame[] {
  return frames.filter((f) => f.tMs >= span.startMs && f.tMs <= span.endMs);
}

export function avgMetric(
  frames: PoseFrame[],
  metric: (f: PoseFrame) => number | null
): number | null {
  const vals = frames.map(metric).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function maxMetric(
  frames: PoseFrame[],
  metric: (f: PoseFrame) => number | null
): number | null {
  const vals = frames.map(metric).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.max(...vals);
}

export function minMetric(
  frames: PoseFrame[],
  metric: (f: PoseFrame) => number | null
): number | null {
  const vals = frames.map(metric).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.min(...vals);
}

export { barBodyGap, hipExtensionDeg, kneeExtensionDeg, armLockDeg };
