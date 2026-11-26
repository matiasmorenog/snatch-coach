import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkNativeAvPermissions,
  explainCameraBlocked,
  requestNativeAvPermissions,
  requestNativeCameraOnly,
} from '../src/media/nativeAvPermissions';
import { colors } from '../src/theme';

const TIMER_OPTIONS = [0, 5, 10] as const;
const DEFAULT_TIMER_SEC = 5;
const beepSource = require('../assets/sounds/beep.wav');
const beepEndSource = require('../assets/sounds/beep-end.wav');

export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const cancelArmRef = useRef(false);
  const beepPlayer = useAudioPlayer(beepSource);
  const beepEndPlayer = useAudioPlayer(beepEndSource);
  const [cameraPermission, requestCameraPermission, getCameraPermission] =
    useCameraPermissions();
  const [micPermission, requestMicPermission, getMicPermission] =
    useMicrophonePermissions();
  const [nativeCamOk, setNativeCamOk] = useState(false);
  const [nativeMicOk, setNativeMicOk] = useState(false);
  const [recording, setRecording] = useState(false);
  const [arming, setArming] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerSec, setTimerSec] = useState(DEFAULT_TIMER_SEC);
  const [timerOpen, setTimerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permBusy, setPermBusy] = useState(false);

  const cameraOk = Boolean(cameraPermission?.granted || nativeCamOk);
  const micOk = Boolean(micPermission?.granted || nativeMicOk);

  const refreshPermissions = useCallback(async () => {
    try {
      const tasks: Promise<unknown>[] = [getCameraPermission(), getMicPermission()];
      if (Platform.OS === 'android') {
        tasks.push(
          checkNativeAvPermissions().then((n) => {
            setNativeCamOk(n.camera);
            setNativeMicOk(n.mic);
          })
        );
      }
      await Promise.all(tasks);
    } catch {
      /* ignore */
    }
  }, [getCameraPermission, getMicPermission]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPermissions();
    }, [refreshPermissions])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshPermissions();
    });
    return () => sub.remove();
  }, [refreshPermissions]);

  async function askCameraAndMic() {
    if (permBusy) return;
    setPermBusy(true);
    setError(null);
    try {
      if (Platform.OS === 'android') {
        // 1) Camera alone — OEMs often skip camera dialog inside requestMultiple.
        const camOk = await requestNativeCameraOnly();
        setNativeCamOk(camOk);
        try {
          await requestCameraPermission();
        } catch {
          /* ignore */
        }

        if (!camOk) {
          setError(
            'No se otorgó cámara. Ajustes → Apps → Snatch Coach → Permisos → Cámara.'
          );
          explainCameraBlocked();
          try {
            await Linking.openSettings();
          } catch {
            /* ignore */
          }
          return;
        }

        // 2) Mic after camera is granted.
        const native = await requestNativeAvPermissions();
        setNativeCamOk(native.camera);
        setNativeMicOk(native.mic);
        try {
          await requestMicPermission();
        } catch {
          /* ignore */
        }
        await refreshPermissions();
        if (native.camera) return;

        setError('Android no dio cámara. Activala en Ajustes.');
        try {
          await Linking.openSettings();
        } catch {
          /* ignore */
        }
        return;
      }

      await refreshPermissions();
      let cam = await getCameraPermission();
      if (!cam?.granted) cam = await requestCameraPermission();
      if (!cam?.granted) {
        if (cam && cam.canAskAgain === false) {
          setError('Permiso bloqueado. Activalo en Ajustes.');
          try {
            await Linking.openSettings();
          } catch {
            /* ignore */
          }
          return;
        }
        setError('Falta permiso de cámara.');
        return;
      }
      let mic = await getMicPermission();
      if (!mic?.granted) mic = await requestMicPermission();
    } finally {
      setPermBusy(false);
      await refreshPermissions();
    }
  }

  // First visit: ask camera once (not mic) so the system dialog actually appears.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (cameraOk || permBusy) return;
    let cancelled = false;
    (async () => {
      const native = await checkNativeAvPermissions();
      if (cancelled || native.camera) {
        if (native.camera) setNativeCamOk(true);
        return;
      }
      setPermBusy(true);
      try {
        const ok = await requestNativeCameraOnly();
        if (!cancelled) setNativeCamOk(ok);
        try {
          await requestCameraPermission();
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setPermBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only on first mount of this screen state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureRecordPermissions(): Promise<boolean> {
    await refreshPermissions();
    if (Platform.OS === 'android') {
      let native = await checkNativeAvPermissions();
      if (!native.camera) {
        const camOk = await requestNativeCameraOnly();
        setNativeCamOk(camOk);
        native = { ...native, camera: camOk };
      }
      if (!native.mic) {
        native = await requestNativeAvPermissions();
        setNativeCamOk(native.camera);
        setNativeMicOk(native.mic);
      }
      if (!native.camera) {
        setError('Falta permiso de cámara. Activalo en Ajustes.');
        return false;
      }
      if (!native.mic) {
        setError('Falta permiso de micrófono. Activalo en Ajustes.');
        return false;
      }
      return true;
    }

    let cam = await getCameraPermission();
    let mic = await getMicPermission();
    if (!cam?.granted) cam = await requestCameraPermission();
    if (!mic?.granted) mic = await requestMicPermission();
    if (!cam?.granted) {
      setError('Falta permiso de cámara. Activalo en Ajustes.');
      return false;
    }
    if (!mic?.granted) {
      setError(
        'Falta permiso de micrófono (lo pide el sistema al grabar video). Activalo en Ajustes.'
      );
      return false;
    }
    return true;
  }

  async function playBeep(isLast: boolean) {
    const player = isLast ? beepEndPlayer : beepPlayer;
    try {
      player.volume = 1;
      await player.seekTo(0);
      player.play();
    } catch {
      // fallback below
    }
    try {
      await Haptics.impactAsync(
        isLast ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium
      );
    } catch {
      /* ignore */
    }
    Vibration.vibrate(isLast ? 80 : 40);
  }

  async function armAndRecord() {
    if (arming || recording) return;
    setError(null);
    if (!(await ensureRecordPermissions())) return;

    cancelArmRef.current = false;
    setArming(true);

    for (let n = timerSec; n >= 1; n--) {
      if (cancelArmRef.current) {
        setCountdown(null);
        setArming(false);
        return;
      }
      setCountdown(n);
      await playBeep(n <= 3);
      await wait(1000);
    }

    if (cancelArmRef.current) {
      setCountdown(null);
      setArming(false);
      return;
    }

    setCountdown(null);
    setArming(false);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* ignore */
    }
    await startRecording();
  }

  function cancelArm() {
    cancelArmRef.current = true;
    setCountdown(null);
    setArming(false);
  }

  async function startRecording() {
    if (!cameraRef.current) return;
    try {
      setRecording(true);
      const startedAt = Date.now();
      const video = await cameraRef.current.recordAsync({
        maxDuration: 20,
      });
      const durationMs = Math.max(400, Date.now() - startedAt);
      setRecording(false);
      if (!video?.uri) {
        setError('No se obtuvo video.');
        return;
      }
      router.replace({
        pathname: '/analyze',
        params: { videoUri: video.uri, durationMs: String(durationMs) },
      });
    } catch (e) {
      setRecording(false);
      const msg = e instanceof Error ? e.message : 'Error al grabar';
      if (/permission|permiso|mic|audio/i.test(msg)) {
        setError(
          'Faltan permisos de cámara/micrófono. En el teléfono: Ajustes → Apps → Snatch Coach (o Expo Go) → Permisos.'
        );
      } else {
        setError(msg);
      }
    }
  }

  async function stopRecording() {
    cameraRef.current?.stopRecording();
  }

  if (!cameraPermission && !nativeCamOk && Platform.OS !== 'android') {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cargando permisos…</Text>
      </View>
    );
  }

  if (!cameraOk) {
    const blocked = cameraPermission?.canAskAgain === false;
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Necesitamos cámara para grabar el snatch.</Text>
        <Text style={styles.permHint}>
          {blocked
            ? 'El permiso quedó bloqueado. Abrí Ajustes y activá Cámara (y Micrófono).'
            : 'Si ya diste permiso en Ajustes y seguís acá, tocá el botón o usá la galería desde Inicio.'}
        </Text>
        {error ? <Text style={styles.permError}>{error}</Text> : null}
        <Pressable
          style={[styles.btn, permBusy && styles.btnDisabled]}
          disabled={permBusy}
          onPress={() => void askCameraAndMic()}
        >
          <Text style={styles.btnText}>
            {permBusy ? 'Pediendo…' : blocked ? 'Abrir Ajustes' : 'Dar permiso'}
          </Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => void Linking.openSettings()}>
          <Text style={styles.linkBtnText}>Abrir Ajustes del sistema</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.replace('/')}>
          <Text style={styles.linkBtnText}>Volver al inicio (usar galería)</Text>
        </Pressable>
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, 8);
  const shutterLift = 52;
  const frameVInset = Math.max(insets.top, insets.bottom, 10);

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video"
        mute
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.guideFrame,
          {
            paddingTop: frameVInset,
            paddingBottom: frameVInset,
          },
        ]}
      >
        <View style={styles.guideBox} pointerEvents="box-none">
          <View pointerEvents="none" style={[styles.corner, styles.cornerTL]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerTR]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerBL]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerBR]} />

          <Pressable
            style={styles.guideChip}
            onPress={() => router.push('/tips')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cómo grabar"
          >
            <Text style={styles.guideChipText}>Guía</Text>
          </Pressable>
        </View>
      </View>

      {countdown != null ? (
        <View pointerEvents="none" style={styles.countdownWrap}>
          <Text style={styles.countdown}>{countdown}</Text>
          <Text style={styles.countdownHint}>Andá a la barra · tocá shutter para cancelar</Text>
        </View>
      ) : null}

      {error ? (
        <View
          pointerEvents="none"
          style={[styles.errorWrap, { bottom: bottomPad + shutterLift + 82 }]}
        >
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[styles.bottomBar, { paddingBottom: bottomPad + shutterLift }]}
      >
        <View style={styles.shutterRow}>
          <View style={styles.shutterSideSlot} />
          {recording ? (
            <Pressable
              style={styles.shutterRecording}
              onPress={() => void stopRecording()}
              accessibilityRole="button"
              accessibilityLabel="Detener grabación"
            >
              <View style={styles.shutterStop} />
            </Pressable>
          ) : arming ? (
            <Pressable
              style={styles.shutterCancel}
              onPress={cancelArm}
              accessibilityRole="button"
              accessibilityLabel="Cancelar temporizador"
            >
              <Text style={styles.shutterCancelText}>✕</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.shutter}
              onPress={() => void armAndRecord()}
              accessibilityRole="button"
              accessibilityLabel={
              timerSec === 0
                ? 'Grabar ahora'
                : `Armar grabación en ${timerSec} segundos`
            }
            >
              <View style={styles.shutterInner} />
            </Pressable>
          )}
          <View style={styles.shutterSideSlot}>
            {!recording && !arming ? (
              <Pressable
                style={styles.timerFab}
                onPress={() => setTimerOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  timerSec === 0
                    ? 'Sin temporizador'
                    : `Temporizador ${timerSec} segundos`
                }
              >
                <Text style={styles.timerFabText}>
                  {timerSec === 0 ? 'Off' : `${timerSec}s`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Modal
        visible={timerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTimerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTimerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Temporizador</Text>
            <Text style={styles.modalSub}>
              Off = grabá ya. 5s / 10s = tiempo para llegar a la barra.
            </Text>
            <View style={styles.timerRow}>
              {TIMER_OPTIONS.map((sec) => {
                const active = sec === timerSec;
                const label = sec === 0 ? 'Off' : `${sec}s`;
                return (
                  <Pressable
                    key={sec}
                    style={[styles.timerOption, active && styles.timerOptionActive]}
                    onPress={() => {
                      setTimerSec(sec);
                      setTimerOpen(false);
                    }}
                  >
                    <Text
                      style={[styles.timerOptionText, active && styles.timerOptionTextActive]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  guideFrame: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 16,
  },
  guideBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(61, 220, 151, 0.28)',
    borderRadius: 14,
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: colors.accent,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
  },
  guideChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  guideChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  countdownWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  countdown: {
    color: colors.accent,
    fontSize: 96,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  countdownHint: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  errorWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 28,
  },
  shutterSideSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerFab: {
    minWidth: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1.5,
    borderColor: colors.accent,
    paddingHorizontal: 10,
  },
  timerFabText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.danger,
  },
  shutterRecording: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  shutterStop: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  shutterCancel: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: colors.warn,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  shutterCancelText: {
    color: colors.warn,
    fontSize: 28,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  timerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  timerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  timerOptionActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(61,220,151,0.12)',
  },
  timerOptionText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 15,
  },
  timerOptionTextActive: {
    color: colors.accent,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: colors.bg,
  },
  text: { color: colors.text, textAlign: 'center' },
  muted: { color: colors.muted },
  permHint: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  permError: {
    color: colors.warn,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  btn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#04120C', fontWeight: '700' },
  linkBtn: { paddingVertical: 10, paddingHorizontal: 8, marginTop: 4 },
  linkBtnText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
});
