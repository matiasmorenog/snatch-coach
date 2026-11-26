import { Image } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Landmark } from '../pose/types';
import { DRAW_LANDMARKS, SKELETON_BONES } from '../pose/skeleton';
import { colors } from '../theme';

type Props = {
  landmarks: Landmark[];
  width: number;
  height: number;
  /** Optional video frame behind the skeleton. */
  backgroundUri?: string | null;
};

/**
 * Coaching snapshot: optional video still + pose skeleton on top.
 * Landmark coords are normalized 0–1 (image space).
 */
export function SkeletonSnapshot({ landmarks, width, height, backgroundUri }: Props) {
  return (
    <>
      {backgroundUri ? (
        <Image
          source={{ uri: backgroundUri }}
          style={{ position: 'absolute', width, height, opacity: 0.85 }}
          resizeMode="cover"
        />
      ) : (
        <Svg width={width} height={height} style={{ position: 'absolute' }}>
          <Rect x={0} y={0} width={width} height={height} fill="#0E151C" />
          {/* subtle grid */}
          {[0.25, 0.5, 0.75].map((g) => (
            <Line
              key={`v${g}`}
              x1={width * g}
              y1={0}
              x2={width * g}
              y2={height}
              stroke={colors.border}
              strokeWidth={1}
              opacity={0.45}
            />
          ))}
          {[0.25, 0.5, 0.75].map((g) => (
            <Line
              key={`h${g}`}
              x1={0}
              y1={height * g}
              x2={width}
              y2={height * g}
              stroke={colors.border}
              strokeWidth={1}
              opacity={0.45}
            />
          ))}
        </Svg>
      )}

      <Svg width={width} height={height}>
        {SKELETON_BONES.map(([a, b], i) => {
          const pa = landmarks[a];
          const pb = landmarks[b];
          if (!visible(pa) || !visible(pb)) return null;
          return (
            <Line
              key={`bone-${i}`}
              x1={pa.x * width}
              y1={pa.y * height}
              x2={pb.x * width}
              y2={pb.y * height}
              stroke={colors.accent}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
        {DRAW_LANDMARKS.map((idx) => {
          const p = landmarks[idx];
          if (!visible(p)) return null;
          const isWrist = idx === 15 || idx === 16;
          return (
            <Circle
              key={`lm-${idx}`}
              cx={p.x * width}
              cy={p.y * height}
              r={isWrist ? 5 : 4}
              fill={isWrist ? colors.warn : colors.text}
              stroke={colors.bg}
              strokeWidth={1}
            />
          );
        })}
      </Svg>
    </>
  );
}

function visible(lm: Landmark | undefined): lm is Landmark {
  return !!lm && (lm.visibility ?? 1) >= 0.25;
}
