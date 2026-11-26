import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { pickSnatchVideo } from '../src/media/pickVideo';
import {
  clearSessions,
  listUserSessions,
  SessionRecord,
} from '../src/storage/sessions';
import { buildScoreReport, gradeColor } from '../src/snatch/scoring';
import { colors } from '../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await listUserSessions();
    setSessions(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await listUserSessions();
        if (alive) {
          setSessions(data);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  async function onPickVideo() {
    try {
      setPicking(true);
      const video = await pickSnatchVideo();
      if (!video) return;

      const goAnalyze = () => {
        router.push({
          pathname: '/analyze',
          params: {
            videoUri: video.uri,
            durationMs:
              video.durationMs != null ? String(video.durationMs) : '',
            formatNotes: video.formatNotes.length
              ? JSON.stringify(video.formatNotes)
              : '',
          },
        });
      };

      if (!video.canDecodeFrame) {
        Alert.alert(
          'Formato difícil',
          video.formatNotes[0] ??
            'No se pudo leer un frame. ¿Continuar igual? (puede fallar la pose)',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: goAnalyze },
          ]
        );
        return;
      }

      if (video.formatNotes.length) {
        Alert.alert('Aviso de formato', video.formatNotes.join('\n\n'), [
          { text: 'Entendido', onPress: goAnalyze },
        ]);
        return;
      }

      goAnalyze();
    } catch (e) {
      Alert.alert('Galería', e instanceof Error ? e.message : 'No se pudo abrir el video');
    } finally {
      setPicking(false);
    }
  }

  function onClearHistory() {
    Alert.alert('Borrar historial', 'Se borran tus sesiones locales.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await clearSessions();
          await reload();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.lead}>
        Grabá un snatch o cargá un video. Feedback con reglas claras — no un video élite ni
        una IA opaca.
      </Text>

      <Pressable
        style={styles.primaryBtn}
        onPress={() => router.push('/record')}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>Nuevo snatch (cámara)</Text>
      </Pressable>

      <Pressable
        style={[styles.pickBtn, picking && styles.pickBtnDisabled]}
        onPress={() => void onPickVideo()}
        disabled={picking}
        accessibilityRole="button"
      >
        {picking ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={styles.pickBtnText}>Cargar video de la galería</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.tipsCard}
        onPress={() => router.push('/tips')}
        accessibilityRole="button"
        accessibilityLabel="Cómo grabar y analizar"
      >
        <View style={styles.tipsBody}>
          <Text style={styles.tipsKicker}>GUÍA</Text>
          <Text style={styles.tipsTitle}>Cómo grabar y analizar</Text>
          <Text style={styles.tipsSub}>
            Cómo grabar · motor honesto (sin élite ni IA opaca) · ejemplos sin video
          </Text>
        </View>
        <Text style={styles.tipsChevron}>›</Text>
      </Pressable>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Historial local</Text>
        {sessions.length > 0 ? (
          <Pressable onPress={onClearHistory}>
            <Text style={styles.clearLink}>Borrar</Text>
          </Pressable>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin sesiones todavía.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const report = item.score ?? buildScoreReport(item.findings);
            const accent = gradeColor(report.grade);
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/result/${item.id}`)}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.scoreBadge, { borderColor: accent }]}>
                    <Text style={[styles.scoreGrade, { color: accent }]}>{report.grade}</Text>
                    <Text style={[styles.score, { color: accent }]}>{item.overallScore}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {item.findings[0]?.messageEs ?? 'Sin findings'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#04120C', fontSize: 17, fontWeight: '700' },
  pickBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  pickBtnDisabled: { opacity: 0.6 },
  pickBtnText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    minHeight: 88,
    paddingRight: 6,
  },
  tipsBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 3,
  },
  tipsKicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  tipsTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  tipsSub: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  tipsChevron: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '300',
    paddingRight: 10,
    marginTop: -2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  section: { color: colors.text, fontSize: 16, fontWeight: '600' },
  clearLink: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  empty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 20,
    borderRadius: 12,
  },
  emptyText: { color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreGrade: { fontSize: 11, fontWeight: '800' },
  score: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardTitle: { color: colors.text, fontWeight: '600' },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
