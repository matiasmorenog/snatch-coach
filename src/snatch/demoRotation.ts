import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEMO_SCENARIOS,
  DemoScenario,
  DemoScenarioId,
  getDemoScenario,
} from './demoTrajectory';

const DEMO_ROTATION_KEY = 'snatch.demoRotation.v1';

/** Next scenario in round-robin (persisted). Does not create sessions. */
export async function takeNextDemoScenario(): Promise<DemoScenario> {
  const raw = await AsyncStorage.getItem(DEMO_ROTATION_KEY);
  let idx = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(idx) || idx < 0) idx = 0;
  const scenario = DEMO_SCENARIOS[idx % DEMO_SCENARIOS.length];
  await AsyncStorage.setItem(
    DEMO_ROTATION_KEY,
    String((idx + 1) % DEMO_SCENARIOS.length)
  );
  return scenario;
}

export function resolveDemoScenario(id: string | undefined): DemoScenario {
  if (id && DEMO_SCENARIOS.some((s) => s.id === id)) {
    return getDemoScenario(id as DemoScenarioId);
  }
  return DEMO_SCENARIOS[0];
}
