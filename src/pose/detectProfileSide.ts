import { get } from './angles';
import { CameraSide, LandmarkIndex, PoseFrame } from './types';

const SIDE_LANDMARKS = {
  left: [
    LandmarkIndex.leftShoulder,
    LandmarkIndex.leftHip,
    LandmarkIndex.leftKnee,
    LandmarkIndex.leftAnkle,
    LandmarkIndex.leftElbow,
    LandmarkIndex.leftWrist,
  ],
  right: [
    LandmarkIndex.rightShoulder,
    LandmarkIndex.rightHip,
    LandmarkIndex.rightKnee,
    LandmarkIndex.rightAnkle,
    LandmarkIndex.rightElbow,
    LandmarkIndex.rightWrist,
  ],
} as const;

function sideVisibilityScore(frames: PoseFrame[], side: 'left' | 'right'): number {
  let sum = 0;
  let n = 0;
  const indices = SIDE_LANDMARKS[side];
  for (const frame of frames) {
    for (const idx of indices) {
      const lm = get(frame, idx);
      if (!lm) continue;
      sum += lm.visibility ?? 0.5;
      n += 1;
    }
  }
  return n ? sum / n : 0;
}

/**
 * Infer which body flank faces the camera from a side-view pose series.
 * Near-side joints usually have higher landmark visibility.
 * Returns null if signal is too weak / ambiguous.
 */
export function detectProfileSide(frames: PoseFrame[]): CameraSide | null {
  if (frames.length < 3) return null;

  const left = sideVisibilityScore(frames, 'left');
  const right = sideVisibilityScore(frames, 'right');
  const gap = Math.abs(left - right);

  // Need a clear bias; flat frontal or noisy → unknown
  if (gap < 0.06) return null;
  return right > left ? 'right' : 'left';
}
