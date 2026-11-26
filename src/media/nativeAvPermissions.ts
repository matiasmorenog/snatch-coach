import { Alert, PermissionsAndroid, Platform } from 'react-native';

export type NativeAvPermissions = {
  camera: boolean;
  mic: boolean;
};

/** Android system truth — expo-camera hooks sometimes stay stale after the dialog. */
export async function checkNativeAvPermissions(): Promise<NativeAvPermissions> {
  if (Platform.OS !== 'android') {
    return { camera: false, mic: false };
  }
  const [camera, mic] = await Promise.all([
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA),
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO),
  ]);
  return { camera, mic };
}

/**
 * Request CAMERA alone first, then mic.
 * `requestMultiple` on some OEMs (Samsung) skips the camera dialog and only shows mic.
 */
export async function requestNativeAvPermissions(): Promise<NativeAvPermissions> {
  if (Platform.OS !== 'android') {
    return { camera: false, mic: false };
  }

  let camera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (!camera) {
    const camResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Permiso de cámara',
        message: 'Snatch Coach necesita la cámara para grabar tu snatch.',
        buttonPositive: 'Permitir',
        buttonNegative: 'Ahora no',
      }
    );
    camera = camResult === PermissionsAndroid.RESULTS.GRANTED;
  }

  let mic = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (!mic) {
    const micResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Permiso de micrófono',
        message:
          'Android pide micrófono para grabar video (el análisis no usa el audio).',
        buttonPositive: 'Permitir',
        buttonNegative: 'Ahora no',
      }
    );
    mic = micResult === PermissionsAndroid.RESULTS.GRANTED;
  }

  return { camera, mic };
}

export async function requestNativeCameraOnly(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (already) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Permiso de cámara',
    message: 'Snatch Coach necesita la cámara para grabar tu snatch.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Ahora no',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function explainCameraBlocked() {
  Alert.alert(
    'Cámara bloqueada',
    'Android no mostró el diálogo de cámara (a veces pasa si solo se pidió micrófono antes).\n\nAndá a Ajustes → Apps → Snatch Coach → Permisos → activá Cámara.',
    [{ text: 'OK' }]
  );
}
