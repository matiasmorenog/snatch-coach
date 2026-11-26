/**
 * On-device pose from a recorded video.
 * Samples stills via expo-video-thumbnails, then MediaPipe PoseDetectionOnImage.
 * Requires a development build (not Expo Go).
 *
 * Note: PoseDetectionOnImage creates a native landmarker per call. We keep
 * frame count low + CPU delegate + GC breaths so phones do not OOM (~frame 30).
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { estimateVideoDurationMs } from './estimateDuration';
import { isNativePoseAvailable } from './nativeAvailable';
import { Landmark, PoseFrame } from './types';

export type PoseExtractor = {
  extractFromVideo(uri: string): Promise<PoseFrame[]>;
};

export type ExtractProgress = {
  phase: 'duration' | 'thumbs' | 'pose';
  done: number;
  total: number;
};

export type ExtractOptions = {
  /** Known duration from picker/camera when available. */
  durationMs?: number | null;
  /** Target sample rate (default 5 — snatch cues ok at low fps). */
  fps?: number;
  /** Hard cap on frames (battery / memory). */
  maxFrames?: number;
  /** Thumbnail JPEG quality 0–1 (default 0.28). */
  thumbQuality?: number;
  onProgress?: (p: ExtractProgress) => void;
};

const MODEL = 'pose_landmarker_lite.task';

/** Min visible core joints to count as a body frame. */
const CORE_INDICES = [11, 12, 23, 24]; // shoulders + hips

export class PoseNativeUnavailableError extends Error {
  constructor() {
    super(
      'Pose on-device no está en esta app. Instalá el development build (EAS) — Expo Go no incluye MediaPipe.'
    );
    this.name = 'PoseNativeUnavailableError';
  }
}

function mapLandmarks(
  raw: { x: number; y: number; z?: number; visibility?: number; presence?: number }[]
): Landmark[] {
  return raw.map((lm) => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility ?? lm.presence ?? 0.5,
  }));
}

function frameHasBody(landmarks: Landmark[]): boolean {
  if (landmarks.length < 25) return false;
  let ok = 0;
  for (const i of CORE_INDICES) {
    const v = landmarks[i]?.visibility ?? 0;
    if (v >= 0.35) ok += 1;
  }
  return ok >= 3;
}

function normalizeImageUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/')) {
    return uri;
  }
  return `file://${uri}`;
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function detectOnStill(imageUri: string): Promise<Landmark[] | null> {
  const {
    PoseDetectionOnImage,
    Delegate,
  } = require('react-native-mediapipe-posedetection') as typeof import('react-native-mediapipe-posedetection');

  const path = normalizeImageUri(imageUri);
  // CPU is slower but much more stable for dozens of one-shot landmarkers.
  try {
    const result = await PoseDetectionOnImage(path, MODEL, {
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
      shouldOutputSegmentationMasks: false,
      delegate: Delegate.CPU,
    });
    const poses = result.results?.[0]?.landmarks;
    const pose = poses?.[0];
    if (!pose?.length) return null;
    return mapLandmarks(pose);
  } catch {
    return null;
  }
}

/**
 * Extract pose series from a local video URI.
 * Returns only frames where a body is visible; empty array → caller uses NO_BODY.
 */
export async function extractPoseFromVideo(
  uri: string,
  opts: ExtractOptions = {}
): Promise<PoseFrame[]> {
  if (!isNativePoseAvailable()) {
    throw new PoseNativeUnavailableError();
  }

  const fps = opts.fps ?? 5;
  const maxFrames = opts.maxFrames ?? 36;
  const thumbQuality = opts.thumbQuality ?? 0.28;
  const onProgress = opts.onProgress;

  onProgress?.({ phase: 'duration', done: 0, total: 1 });
  let durationMs = opts.durationMs && opts.durationMs > 0 ? opts.durationMs : 0;
  if (!durationMs) {
    durationMs = await estimateVideoDurationMs(uri);
  }
  onProgress?.({ phase: 'duration', done: 1, total: 1 });

  if (durationMs <= 0) {
    return [];
  }

  const windowMs = Math.min(durationMs, Math.floor((maxFrames / fps) * 1000));
  const step = Math.max(120, Math.round(1000 / fps));
  const times: number[] = [];
  for (let t = 0; t <= windowMs; t += step) {
    times.push(t);
    if (times.length >= maxFrames) break;
  }

  const frames: PoseFrame[] = [];

  for (let i = 0; i < times.length; i++) {
    const tMs = times[i]!;
    onProgress?.({ phase: 'thumbs', done: i, total: times.length });

    let thumbUri: string | null = null;
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(uri, {
        time: tMs,
        quality: thumbQuality,
      });
      thumbUri = thumb.uri;
    } catch {
      continue;
    }

    onProgress?.({ phase: 'pose', done: i, total: times.length });
    try {
      const landmarks = await detectOnStill(thumbUri);
      if (landmarks && frameHasBody(landmarks)) {
        frames.push({ tMs, landmarks });
      }
    } catch {
      // Skip frame — never let one bad still kill the whole analysis.
    }

    try {
      if (thumbUri) await FileSystem.deleteAsync(thumbUri, { idempotent: true });
    } catch {
      /* ignore */
    }

    // Let native MediaPipe / bitmaps settle (leak fix + GC).
    if (i % 4 === 3) {
      await wait(80);
    } else {
      await wait(16);
    }
  }

  onProgress?.({ phase: 'pose', done: times.length, total: times.length });
  return frames;
}

export const videoPoseExtractor: PoseExtractor = {
  extractFromVideo(uri: string) {
    return extractPoseFromVideo(uri);
  },
};

export const notImplementedExtractor: PoseExtractor = {
  async extractFromVideo() {
    throw new PoseNativeUnavailableError();
  },
};
