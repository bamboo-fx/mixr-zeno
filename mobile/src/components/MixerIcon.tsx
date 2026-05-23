import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface MixerIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Venn diagram icon representing "mixing" - two overlapping circles
 * Designed to show full circles without any clipping
 */
export function MixerIcon({ size = 24, color = '#C4B5FD', strokeWidth = 2 }: MixerIconProps) {
  // Use a wider viewBox to ensure circles aren't clipped
  // The aspect ratio is wider than tall to fit two overlapping circles
  const viewBoxWidth = 100;
  const viewBoxHeight = 70;

  const circleRadius = 28;
  const overlap = 18; // How much circles overlap in the center
  const leftCenterX = viewBoxWidth / 2 - overlap;
  const rightCenterX = viewBoxWidth / 2 + overlap;
  const centerY = viewBoxHeight / 2;

  // Calculate actual stroke width relative to viewBox
  const relativeStrokeWidth = (strokeWidth / size) * viewBoxHeight * 1.5;

  return (
    <Svg
      width={size}
      height={size * (viewBoxHeight / viewBoxWidth)}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
    >
      {/* Left circle */}
      <Circle
        cx={leftCenterX}
        cy={centerY}
        r={circleRadius}
        stroke={color}
        strokeWidth={relativeStrokeWidth}
        fill="none"
      />
      {/* Right circle */}
      <Circle
        cx={rightCenterX}
        cy={centerY}
        r={circleRadius}
        stroke={color}
        strokeWidth={relativeStrokeWidth}
        fill="none"
      />
    </Svg>
  );
}
