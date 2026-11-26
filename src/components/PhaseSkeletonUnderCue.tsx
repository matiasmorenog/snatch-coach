import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { SkeletonSnapshot } from './SkeletonSnapshot';
import { SkeletonZoomModal } from './MediaViewerModals';
import { PoseKeyframe } from '../pose/keyframes';
import { colors } from '../theme';

type Props = {
  keyframe: PoseKeyframe | null | undefined;
  videoUri?: string | null;
  aspect?: number;
};

/**
 * Phase skeleton under a cue — tap to expand fullscreen.
 */
export function PhaseSkeletonUnderCue({ keyframe, videoUri, aspect = 1.15 }: Props) {
  const [width, setWidth] = useState(0);
  const [thumb, setThumb] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!videoUri || !keyframe) return;
    let cancelled = false;
    (async () => {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: Math.max(0, keyframe.tMs),
          quality: 0.7,
        });
        if (!cancelled) setThumb(uri);
      } catch {
        if (!cancelled) setThumb(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [keyframe, videoUri]);

  if (!keyframe) {
    return (
      <Text style={styles.missing}>Sin snapshot de esqueleto para esta fase.</Text>
    );
  }

  const height = width > 0 ? width / aspect : 0;

  return (
    <>
      <Pressable
        style={styles.wrap}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onPress={() => setZoomed(true)}
        accessibilityRole="button"
        accessibilityLabel="Ampliar imagen del esqueleto"
      >
        {width > 0 ? (
          <View style={[styles.frame, { width, height }]}>
            <SkeletonSnapshot
              landmarks={keyframe.landmarks}
              width={width}
              height={height}
              backgroundUri={thumb}
            />
            <View style={styles.expandBadge}>
              <Text style={styles.expandText}>Ampliar</Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.caption}>
          {keyframe.labelEs} · {Math.round(keyframe.tMs)} ms · tocá para ampliar
        </Text>
      </Pressable>

      <SkeletonZoomModal
        visible={zoomed}
        keyframe={keyframe}
        backgroundUri={thumb}
        onClose={() => setZoomed(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  frame: { borderRadius: 10, overflow: 'hidden' },
  expandBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 11 },
  missing: { color: colors.muted, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});
