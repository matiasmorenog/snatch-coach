import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Snatch Coach' }} />
        <Stack.Screen name="tips" options={{ title: 'Cómo grabar y analizar' }} />
        <Stack.Screen name="record" options={{ title: 'Grabar snatch', headerShown: false }} />
        <Stack.Screen name="analyze" options={{ title: 'Analizar' }} />
        <Stack.Screen name="result/[id]" options={{ title: 'Resultado' }} />
      </Stack>
    </>
  );
}
