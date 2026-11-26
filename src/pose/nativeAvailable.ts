import Constants from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';

/** Expo Go has no Mediapipe TurboModule — need development build. */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function isNativePoseAvailable(): boolean {
  if (isExpoGo()) return false;
  try {
    return TurboModuleRegistry.get('MediapipePosedetection') != null;
  } catch {
    return false;
  }
}
