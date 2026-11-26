import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  OriginalVideoModal,
} from '../../src/components/MediaViewerModals';
import { PhaseSkeletonUnderCue } from '../../src/components/PhaseSkeletonUnderCue';
import { PoseKeyframe } from '../../src/pose/keyframes';
import {
  deleteSession,
  getSession,
  isDemoSession,
  SessionRecord,
} from '../../src/storage/sessions';
import { colors } from '../../src/theme';
import {
  buildScoreReport,
  gradeColor,
  gradeEncouragement,
  gradeFromScore,
  ScoreReport,
} from '../../src/snatch/scoring';
import { hasNoBodyDetection } from '../../src/snatch/analyze';

const phaseLabel: Record<string, string> = {
  setup: 'Setup',
  first_pull: 'First pull',
  second_pull: 'Second pull',
  turnover: 'Turnover',
  catch: 'Catch',
  stand: 'Stand',
  unknown: 'General',
};

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [showAllPhases, setShowAllPhases] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);
  const celebratedId = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getSession(id).then(setSession);
  }, [id]);

  const keyframes = session?.keyframes ?? [];
  const byPhase = useMemo(() => {
    const map = new Map<string, PoseKeyframe>();
    for (const kf of keyframes) map.set(kf.phase, kf);
    return map;
  }, [keyframes]);

  const scorePreview = session
    ? session.score ?? buildScoreReport(session.findings)
    : null;

  useEffect(() => {
    if (!session || !scorePreview || scorePreview.grade !== 'A') return;
    if (celebratedId.current === session.id) return;
    celebratedId.current = session.id;
    const t = setTimeout(() => confettiRef.current?.start(), 280);
    return () => clearTimeout(t);
  }, [session, scorePreview]);

  if (!session || !scorePreview) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cargando…</Text>
      </View>
    );
  }

  const score: ScoreReport = scorePreview;
  const noBody = hasNoBodyDetection(session.findings);
  const accent = noBody ? colors.warn : gradeColor(score.grade);
  const pep = noBody ? null : gradeEncouragement(score.grade, score.overallScore);
  const isHigh = !noBody && (score.grade === 'A' || score.grade === 'B');
  const labelEs = noBody
    ? 'Sin detección de cuerpo'
    : gradeFromScore(score.overallScore).gradeLabelEs;
  const corrections =
    score.deductions.length > 0
      ? score.deductions
      : session.findings
          .filter((f) => f.code !== 'LOOKS_SOLID')
          .map((f) => ({
            code: f.code,
            phase: f.phase,
            points: f.pointsLost ?? 0,
            messageEs: f.messageEs,
          }));

  const phasesWithCorrection = new Set(corrections.map((c) => c.phase));
  const orphanKeyframes = showAllPhases
    ? keyframes.filter((kf) => !phasesWithCorrection.has(kf.phase))
    : [];

  const screenW = Dimensions.get('window').width;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.scoreBox, { borderColor: accent }]}>
        {noBody ? (
          <>
            <Text style={[styles.heroKicker, { color: accent }]}>SIN ESQUELETO</Text>
            <Text style={[styles.noBodyTitle, { color: accent }]}>No detectado</Text>
            <Text style={styles.scoreLabel}>Cuerpo / esqueleto digital</Text>
            <Text style={styles.pep}>
              El video se guardó, pero no hay un modelo de puntos usable para analizar el
              snatch. No te damos una nota inventada.
            </Text>
          </>
        ) : (
          <>
            {score.grade === 'A' ? (
              <Text style={[styles.heroKicker, { color: accent }]}>TOP SCORE</Text>
            ) : null}
            <Text style={[styles.grade, { color: accent }]}>{score.grade}</Text>
            <Text style={[styles.score, { color: accent }]}>{score.overallScore}</Text>
            <Text style={styles.scoreLabel}>Puntuación del movimiento</Text>
            <Text style={[styles.scoreLabelSub, isHigh && { color: accent, fontWeight: '700' }]}>
              {labelEs}
            </Text>
            {pep ? <Text style={styles.pep}>{pep}</Text> : null}
            <Text style={styles.formula}>
              {score.base}
              {score.deductions.map((d) => ` − ${d.points}`).join('')} = {score.overallScore}
            </Text>
          </>
        )}
        {session.usedDemoPose && (
          <Text style={styles.demoBadge}>
            Ejemplo demo — snatch sintético (no es tu video). Mismo tipo de feedback:
            reglas, no vs élite.
          </Text>
        )}
        {session.note ? <Text style={styles.sideBadge}>{session.note}</Text> : null}
        {!noBody &&
          (session.detectedProfileSide ? (
            <Text style={styles.sideBadge}>
              Perfil detectado: costado{' '}
              {session.detectedProfileSide === 'left' ? 'izquierdo' : 'derecho'} a cámara
            </Text>
          ) : (
            <Text style={styles.sideBadge}>Perfil: no pudo inferirse (señal débil)</Text>
          ))}

        {session.videoUri ? (
          <Pressable style={styles.videoBtn} onPress={() => setVideoOpen(true)}>
            <Text style={styles.videoBtnText}>Ver video original</Text>
          </Pressable>
        ) : (
          <Text style={styles.noVideo}>
            Sin video vinculado (demo sintético o clip borrado).
          </Text>
        )}
      </View>

      <Text style={styles.section}>{noBody ? 'Qué pasó' : score.grade === 'A' && corrections.length <= 1
          ? 'Detalle fino'
          : score.grade === 'B'
            ? 'Para llegar al A'
            : 'Qué corregir'}
      </Text>
      <Text style={styles.sectionHint}>
        {noBody
          ? 'Sin esqueleto no hay score de técnica. Probá de nuevo con las tips de grabación.'
          : score.grade === 'A'
            ? 'Casi nada que tocar. Si hay un cue, es polish — reglas de coaching, no un juez IA.'
            : score.grade === 'B'
              ? 'Estás cerca. Estos ajustes te suben de letra (umbrales claros, no vs élite).'
              : 'Cada cue + esqueleto de esa fase. Priorizá los de más puntos — checklist, no magia.'}
      </Text>

      {corrections.map((d) => (
        <View
          key={d.code}
          style={[
            styles.correction,
            noBody ? { borderColor: colors.warn } : severityBorder(d.points),
          ]}
        >
          <View style={styles.deductionTop}>
            <Text style={styles.deductionPhase}>
              {noBody ? 'Detección' : phaseLabel[d.phase] ?? d.phase}
            </Text>
            {d.points > 0 ? (
              <Text style={styles.deductionPts}>−{d.points} pts</Text>
            ) : null}
          </View>
          <Text style={styles.deductionMsg}>{d.messageEs}</Text>
          {!noBody ? (
            <PhaseSkeletonUnderCue
              keyframe={byPhase.get(d.phase)}
              videoUri={session.videoUri}
            />
          ) : null}
        </View>
      ))}

      {!noBody && orphanKeyframes.length > 0 ? (
        <>
          <Text style={styles.section}>Otras fases</Text>
          <Text style={styles.sectionHint}>Sin cue fuerte; igual podés revisar el esqueleto.</Text>
          {orphanKeyframes.map((kf) => (
            <View key={`orphan-${kf.phase}`} style={styles.correction}>
              <Text style={styles.deductionPhase}>{kf.labelEs}</Text>
              <PhaseSkeletonUnderCue keyframe={kf} videoUri={session.videoUri} />
            </View>
          ))}
        </>
      ) : null}

      {keyframes.length > phasesWithCorrection.size ? (
        <Pressable style={styles.toggle} onPress={() => setShowAllPhases((v) => !v)}>
          <Text style={styles.toggleText}>
            {showAllPhases
              ? 'Ocultar fases sin corrección'
              : `Ver todas las fases (${keyframes.length})`}
          </Text>
        </Pressable>
      ) : null}

      {score.phaseScores.length > 0 ? (
        <>
          <Text style={styles.section}>Puntuación por fase</Text>
          {score.phaseScores.map((p) => (
            <View key={p.phase} style={styles.phaseRow}>
              <Text style={styles.phaseName}>{phaseLabel[p.phase] ?? p.phase}</Text>
              <View style={styles.phaseBarTrack}>
                <View
                  style={[
                    styles.phaseBarFill,
                    {
                      width: `${p.score}%`,
                      backgroundColor: p.score >= 75 ? colors.accent : colors.warn,
                    },
                  ]}
                />
              </View>
              <Text style={styles.phaseScore}>{p.score}</Text>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>Fases detectadas</Text>
      {session.phases.map((p, i) => (
        <Text key={`${p.phase}-${i}`} style={styles.phaseLine}>
          {phaseLabel[p.phase] ?? p.phase}: {p.startMs}–{p.endMs} ms
        </Text>
      ))}

      {isDemoSession(session) ? (
        <Pressable
          style={styles.nextDemo}
          onPress={() =>
            router.replace({ pathname: '/analyze', params: { videoUri: '', demo: '1' } })
          }
        >
          <Text style={styles.nextDemoText}>Ver otro ejemplo</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.primary} onPress={() => router.replace('/record')}>
        <Text style={styles.primaryText}>Otro snatch</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => router.replace('/')}>
        <Text style={styles.secondaryText}>Inicio</Text>
      </Pressable>
      {!isDemoSession(session) ? (
        <Pressable
          style={styles.danger}
          onPress={async () => {
            await deleteSession(session.id);
            router.replace('/');
          }}
        >
          <Text style={styles.dangerText}>Borrar sesión</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.secondary} onPress={() => router.replace('/tips')}>
          <Text style={styles.secondaryText}>Volver a tips</Text>
        </Pressable>
      )}
    </ScrollView>

      {score.grade === 'A' ? (
        <ConfettiCannon
          ref={confettiRef}
          count={140}
          origin={{ x: screenW / 2, y: -12 }}
          fadeOut
          autoStart={false}
          fallSpeed={3200}
          explosionSpeed={350}
          colors={['#3DDC97', '#E8EEF6', '#F5A524', '#4DA3FF', '#FFFFFF']}
        />
      ) : null}

      <OriginalVideoModal
        visible={videoOpen}
        uri={session.videoUri}
        onClose={() => setVideoOpen(false)}
        title="Video original del snatch"
      />
    </View>
  );
}

function severityBorder(points: number) {
  if (points >= 15) return { borderColor: colors.danger };
  if (points >= 8) return { borderColor: colors.warn };
  return { borderColor: colors.border };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    gap: 4,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 2,
  },
  noBodyTitle: { fontSize: 36, fontWeight: '800', letterSpacing: 0.5 },
  grade: { fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  score: { fontSize: 56, fontWeight: '800' },
  scoreLabel: { color: colors.text, fontWeight: '700', fontSize: 15 },
  scoreLabelSub: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  pep: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  formula: { color: colors.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  demoBadge: {
    color: colors.warn,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  sideBadge: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  videoBtn: {
    marginTop: 12,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  videoBtnText: { color: '#04120C', fontWeight: '800', fontSize: 14 },
  noVideo: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  sectionHint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: -4 },
  correction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  deductionTop: { flexDirection: 'row', justifyContent: 'space-between' },
  deductionPhase: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  deductionPts: { color: colors.danger, fontWeight: '800' },
  deductionMsg: { color: colors.text, fontSize: 15, lineHeight: 21 },
  cleanMsg: { color: colors.muted, lineHeight: 20 },
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  toggleText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phaseName: { color: colors.muted, width: 88, fontSize: 12 },
  phaseBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  phaseBarFill: { height: 8, borderRadius: 4 },
  phaseScore: { color: colors.text, fontWeight: '700', width: 28, textAlign: 'right' },
  phaseLine: { color: colors.muted, fontSize: 13 },
  nextDemo: {
    marginTop: 16,
    backgroundColor: colors.warn,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextDemoText: { color: '#1A1200', fontWeight: '800' },
  primary: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#04120C', fontWeight: '800' },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '600' },
  danger: { alignItems: 'center', paddingVertical: 10 },
  dangerText: { color: colors.danger },
});
