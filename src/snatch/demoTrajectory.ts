import { Landmark, LandmarkIndex, PoseFrame } from '../pose/types';

function lm(x: number, y: number, visibility = 0.95): Landmark {
  return { x, y, visibility };
}

function skeleton(joints: {
  shoulder: { x: number; y: number };
  hip: { x: number; y: number };
  knee: { x: number; y: number };
  ankle: { x: number; y: number };
  elbow: { x: number; y: number };
  wrist: { x: number; y: number };
}): Landmark[] {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => lm(0.5, 0.5, 0.1));
  const setBoth = (l: number, r: number, p: { x: number; y: number }) => {
    landmarks[l] = lm(p.x - 0.02, p.y);
    landmarks[r] = lm(p.x + 0.02, p.y);
  };
  setBoth(LandmarkIndex.leftShoulder, LandmarkIndex.rightShoulder, joints.shoulder);
  setBoth(LandmarkIndex.leftHip, LandmarkIndex.rightHip, joints.hip);
  setBoth(LandmarkIndex.leftKnee, LandmarkIndex.rightKnee, joints.knee);
  setBoth(LandmarkIndex.leftAnkle, LandmarkIndex.rightAnkle, joints.ankle);
  setBoth(LandmarkIndex.leftElbow, LandmarkIndex.rightElbow, joints.elbow);
  setBoth(LandmarkIndex.leftWrist, LandmarkIndex.rightWrist, joints.wrist);
  landmarks[LandmarkIndex.nose] = lm(joints.shoulder.x, joints.shoulder.y - 0.08);
  return landmarks;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export type DemoScenarioId =
  | 'bar_away'
  | 'soft_catch'
  | 'early_arms'
  | 'solid';

export type DemoScenario = {
  id: DemoScenarioId;
  titleEs: string;
  blurbEs: string;
};

/** Varied synthetic snatches — cycle these; do not spam identical sessions. */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'bar_away',
    titleEs: 'Barra lejos + catch alto',
    blurbEs: 'First pull abierto y catch poco profundo.',
  },
  {
    id: 'soft_catch',
    titleEs: 'Catch blando',
    blurbEs: 'Pull decente, brazos y torso flojos en el catch.',
  },
  {
    id: 'early_arms',
    titleEs: 'Brazos tempranos',
    blurbEs: 'Second pull con early arm bend; cadera incompleta.',
  },
  {
    id: 'solid',
    titleEs: 'Snatch sólido',
    blurbEs: 'Patrón limpio — score alto, pocos o ningún cue.',
  },
];

type Joints = {
  shoulder: { x: number; y: number };
  hip: { x: number; y: number };
  knee: { x: number; y: number };
  ankle: { x: number; y: number };
  elbow: { x: number; y: number };
  wrist: { x: number; y: number };
};

type PoseAt = (t: number) => Joints;

const poses: Record<DemoScenarioId, PoseAt> = {
  bar_away: (t) => poseBarAway(t),
  soft_catch: (t) => poseSoftCatch(t),
  early_arms: (t) => poseEarlyArms(t),
  solid: (t) => poseSolid(t),
};

export function getDemoScenario(id: DemoScenarioId): DemoScenario {
  return DEMO_SCENARIOS.find((s) => s.id === id) ?? DEMO_SCENARIOS[0];
}

/**
 * Synthetic side-view snatch frames for a named demo scenario.
 */
export function buildDemoSnatchFrames(
  scenarioId: DemoScenarioId = 'bar_away',
  durationMs = 2400,
  fps = 12
): PoseFrame[] {
  const poseAt = poses[scenarioId] ?? poses.bar_away;
  const frames: PoseFrame[] = [];
  const n = Math.max(8, Math.round((durationMs / 1000) * fps));

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const tMs = Math.round(t * durationMs);
    const joints = poseAt(t);
    frames.push({ tMs, landmarks: skeleton(joints) });
  }

  return frames;
}

/** @deprecated use buildDemoSnatchFrames(scenarioId) */
export function buildDemoSnatchFramesLegacy(durationMs = 2400, fps = 12): PoseFrame[] {
  return buildDemoSnatchFrames('bar_away', durationMs, fps);
}

function baseAnkle() {
  return { x: 0.5, y: 0.9 };
}

function poseBarAway(t: number): Joints {
  const ankle = baseAnkle();
  if (t < 0.15) {
    return {
      wrist: { x: 0.36, y: 0.78 },
      elbow: { x: 0.4, y: 0.62 },
      shoulder: { x: 0.46, y: 0.48 },
      hip: { x: 0.5, y: 0.6 },
      knee: { x: 0.52, y: 0.72 },
      ankle,
    };
  }
  if (t < 0.4) {
    const u = (t - 0.15) / 0.25;
    return {
      wrist: { x: lerp(0.34, 0.36, u), y: lerp(0.78, 0.55, u) },
      elbow: { x: lerp(0.38, 0.4, u), y: lerp(0.62, 0.48, u) },
      hip: { x: 0.5, y: lerp(0.6, 0.52, u) },
      shoulder: { x: 0.48, y: lerp(0.48, 0.4, u) },
      knee: { x: 0.52, y: lerp(0.72, 0.62, u) },
      ankle,
    };
  }
  if (t < 0.55) {
    const u = (t - 0.4) / 0.15;
    return {
      hip: { x: 0.5, y: lerp(0.52, 0.38, u) },
      shoulder: { x: 0.49, y: lerp(0.4, 0.26, u) },
      knee: { x: 0.5, y: lerp(0.62, 0.45, u) },
      elbow: { x: lerp(0.4, 0.48, u), y: lerp(0.48, 0.3, u) },
      wrist: { x: lerp(0.36, 0.5, u), y: lerp(0.55, 0.18, u) },
      ankle,
    };
  }
  if (t < 0.7) {
    const u = (t - 0.55) / 0.15;
    return {
      wrist: { x: 0.5, y: lerp(0.18, 0.1, u) },
      elbow: { x: 0.5, y: lerp(0.3, 0.18, u) },
      shoulder: { x: 0.5, y: lerp(0.26, 0.32, u) },
      hip: { x: 0.5, y: lerp(0.38, 0.5, u) },
      knee: { x: 0.5, y: lerp(0.45, 0.68, u) },
      ankle,
    };
  }
  if (t < 0.88) {
    return {
      wrist: { x: 0.5, y: 0.1 },
      elbow: { x: 0.5, y: 0.18 },
      shoulder: { x: 0.5, y: 0.32 },
      hip: { x: 0.5, y: 0.55 },
      knee: { x: 0.5, y: 0.7 },
      ankle,
    };
  }
  const u = (t - 0.88) / 0.12;
  return {
    wrist: { x: 0.5, y: 0.08 },
    elbow: { x: 0.5, y: 0.16 },
    shoulder: { x: 0.5, y: 0.28 },
    hip: { x: 0.5, y: lerp(0.55, 0.48, u) },
    knee: { x: 0.5, y: lerp(0.7, 0.52, u) },
    ankle,
  };
}

function poseSoftCatch(t: number): Joints {
  const ankle = baseAnkle();
  // Decent pull path (bar closer), bad catch
  if (t < 0.15) {
    return {
      wrist: { x: 0.42, y: 0.78 },
      elbow: { x: 0.44, y: 0.62 },
      shoulder: { x: 0.46, y: 0.48 },
      hip: { x: 0.5, y: 0.6 },
      knee: { x: 0.52, y: 0.72 },
      ankle,
    };
  }
  if (t < 0.4) {
    const u = (t - 0.15) / 0.25;
    return {
      wrist: { x: lerp(0.42, 0.46, u), y: lerp(0.78, 0.52, u) },
      elbow: { x: lerp(0.44, 0.47, u), y: lerp(0.62, 0.46, u) },
      hip: { x: 0.5, y: lerp(0.6, 0.5, u) },
      shoulder: { x: 0.48, y: lerp(0.48, 0.38, u) },
      knee: { x: 0.51, y: lerp(0.72, 0.58, u) },
      ankle,
    };
  }
  if (t < 0.55) {
    const u = (t - 0.4) / 0.15;
    return {
      hip: { x: 0.5, y: lerp(0.5, 0.36, u) },
      shoulder: { x: 0.5, y: lerp(0.38, 0.24, u) },
      knee: { x: 0.5, y: lerp(0.58, 0.42, u) },
      elbow: { x: 0.5, y: lerp(0.46, 0.28, u) },
      wrist: { x: 0.5, y: lerp(0.52, 0.16, u) },
      ankle,
    };
  }
  if (t < 0.7) {
    const u = (t - 0.55) / 0.15;
    return {
      wrist: { x: 0.52, y: lerp(0.16, 0.1, u) },
      elbow: { x: 0.54, y: lerp(0.28, 0.22, u) },
      shoulder: { x: 0.55, y: lerp(0.24, 0.36, u) },
      hip: { x: 0.48, y: lerp(0.36, 0.56, u) },
      knee: { x: 0.5, y: lerp(0.42, 0.7, u) },
      ankle,
    };
  }
  if (t < 0.88) {
    return {
      wrist: { x: 0.53, y: 0.1 },
      elbow: { x: 0.56, y: 0.24 },
      shoulder: { x: 0.57, y: 0.38 },
      hip: { x: 0.46, y: 0.58 },
      knee: { x: 0.5, y: 0.72 },
      ankle,
    };
  }
  const u = (t - 0.88) / 0.12;
  return {
    wrist: { x: 0.52, y: 0.09 },
    elbow: { x: 0.54, y: 0.2 },
    shoulder: { x: 0.54, y: 0.32 },
    hip: { x: 0.48, y: lerp(0.58, 0.5, u) },
    knee: { x: 0.5, y: lerp(0.72, 0.55, u) },
    ankle,
  };
}

function poseEarlyArms(t: number): Joints {
  const ankle = baseAnkle();
  if (t < 0.15) {
    return {
      wrist: { x: 0.42, y: 0.78 },
      elbow: { x: 0.44, y: 0.62 },
      shoulder: { x: 0.46, y: 0.48 },
      hip: { x: 0.5, y: 0.6 },
      knee: { x: 0.52, y: 0.72 },
      ankle,
    };
  }
  if (t < 0.4) {
    const u = (t - 0.15) / 0.25;
    return {
      wrist: { x: lerp(0.42, 0.45, u), y: lerp(0.78, 0.55, u) },
      elbow: { x: lerp(0.44, 0.46, u), y: lerp(0.62, 0.48, u) },
      hip: { x: 0.5, y: lerp(0.6, 0.52, u) },
      shoulder: { x: 0.48, y: lerp(0.48, 0.4, u) },
      knee: { x: 0.52, y: lerp(0.72, 0.6, u) },
      ankle,
    };
  }
  if (t < 0.55) {
    const u = (t - 0.4) / 0.15;
    // Incomplete hip + early bend
    return {
      hip: { x: 0.5, y: lerp(0.52, 0.44, u) },
      shoulder: { x: 0.49, y: lerp(0.4, 0.3, u) },
      knee: { x: 0.5, y: lerp(0.6, 0.5, u) },
      elbow: { x: lerp(0.46, 0.52, u), y: lerp(0.48, 0.28, u) },
      wrist: { x: lerp(0.45, 0.55, u), y: lerp(0.55, 0.2, u) },
      ankle,
    };
  }
  if (t < 0.7) {
    const u = (t - 0.55) / 0.15;
    return {
      wrist: { x: 0.5, y: lerp(0.2, 0.1, u) },
      elbow: { x: 0.5, y: lerp(0.28, 0.18, u) },
      shoulder: { x: 0.5, y: lerp(0.3, 0.32, u) },
      hip: { x: 0.5, y: lerp(0.44, 0.52, u) },
      knee: { x: 0.5, y: lerp(0.5, 0.65, u) },
      ankle,
    };
  }
  if (t < 0.88) {
    return {
      wrist: { x: 0.5, y: 0.09 },
      elbow: { x: 0.5, y: 0.17 },
      shoulder: { x: 0.5, y: 0.3 },
      hip: { x: 0.5, y: 0.52 },
      knee: { x: 0.5, y: 0.62 },
      ankle,
    };
  }
  const u = (t - 0.88) / 0.12;
  return {
    wrist: { x: 0.5, y: 0.08 },
    elbow: { x: 0.5, y: 0.16 },
    shoulder: { x: 0.5, y: 0.28 },
    hip: { x: 0.5, y: lerp(0.52, 0.48, u) },
    knee: { x: 0.5, y: lerp(0.62, 0.52, u) },
    ankle,
  };
}

function poseSolid(t: number): Joints {
  const ankle = baseAnkle();
  if (t < 0.15) {
    return {
      wrist: { x: 0.44, y: 0.78 },
      elbow: { x: 0.45, y: 0.62 },
      shoulder: { x: 0.47, y: 0.48 },
      hip: { x: 0.5, y: 0.6 },
      knee: { x: 0.51, y: 0.72 },
      ankle,
    };
  }
  if (t < 0.4) {
    const u = (t - 0.15) / 0.25;
    return {
      wrist: { x: lerp(0.44, 0.47, u), y: lerp(0.78, 0.5, u) },
      elbow: { x: lerp(0.45, 0.48, u), y: lerp(0.62, 0.44, u) },
      hip: { x: 0.5, y: lerp(0.6, 0.48, u) },
      shoulder: { x: 0.49, y: lerp(0.48, 0.36, u) },
      knee: { x: 0.5, y: lerp(0.72, 0.55, u) },
      ankle,
    };
  }
  if (t < 0.55) {
    const u = (t - 0.4) / 0.15;
    return {
      hip: { x: 0.5, y: lerp(0.48, 0.34, u) },
      shoulder: { x: 0.5, y: lerp(0.36, 0.22, u) },
      knee: { x: 0.5, y: lerp(0.55, 0.4, u) },
      elbow: { x: 0.5, y: lerp(0.44, 0.26, u) },
      wrist: { x: 0.5, y: lerp(0.5, 0.14, u) },
      ankle,
    };
  }
  if (t < 0.7) {
    const u = (t - 0.55) / 0.15;
    return {
      wrist: { x: 0.5, y: lerp(0.14, 0.06, u) },
      elbow: { x: 0.5, y: lerp(0.2, 0.13, u) },
      shoulder: { x: 0.5, y: lerp(0.22, 0.28, u) },
      hip: { x: 0.5, y: lerp(0.34, 0.55, u) },
      knee: { x: lerp(0.5, 0.56, u), y: lerp(0.4, 0.75, u) },
      ankle,
    };
  }
  if (t < 0.88) {
    return {
      wrist: { x: 0.5, y: 0.05 },
      elbow: { x: 0.5, y: 0.13 },
      shoulder: { x: 0.5, y: 0.28 },
      hip: { x: 0.5, y: 0.58 },
      knee: { x: 0.58, y: 0.78 },
      ankle,
    };
  }
  const u = (t - 0.88) / 0.12;
  return {
    wrist: { x: 0.5, y: 0.05 },
    elbow: { x: 0.5, y: 0.13 },
    shoulder: { x: 0.5, y: 0.26 },
    hip: { x: 0.5, y: lerp(0.58, 0.46, u) },
    knee: { x: lerp(0.58, 0.5, u), y: lerp(0.78, 0.5, u) },
    ankle,
  };
}
