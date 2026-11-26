# Snatch Coach (prototipo)

App Expo para grabar snatches, analizar con reglas de forma y devolver cues en español.

## Estado actual

- Pantallas: Home, Grabar, Analizar, Resultado, Tips
- Historial local (AsyncStorage) — solo snatches reales (demos no aparecen)
- Engine de fases + reglas snatch (TypeScript puro)
- **Score por snatch**: 100 pts − descuentos por cue (letra A–F)
- **Pose on-device**: MediaPipe Pose Landmarker (development build). Muestrea frames del clip y corre las mismas reglas.

## Más adelante (no ahora)

- Niveles / XP acumulados entre sesiones
- Auto-start por quietud + guía de setup en vivo
- Pose en vivo durante la grabación (hoy: post-proceso del clip)

## Importante: Expo Go vs development build

| App | Grabar | Analizar **tu** clip |
|-----|--------|----------------------|
| Expo Go | Sí | No (falta MediaPipe nativo) |
| Development build (EAS) | Sí | Sí |

## Development build (iOS + Android)

```bash
npm install
npm i -g eas-cli   # si no lo tenés
eas login
eas build:configure   # una vez: linkea el proyecto
eas build --profile development --platform android
eas build --profile development --platform ios
```

Instalá el `.apk` / TestFlight-internal en el teléfono. Después:

```bash
npx expo start --dev-client
# gym: npm run start:tunnel
```

Abrí **Snatch Coach** (no Expo Go) y escaneá el QR.

Modelo pose: `assets/models/pose_landmarker_lite.task` (se copia al binario nativo en prebuild).

## Correr (solo Metro / UI en Expo Go)

```bash
npm install
npx expo start
```

En Expo Go: grabación OK; al analizar clip real verás mensaje de que falta el development build. Tips → demo sintético sigue andando.

### Gym / notebook en casa (tunnel)

1. En casa: `npm run start:tunnel`
2. Escaneá QR con la **app development** (o Expo Go solo para UI)
3. Notebook despierta + internet

## Estructura

- `app/` — pantallas (expo-router)
- `src/snatch/` — fases, reglas, demo trajectory
- `src/pose/` — extractor MediaPipe + ángulos
- `src/storage/` — sesiones locales
