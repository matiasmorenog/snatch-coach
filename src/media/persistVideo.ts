import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copy recorded/imported clip into documentDirectory so historial survives cache GC.
 */
export async function persistSessionVideo(uri: string): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base) return uri;

  const dir = `${base}sessions`;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {
    return uri;
  }

  const extMatch = /\.([a-z0-9]+)(?:\?|$)/i.exec(uri);
  const ext = extMatch?.[1] ?? 'mp4';
  const dest = `${dir}/v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}
