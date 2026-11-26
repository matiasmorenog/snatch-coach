import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ANALYSIS_EXPLAIN, RECORDING_TIPS } from '../src/content/tips';
import { colors } from '../src/theme';

const PHASES = ['Setup', '1st pull', '2nd pull', 'Turnover', 'Catch', 'Stand'] as const;

export default function TipsScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <LinearGradient
        colors={['#12261C', '#0B0F14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.kicker}>SNATCH COACH</Text>
        <Text style={styles.heroTitle}>Cómo grabar</Text>
        <Text style={styles.heroLead}>
          Mejor ángulo = mejor esqueleto = cues más honestos.
        </Text>
        <ProfileDiagram />
      </LinearGradient>

      {RECORDING_TIPS.map((tip, i) => (
        <View key={tip.title} style={styles.tipCard}>
          <View style={styles.tipAccent} />
          <View style={styles.tipInner}>
            <Text style={styles.tipIndex}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipBody}>{tip.body}</Text>
          </View>
        </View>
      ))}

      <View style={styles.demoBlock}>
        <Text style={styles.demoKicker}>PROBAR SIN VIDEO</Text>
        <Text style={styles.demoTitle}>Ejemplo de análisis</Text>
        <Text style={styles.demoBody}>
          Mirá score, cues y esqueleto con un snatch sintético — mismo formato que tu
          análisis, sin magia negra. Adentro rotás otro ejemplo sin volver acá.
        </Text>
        <Pressable
          style={styles.demoBtn}
          onPress={() =>
            router.push({ pathname: '/analyze', params: { videoUri: '', demo: '1' } })
          }
          accessibilityRole="button"
        >
          <Text style={styles.demoBtnText}>Ver ejemplo</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionEyebrow}>MOTOR</Text>
        <Text style={styles.sectionTitle}>{ANALYSIS_EXPLAIN.title}</Text>
        <Text style={styles.sectionLead}>{ANALYSIS_EXPLAIN.lead}</Text>
      </View>

      <View style={styles.pipeline}>
        {['Esqueleto', 'Fases', 'Medidas', 'Cues'].map((step, i) => (
          <View key={step} style={styles.pipelineItem}>
            <View style={styles.pipelineDot}>
              <Text style={styles.pipelineDotText}>{i + 1}</Text>
            </View>
            <Text style={styles.pipelineLabel}>{step}</Text>
            {i < 3 ? <View style={styles.pipelineLine} /> : null}
          </View>
        ))}
      </View>

      <View style={styles.phasesRow}>
        {PHASES.map((p) => (
          <View key={p} style={styles.phaseChip}>
            <Text style={styles.phaseChipText}>{p}</Text>
          </View>
        ))}
      </View>

      {ANALYSIS_EXPLAIN.blocks.map((block, i) => (
        <View key={block.title} style={styles.explainCard}>
          <View style={styles.explainAccent} />
          <View style={styles.explainInner}>
            <Text style={styles.explainIndex}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.explainTitle}>{block.title}</Text>
            <Text style={styles.explainBody}>{block.body}</Text>
          </View>
        </View>
      ))}

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{ANALYSIS_EXPLAIN.status.label}</Text>
        <Text style={styles.statusBody}>{ANALYSIS_EXPLAIN.status.body}</Text>
      </View>
    </ScrollView>
  );
}

function ProfileDiagram() {
  return (
    <View style={styles.diagram}>
      <View style={styles.diagramPhone}>
        <View style={styles.diagramLens} />
        <Text style={styles.diagramPhoneLabel}>CAM</Text>
      </View>
      <View style={styles.diagramRay} />
      <View style={styles.diagramAthlete}>
        <View style={styles.diagramHead} />
        <View style={styles.diagramTorso} />
        <View style={styles.diagramBar} />
        <View style={styles.diagramLeg} />
      </View>
      <Text style={styles.diagramCaption}>Perfil 90° · 2–3 m · cuerpo completo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  container: { paddingBottom: 48, gap: 14 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kicker: {
    fontFamily: 'DMSans_500Medium',
    color: colors.accent,
    letterSpacing: 2,
    fontSize: 11,
  },
  heroTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 48,
    letterSpacing: 1,
    lineHeight: 52,
  },
  heroLead: {
    fontFamily: 'DMSans_400Regular',
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  diagram: {
    marginTop: 12,
    backgroundColor: 'rgba(61,220,151,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(61,220,151,0.25)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  diagramPhone: {
    position: 'absolute',
    left: 18,
    top: 28,
    width: 36,
    height: 56,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  diagramLens: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginBottom: 4,
  },
  diagramPhoneLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.accent,
    fontSize: 8,
  },
  diagramRay: {
    position: 'absolute',
    left: 56,
    top: 52,
    width: 70,
    height: 2,
    backgroundColor: 'rgba(61,220,151,0.45)',
  },
  diagramAthlete: {
    width: 70,
    height: 90,
    alignItems: 'center',
    marginLeft: 40,
  },
  diagramHead: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.text,
  },
  diagramTorso: {
    width: 22,
    height: 34,
    borderRadius: 4,
    backgroundColor: colors.muted,
    marginTop: 2,
  },
  diagramBar: {
    position: 'absolute',
    top: 28,
    width: 54,
    height: 3,
    backgroundColor: colors.warn,
    borderRadius: 2,
  },
  diagramLeg: {
    width: 10,
    height: 28,
    backgroundColor: colors.border,
    marginTop: 2,
    borderRadius: 2,
  },
  diagramCaption: {
    fontFamily: 'DMSans_500Medium',
    color: colors.accent,
    fontSize: 12,
    marginTop: 4,
  },
  tipCard: {
    marginHorizontal: 20,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipAccent: { width: 4, backgroundColor: colors.accent },
  tipInner: { flex: 1, padding: 14, gap: 4 },
  tipIndex: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 22,
    letterSpacing: 1,
  },
  tipTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.text,
    fontSize: 16,
  },
  tipBody: {
    fontFamily: 'DMSans_400Regular',
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionHead: { paddingHorizontal: 20, marginTop: 10, gap: 6 },
  sectionEyebrow: {
    fontFamily: 'DMSans_500Medium',
    color: colors.warn,
    letterSpacing: 2,
    fontSize: 11,
  },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 36,
    letterSpacing: 0.5,
  },
  sectionLead: {
    fontFamily: 'DMSans_400Regular',
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340,
  },
  pipeline: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pipelineItem: { flex: 1, alignItems: 'center', position: 'relative' },
  pipelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipelineDotText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.accent,
    fontSize: 12,
  },
  pipelineLabel: {
    fontFamily: 'DMSans_500Medium',
    color: colors.text,
    fontSize: 11,
    marginTop: 6,
  },
  pipelineLine: {
    position: 'absolute',
    right: -8,
    top: 13,
    width: 16,
    height: 2,
    backgroundColor: colors.border,
  },
  phasesRow: {
    marginHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  phaseChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#10161F',
  },
  phaseChipText: {
    fontFamily: 'DMSans_500Medium',
    color: colors.muted,
    fontSize: 12,
  },
  explainCard: {
    marginHorizontal: 20,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  explainAccent: { width: 4, backgroundColor: colors.warn },
  explainInner: { flex: 1, padding: 14, gap: 4 },
  explainIndex: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.warn,
    fontSize: 22,
    letterSpacing: 1,
  },
  explainTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.text,
    fontSize: 16,
  },
  explainBody: {
    fontFamily: 'DMSans_400Regular',
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  statusCard: {
    marginHorizontal: 20,
    marginTop: 2,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(61,220,151,0.35)',
    backgroundColor: 'rgba(61,220,151,0.08)',
    gap: 6,
  },
  statusLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  statusBody: {
    fontFamily: 'DMSans_400Regular',
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  demoBlock: {
    marginHorizontal: 20,
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.warn,
    padding: 16,
    gap: 8,
  },
  demoKicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.warn,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  demoTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.text,
    fontSize: 18,
  },
  demoBody: {
    fontFamily: 'DMSans_400Regular',
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  demoBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.warn,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  demoBtnText: {
    fontFamily: 'DMSans_700Bold',
    color: '#1A1200',
    fontSize: 15,
  },
});
