import * as VideoThumbnails from 'expo-video-thumbnails';

/**
 * Estimate video length by probing thumbnails (when picker/camera omit duration).
 * Caps at 90s — snatch clips are short.
 */
export async function estimateVideoDurationMs(uri: string): Promise<number> {
  const probes = [400, 1000, 2000, 4000, 8000, 12000, 20000, 30000, 45000, 60000, 90000];
  let lastOk = 0;

  for (const t of probes) {
    try {
      await VideoThumbnails.getThumbnailAsync(uri, { time: t, quality: 0.05 });
      lastOk = t;
    } catch {
      break;
    }
  }

  if (lastOk === 0) {
    // At least try t=0
    try {
      await VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.05 });
      return 800;
    } catch {
      return 0;
    }
  }

  // Binary search between lastOk and next failed (or +4s)
  const nextProbe = probes.find((t) => t > lastOk) ?? lastOk + 4000;
  let lo = lastOk;
  let hi = Math.min(nextProbe, lastOk + 8000);
  while (hi - lo > 250) {
    const mid = Math.round((lo + hi) / 2);
    try {
      await VideoThumbnails.getThumbnailAsync(uri, { time: mid, quality: 0.05 });
      lo = mid;
    } catch {
      hi = mid;
    }
  }

  return Math.max(lo, 400);
}
