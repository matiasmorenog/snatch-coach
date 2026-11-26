import AsyncStorage from '@react-native-async-storage/async-storage';
import { PoseKeyframe } from '../pose/keyframes';
import { CameraSide } from '../pose/types';
import { Finding } from '../snatch/rules';
import { PhaseSpan } from '../snatch/phases';
import { ScoreReport } from '../snatch/scoring';

const SESSIONS_KEY = 'snatch.sessions.v1';

export type SessionRecord = {
  id: string;
  createdAt: string;
  videoUri: string | null;
  durationMs: number;
  overallScore: number;
  score?: ScoreReport;
  findings: Finding[];
  phases: PhaseSpan[];
  keyframes?: PoseKeyframe[];
  usedDemoPose: boolean;
  /** Stable id for synthetic demos — used to upsert instead of duplicating. */
  demoScenarioId?: string;
  detectedProfileSide?: CameraSide | null;
  note?: string;
};

function id(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listSessions(): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SessionRecord[];
    return parsed.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

/** Real snatches only — demos stay out of home history. */
export async function listUserSessions(): Promise<SessionRecord[]> {
  const all = await listSessions();
  return all.filter((s) => !s.usedDemoPose && !s.demoScenarioId);
}

export function isDemoSession(session: SessionRecord): boolean {
  return Boolean(session.usedDemoPose || session.demoScenarioId);
}

async function saveAll(sessions: SessionRecord[]) {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  const all = await listSessions();
  return all.find((s) => s.id === sessionId) ?? null;
}

export async function createSession(
  input: Omit<SessionRecord, 'id' | 'createdAt'>
): Promise<SessionRecord> {
  const session: SessionRecord = {
    ...input,
    id: id(),
    createdAt: new Date().toISOString(),
  };
  const all = await listSessions();
  all.unshift(session);
  await saveAll(all);
  return session;
}

/**
 * Create or replace a demo session by scenario id.
 * Also strips anonymous duplicate demos (old identical spam).
 */
export async function upsertDemoSession(
  demoScenarioId: string,
  input: Omit<SessionRecord, 'id' | 'createdAt' | 'demoScenarioId' | 'usedDemoPose'>
): Promise<SessionRecord> {
  const all = await listSessions();
  const cleaned = all.filter(
    (s) =>
      !(s.usedDemoPose && (!s.demoScenarioId || s.demoScenarioId === demoScenarioId))
  );
  const session: SessionRecord = {
    ...input,
    id: id(),
    createdAt: new Date().toISOString(),
    usedDemoPose: true,
    demoScenarioId,
  };
  cleaned.unshift(session);
  await saveAll(cleaned);
  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const all = await listSessions();
  await saveAll(all.filter((s) => s.id !== sessionId));
}

export async function clearSessions(): Promise<void> {
  await AsyncStorage.removeItem(SESSIONS_KEY);
}
