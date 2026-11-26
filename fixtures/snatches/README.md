# Snatch video fixtures

Real clips for tuning pose / rules. Not shipped inside the app binary.

| File | Source |
|------|--------|
| `snatch-a-2026-09-23.mp4` | WhatsApp 18.18.42 |
| `snatch-b-2026-09-23.mp4` | WhatsApp 18.18.35 |

Both crashed the preview APK around **Pose ~30** (native MediaPipe landmarker leak per frame). Fix: patch `react-native-mediapipe-posedetection` + lower sample rate (needs new preview build).
