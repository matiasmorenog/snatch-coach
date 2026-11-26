import { SnatchPhase } from './phases';
import { Finding, FindingSeverity } from './rules';

/** Point cost per finding code (start from 100, subtract). */
export const PENALTY_BY_CODE: Record<string, number> = {
  INCOMPLETE_HIP_EXT: 20,
  SOFT_CATCH_ARMS: 18,
  BAR_FAR_FIRST_PULL: 12,
  EARLY_ARM_BEND: 12,
  INCOMPLETE_KNEE_EXT: 10,
  CATCH_TORSO_LEAN: 10,
  HIGH_CATCH: 4,
  LOOKS_SOLID: 0,
};

export const DEFAULT_PENALTY: Record<FindingSeverity, number> = {
  error: 18,
  warn: 10,
  info: 3,
};

export type ScoreDeduction = {
  code: string;
  phase: SnatchPhase;
  points: number;
  messageEs: string;
};

export type PhaseScore = {
  phase: SnatchPhase;
  score: number;
  deductions: number;
};

export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type ScoreReport = {
  overallScore: number;
  grade: ScoreGrade;
  gradeLabelEs: string;
  base: number;
  deductions: ScoreDeduction[];
  phaseScores: PhaseScore[];
};

/**
 * Transparent 0–100 score from findings.
 * FUTURE (mucho más adelante): niveles / XP acumulados entre sesiones — no implementar ahora.
 */
export function buildScoreReport(findings: Finding[]): ScoreReport {
  const base = 100;
  const deductions: ScoreDeduction[] = [];

  for (const f of findings) {
    if (f.code === 'LOOKS_SOLID') continue;
    const points = PENALTY_BY_CODE[f.code] ?? DEFAULT_PENALTY[f.severity];
    if (points <= 0) continue;
    deductions.push({
      code: f.code,
      phase: f.phase,
      points,
      messageEs: f.messageEs,
    });
  }

  deductions.sort((a, b) => b.points - a.points);

  const totalPenalty = deductions.reduce((acc, d) => acc + d.points, 0);
  const overallScore = Math.max(0, Math.min(100, base - totalPenalty));

  const phaseScores = buildPhaseScores(deductions);
  const { grade, gradeLabelEs } = gradeFromScore(overallScore);

  return {
    overallScore,
    grade,
    gradeLabelEs,
    base,
    deductions,
    phaseScores,
  };
}

function buildPhaseScores(deductions: ScoreDeduction[]): PhaseScore[] {
  const order: SnatchPhase[] = [
    'setup',
    'first_pull',
    'second_pull',
    'turnover',
    'catch',
    'stand',
  ];
  const byPhase = new Map<SnatchPhase, number>();
  for (const d of deductions) {
    byPhase.set(d.phase, (byPhase.get(d.phase) ?? 0) + d.points);
  }

  return order
    .filter((p) => byPhase.has(p))
    .map((phase) => {
      const deductionsPts = byPhase.get(phase) ?? 0;
      return {
        phase,
        deductions: deductionsPts,
        score: Math.max(0, 100 - deductionsPts),
      };
    });
}

export function gradeFromScore(score: number): { grade: ScoreGrade; gradeLabelEs: string } {
  if (score >= 90) return { grade: 'A', gradeLabelEs: '¡Excelente snatch!' };
  if (score >= 75) return { grade: 'B', gradeLabelEs: '¡Muy bien! Vas por buen camino' };
  if (score >= 60) return { grade: 'C', gradeLabelEs: 'Bien — hay cues claros' };
  if (score >= 40) return { grade: 'D', gradeLabelEs: 'Mejorable' };
  return { grade: 'F', gradeLabelEs: 'Priorizá los errores fuertes' };
}

/** Extra pep talk under the score (A/B). Empty for lower grades. */
export function gradeEncouragement(grade: ScoreGrade, score: number): string | null {
  if (grade === 'A') {
    if (score >= 95) {
      return 'Patrón limpio. Eso se siente bien — guardá este como referencia.';
    }
    return 'Casi redondo. Pequeños detalles y una consistencia de alto nivel.';
  }
  if (grade === 'B') {
    return 'Buena base. Con un cue o dos más afinados, el A está cerca.';
  }
  return null;
}

/** Distinct palette: A mint, B sky, C amber, D orange, F red. */
export function gradeColor(grade: ScoreGrade): string {
  if (grade === 'A') return '#3DDC97';
  if (grade === 'B') return '#4DA3FF';
  if (grade === 'C') return '#F5A524';
  if (grade === 'D') return '#F07A3A';
  return '#FF5C5C';
}
