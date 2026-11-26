import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { persistSessionVideo } from '../src/media/persistVideo';
import {
  extractPoseFromVideo,
  PoseNativeUnavailableError,
} from '../src/pose/extractor';
import { isExpoGo, isNativePoseAvailable } from '../src/pose/nativeAvailable';
import { analyzeSnatch } from '../src/snatch/analyze';
import { takeNextDemoScenario } from '../src/snatch/demoRotation';
import { createSession, upsertDemoSession } from '../src/storage/sessions';
import { colors } from '../src/theme';

export default function AnalyzeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    videoUri?: string;
    demo?: string;
    formatNotes?: string;
    durationMs?: string;
  }>();
  const [status, setStatus] = useState('Preparando análisis…');
  const [error, setError] = useState<string | null>(null);

  const formatNotes = useMemo(() => parseNotes(params.formatNotes), [params.formatNotes]);
  const formatNotesKey = formatNotes.join('|');
  const isExplicitDemo = params.demo === '1' || !params.videoUri;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isExplicitDemo) {
          setStatus('Eligiendo ejemplo demo…');
          const scenario = await takeNextDemoScenario();
          if (cancelled) return;

          setStatus(`Analizando: ${scenario.titleEs}`);
          await wait(350);
          if (cancelled) return;

          const analysis = analyzeSnatch({
            forceDemo: true,
            demoScenarioId: scenario.id,
          });
          await wait(250);
          if (cancelled) return;

          setStatus('Guardando (sin duplicar)…');
          const session = await upsertDemoSession(scenario.id, {
            videoUri: null,
            durationMs: analysis.phases.at(-1)?.endMs ?? 0,
            overallScore: analysis.overallScore,
            score: analysis.score,
            findings: analysis.findings,
            phases: analysis.phases,
            keyframes: analysis.keyframes,
            detectedProfileSide: analysis.detectedProfileSide,
            note: `Demo · ${scenario.titleEs} — ${scenario.blurbEs}`,
          });
          if (cancelled) return;
          router.replace(`/result/${session.id}`);
          return;
        }

        const videoUri = params.videoUri!;
        const knownDuration = parseDurationMs(params.durationMs);

        if (!isNativePoseAvailable()) {
          const where = isExpoGo()
            ? 'Estás en Expo Go. La pose on-device necesita el development build (EAS).'
            : 'MediaPipe no cargó en este binario. Recompilá el development build.';
          setError(where);
          return;
        }

        setStatus('Guardando clip en el teléfono…');
        const stableUri = await persistSessionVideo(videoUri);
        if (cancelled) return;

        setStatus('Extrayendo esqueleto del video…');
        const frames = await extractPoseFromVideo(stableUri, {
          durationMs: knownDuration,
          fps: 5,
          maxFrames: 36,
          thumbQuality: 0.28,
          onProgress: (p) => {
            if (cancelled) return;
            if (p.phase === 'duration') {
              setStatus('Midiendo duración del clip…');
            } else if (p.phase === 'thumbs') {
              setStatus(`Frames ${p.done + 1}/${p.total}…`);
            } else {
              setStatus(`Pose ${p.done + 1}/${p.total}…`);
            }
          },
        });
        if (cancelled) return;

        if (!frames.length) {
          setStatus('Sin cuerpo usable — guardando devolución honesta…');
          const analysis = analyzeSnatch({ noBodyDetected: true });
          const notes = parseNotes(params.formatNotes);
          const session = await createSession({
            videoUri: stableUri,
            durationMs: knownDuration ?? 0,
            overallScore: analysis.overallScore,
            score: analysis.score,
            findings: analysis.findings,
            phases: analysis.phases,
            keyframes: analysis.keyframes,
            usedDemoPose: false,
            detectedProfileSide: null,
            note: notes.length
              ? `Sin esqueleto · Formato: ${notes.join(' | ')}`
              : 'Sin detección de cuerpo / esqueleto',
          });
          if (cancelled) return;
          router.replace(`/result/${session.id}`);
          return;
        }

        setStatus(`Analizando snatch (${frames.length} frames)…`);
        const analysis = analyzeSnatch({ frames });
        await wait(120);
        if (cancelled) return;

        setStatus('Guardando en historial…');
        const notes = parseNotes(params.formatNotes);
        const lastT = frames[frames.length - 1]?.tMs ?? knownDuration ?? 0;
        const session = await createSession({
          videoUri: stableUri,
          durationMs: lastT,
          overallScore: analysis.overallScore,
          score: analysis.score,
          findings: analysis.findings,
          phases: analysis.phases,
          keyframes: analysis.keyframes,
          usedDemoPose: false,
          detectedProfileSide: analysis.detectedProfileSide,
          note: notes.length ? `Formato: ${notes.join(' | ')}` : undefined,
        });
        if (cancelled) return;
        router.replace(`/result/${session.id}`);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof PoseNativeUnavailableError) {
          setError(e.message);
          return;
        }
        setError(e instanceof Error ? e.message : 'Falló el análisis');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    formatNotesKey,
    isExplicitDemo,
    params.durationMs,
    params.formatNotes,
    params.videoUri,
    router,
  ]);

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.hint}>
            Development build: `eas build --profile development --platform android` (o ios).
            Después abrí esa app (no Expo Go) y escaneá el QR de Metro.
          </Text>
          <Text style={styles.hint}>
            Si es Samsung (HEVC/HDR) o iPhone HEVC, re-guardá como MP4 H.264 e importá de nuevo.
          </Text>
          <Pressable style={styles.btn} onPress={() => router.replace('/')}>
            <Text style={styles.btnText}>Volver</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.status}>{status}</Text>
          {formatNotes[0] ? <Text style={styles.hint}>{formatNotes[0]}</Text> : null}
        </>
      )}
    </View>
  );
}

function parseNotes(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function parseDurationMs(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: colors.bg,
  },
  status: { color: colors.text, fontSize: 16, textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  error: { color: colors.danger, textAlign: 'center' },
  btn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: '#04120C', fontWeight: '700' },
});
