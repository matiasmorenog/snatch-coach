import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';

export type PickedVideo = {
  uri: string;
  durationMs: number | null;
  fileName: string | null;
  mimeType: string | null;
  /** Heuristic flags for coaching / support messages. */
  formatNotes: string[];
  /** True if thumbnail probe succeeded (device can at least decode a frame). */
  canDecodeFrame: boolean;
};

const RISKY_MIME = /hevc|h265|h\.265|av1|prores|quicktime|x-m4v|3gpp|mpeg(?!4)/i;
const RISKY_EXT = /\.(hevc|h265|mkv|avi|wmv|flv|mts|m2ts|3gp|webm)$/i;
const HEVC_HINT = /hevc|h265|h\.265|hvc1|hev1/i;
const SAMSUNG_HINT = /samsung|sm-|galaxy|sec_/i;

function collectFormatNotes(fileName: string | null, mimeType: string | null): string[] {
  const notes: string[] = [];
  const blob = `${fileName ?? ''} ${mimeType ?? ''}`;
  const looksMp4OrMov = /\.(mp4|mov|m4v)$/i.test(fileName ?? '') || /mp4|quicktime/i.test(mimeType ?? '');

  if (HEVC_HINT.test(blob) || SAMSUNG_HINT.test(blob) || /\.mov$/i.test(fileName ?? '')) {
    notes.push(
      'Posible HEVC/H.265 (iPhone y Samsung lo usan mucho; Samsung a veces + HDR10+). En el mismo teléfono suele andar. Si falla: exportá/re-encodeá a MP4 H.264 sin HDR.'
    );
  } else if (looksMp4OrMov) {
    // Contenedor común: el codec adentro puede ser H.264 o HEVC sin decirlo en el mime.
    notes.push(
      'MP4/MOV de galería: iPhone y Samsung a menudo graban HEVC por dentro (el archivo igual se llama .mp4). Si el análisis falla, en Samsung: Galería → editar/guardar como o compartir → MP4 H.264 / “más compatible”.'
    );
  } else if (RISKY_MIME.test(mimeType ?? '') || RISKY_EXT.test(fileName ?? '')) {
    notes.push(
      'Formato poco común. Re-exportá a MP4 H.264 (más compatible para pose/análisis).'
    );
  }

  return notes;
}

async function copyToAppCache(uri: string, fileName: string | null): Promise<string> {
  const base = FileSystem.cacheDirectory;
  if (!base) return uri;

  const safeName = (fileName ?? `snatch_${Date.now()}.mp4`).replace(/[^\w.\-]+/g, '_');
  const dest = `${base}imports/${Date.now()}_${safeName}`;
  const dir = `${base}imports`;

  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    // ph:// / content:// sometimes fails copy — keep original URI
    return uri;
  }
}

async function canDecodeFrame(uri: string): Promise<boolean> {
  try {
    await VideoThumbnails.getThumbnailAsync(uri, { time: 400, quality: 0.2 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens the device library for a single video (incl. HEVC from Camera Roll).
 * Copies into app cache when possible and probes that a frame can be decoded.
 */
export async function pickSnatchVideo(): Promise<PickedVideo | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Sin permiso a la galería. Activalo en Ajustes del teléfono.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: false,
    videoMaxDuration: 90,
    quality: 1,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = asset.fileName ?? null;
  const mimeType = asset.mimeType ?? null;
  const formatNotes = collectFormatNotes(fileName, mimeType);

  const localUri = await copyToAppCache(asset.uri, fileName);
  const decoded = await canDecodeFrame(localUri);

  if (!decoded) {
    formatNotes.unshift(
      'No se pudo decodificar un frame (HEVC/HDR de iPhone o Samsung, u otro codec). En Samsung: Ajustes cámara → “Videos eficientes”/HEVC off, o re-guardar el clip como MP4 compatible. En iPhone: exportar H.264.'
    );
  }

  return {
    uri: localUri,
    durationMs: asset.duration != null ? Math.round(asset.duration) : null,
    fileName,
    mimeType,
    formatNotes,
    canDecodeFrame: decoded,
  };
}
