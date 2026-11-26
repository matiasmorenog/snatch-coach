import { useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SkeletonSnapshot } from './SkeletonSnapshot';
import { PoseKeyframe } from '../pose/keyframes';
import { colors } from '../theme';

type VideoProps = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
  title?: string;
};

function OriginalVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    return () => {
      player.pause();
    };
  }, [player]);

  return (
    <VideoView
      style={styles.video}
      player={player}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
    />
  );
}

export function OriginalVideoModal({ visible, uri, onClose, title }: VideoProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.videoRoot}>
        <View style={styles.videoHeader}>
          <Text style={styles.videoTitle}>{title ?? 'Video original'}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Cerrar</Text>
          </Pressable>
        </View>
        {visible && uri ? (
          <OriginalVideoPlayer uri={uri} />
        ) : (
          <Text style={styles.missing}>No hay video vinculado.</Text>
        )}
      </View>
    </Modal>
  );
}

type ZoomProps = {
  visible: boolean;
  keyframe: PoseKeyframe | null;
  backgroundUri?: string | null;
  onClose: () => void;
};

export function SkeletonZoomModal({ visible, keyframe, backgroundUri, onClose }: ZoomProps) {
  const { width, height } = Dimensions.get('window');
  const size = Math.min(width - 24, height * 0.72);
  const snapH = size * 1.2;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.zoomBackdrop} onPress={onClose}>
        <Pressable style={styles.zoomCard} onPress={() => {}}>
          <View style={styles.zoomHeader}>
            <Text style={styles.zoomTitle}>
              {keyframe ? `${keyframe.labelEs} · ${Math.round(keyframe.tMs)} ms` : 'Snapshot'}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Cerrar</Text>
            </Pressable>
          </View>
          {keyframe ? (
            <View style={{ width: size, height: snapH, alignSelf: 'center' }}>
              <SkeletonSnapshot
                landmarks={keyframe.landmarks}
                width={size}
                height={snapH}
                backgroundUri={backgroundUri}
              />
            </View>
          ) : null}
          <Text style={styles.zoomHint}>Tocá fuera o Cerrar para volver</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  videoRoot: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 54,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  videoTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  close: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  video: { flex: 1, width: '100%' },
  missing: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    padding: 12,
  },
  zoomCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  zoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoomTitle: { color: colors.text, fontWeight: '700', flex: 1, paddingRight: 8 },
  zoomHint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
