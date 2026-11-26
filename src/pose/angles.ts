import { Landmark, LandmarkIndex, PoseFrame } from './types';

function mid(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1) };
}

export function get(frame: PoseFrame, index: number): Landmark | null {
  const lm = frame.landmarks[index];
  if (!lm) return null;
  if ((lm.visibility ?? 1) < 0.3) return null;
  return lm;
}

/** Angle at B formed by points A-B-C, in degrees. */
export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const rad =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((rad * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

export function hipCenter(frame: PoseFrame): Landmark | null {
  const l = get(frame, LandmarkIndex.leftHip);
  const r = get(frame, LandmarkIndex.rightHip);
  if (!l || !r) return null;
  return mid(l, r);
}

export function shoulderCenter(frame: PoseFrame): Landmark | null {
  const l = get(frame, LandmarkIndex.leftShoulder);
  const r = get(frame, LandmarkIndex.rightShoulder);
  if (!l || !r) return null;
  return mid(l, r);
}

export function wristCenter(frame: PoseFrame): Landmark | null {
  const l = get(frame, LandmarkIndex.leftWrist);
  const r = get(frame, LandmarkIndex.rightWrist);
  if (!l || !r) return null;
  return mid(l, r);
}

export function kneeCenter(frame: PoseFrame): Landmark | null {
  const l = get(frame, LandmarkIndex.leftKnee);
  const r = get(frame, LandmarkIndex.rightKnee);
  if (!l || !r) return null;
  return mid(l, r);
}

export function ankleCenter(frame: PoseFrame): Landmark | null {
  const l = get(frame, LandmarkIndex.leftAnkle);
  const r = get(frame, LandmarkIndex.rightAnkle);
  if (!l || !r) return null;
  return mid(l, r);
}

/** Hip extension proxy: shoulder–hip–knee angle (higher ≈ more open). */
export function hipExtensionDeg(frame: PoseFrame): number | null {
  const s = shoulderCenter(frame);
  const h = hipCenter(frame);
  const k = kneeCenter(frame);
  if (!s || !h || !k) return null;
  return angleDeg(s, h, k);
}

/** Knee extension: hip–knee–ankle. */
export function kneeExtensionDeg(frame: PoseFrame): number | null {
  const h = hipCenter(frame);
  const k = kneeCenter(frame);
  const a = ankleCenter(frame);
  if (!h || !k || !a) return null;
  return angleDeg(h, k, a);
}

/** Elbow lock proxy: shoulder–elbow–wrist (avg both sides). */
export function armLockDeg(frame: PoseFrame): number | null {
  const ls = get(frame, LandmarkIndex.leftShoulder);
  const le = get(frame, LandmarkIndex.leftElbow);
  const lw = get(frame, LandmarkIndex.leftWrist);
  const rs = get(frame, LandmarkIndex.rightShoulder);
  const re = get(frame, LandmarkIndex.rightElbow);
  const rw = get(frame, LandmarkIndex.rightWrist);
  const left = ls && le && lw ? angleDeg(ls, le, lw) : null;
  const right = rs && re && rw ? angleDeg(rs, re, rw) : null;
  if (left == null && right == null) return null;
  if (left == null) return right;
  if (right == null) return left;
  return (left + right) / 2;
}

/** Horizontal distance wrists vs hips (normalized coords). Lower = bar closer to body. */
export function barBodyGap(frame: PoseFrame): number | null {
  const w = wristCenter(frame);
  const h = hipCenter(frame);
  if (!w || !h) return null;
  return Math.abs(w.x - h.x);
}

/** Torso lean: vertical vs shoulder–hip vector (0 = upright). */
export function torsoLeanDeg(frame: PoseFrame): number | null {
  const s = shoulderCenter(frame);
  const h = hipCenter(frame);
  if (!s || !h) return null;
  const dx = s.x - h.x;
  const dy = s.y - h.y;
  const rad = Math.atan2(Math.abs(dx), Math.abs(dy) + 1e-6);
  return (rad * 180) / Math.PI;
}
