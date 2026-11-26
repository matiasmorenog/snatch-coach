const {
  withAppBuildGradle,
  withProjectBuildGradle,
  createRunOncePlugin,
} = require('expo/config-plugins');

/**
 * expo-camera (CameraX 1.6) vs react-native-vision-camera (CameraX 1.5.0-alpha03)
 * resolves to 1.6 and drops / breaks Camera2CameraInfoImpl → crash on app open.
 * Force vision-camera's CameraX set into the app so the class is packaged.
 */
const CAMERAX = '1.5.0-alpha03';

const CAMERA_DEPS = [
  `androidx.camera:camera-core:${CAMERAX}`,
  `androidx.camera:camera-camera2:${CAMERAX}`,
  `androidx.camera:camera-lifecycle:${CAMERAX}`,
  `androidx.camera:camera-video:${CAMERAX}`,
  `androidx.camera:camera-view:${CAMERAX}`,
  `androidx.camera:camera-extensions:${CAMERAX}`,
];

function withForceCameraXResolution(config) {
  return withProjectBuildGradle(config, (config) => {
    const marker = ' snatchcoach-camerax-align ';
    if (config.modResults.contents.includes(marker)) {
      return config;
    }

    const block = `
//${marker}start
allprojects {
    configurations.all {
        resolutionStrategy {
            force "${CAMERA_DEPS[0]}"
            force "${CAMERA_DEPS[1]}"
            force "${CAMERA_DEPS[2]}"
            force "${CAMERA_DEPS[3]}"
            force "${CAMERA_DEPS[4]}"
            force "${CAMERA_DEPS[5]}"
        }
    }
}
//${marker}end
`;

    config.modResults.contents += `\n${block}\n`;
    return config;
  });
}

function withAppCameraXDeps(config) {
  return withAppBuildGradle(config, (config) => {
    const marker = 'snatchcoach-camerax-deps';
    if (config.modResults.contents.includes(marker)) {
      return config;
    }

    const lines = CAMERA_DEPS.map((d) => `    implementation("${d}")`).join('\n');
    const inject = `
    // ${marker}
${lines}
`;

    if (!/dependencies\s*\{/.test(config.modResults.contents)) {
      config.modResults.contents += `\ndependencies {\n${inject}\n}\n`;
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*\{/,
      `dependencies {\n${inject}`
    );
    return config;
  });
}

function withAlignCameraX(config) {
  config = withForceCameraXResolution(config);
  config = withAppCameraXDeps(config);
  return config;
}

module.exports = createRunOncePlugin(withAlignCameraX, 'withAlignCameraX', '1.0.0');
