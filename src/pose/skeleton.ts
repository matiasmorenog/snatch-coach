import { LandmarkIndex } from './types';

/** Bone pairs for a readable coaching skeleton. */
export const SKELETON_BONES: ReadonlyArray<readonly [number, number]> = [
  [LandmarkIndex.leftShoulder, LandmarkIndex.rightShoulder],
  [LandmarkIndex.leftHip, LandmarkIndex.rightHip],
  [LandmarkIndex.leftShoulder, LandmarkIndex.leftHip],
  [LandmarkIndex.rightShoulder, LandmarkIndex.rightHip],
  [LandmarkIndex.leftShoulder, LandmarkIndex.leftElbow],
  [LandmarkIndex.leftElbow, LandmarkIndex.leftWrist],
  [LandmarkIndex.rightShoulder, LandmarkIndex.rightElbow],
  [LandmarkIndex.rightElbow, LandmarkIndex.rightWrist],
  [LandmarkIndex.leftHip, LandmarkIndex.leftKnee],
  [LandmarkIndex.leftKnee, LandmarkIndex.leftAnkle],
  [LandmarkIndex.rightHip, LandmarkIndex.rightKnee],
  [LandmarkIndex.rightKnee, LandmarkIndex.rightAnkle],
  [LandmarkIndex.nose, LandmarkIndex.leftShoulder],
  [LandmarkIndex.nose, LandmarkIndex.rightShoulder],
];

export const DRAW_LANDMARKS = [
  LandmarkIndex.nose,
  LandmarkIndex.leftShoulder,
  LandmarkIndex.rightShoulder,
  LandmarkIndex.leftElbow,
  LandmarkIndex.rightElbow,
  LandmarkIndex.leftWrist,
  LandmarkIndex.rightWrist,
  LandmarkIndex.leftHip,
  LandmarkIndex.rightHip,
  LandmarkIndex.leftKnee,
  LandmarkIndex.rightKnee,
  LandmarkIndex.leftAnkle,
  LandmarkIndex.rightAnkle,
] as const;
