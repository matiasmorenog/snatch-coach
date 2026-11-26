/** Pose landmark indices (33-point body model). */
export const LandmarkIndex = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export type LandmarkName = keyof typeof LandmarkIndex;

export type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type PoseFrame = {
  tMs: number;
  landmarks: Landmark[];
};

export type CameraSide = 'left' | 'right';
