import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C } from '../theme';

/**
 * Line icons drawn in the product's own hand.
 *
 * Six shapes, one weight, no icon font. Anything an emergency screen shows has
 * to be legible at a glance in bad light, so these are simple outlines at a
 * single stroke width rather than filled pictograms.
 */
export default function Icon({ name, size = 26, color = C.accent, strokeWidth = 1.6 }) {
  const common = {
    stroke: color,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const shapes = {
    // Administrator: a shield with a status dot inside.
    shield: (
      <>
        <Path d="M12 3 5 6v6c0 4 3 7.4 7 9 4-1.6 7-5 7-9V6l-7-3Z" {...common} />
        <Circle cx="12" cy="11" r="2.2" {...common} />
      </>
    ),
    // Teacher: an ID badge.
    badge: (
      <>
        <Rect x="4.5" y="4.5" width="15" height="15" rx="3" {...common} />
        <Circle cx="12" cy="10.5" r="2.3" {...common} />
        <Path d="M8.2 16.4c.8-1.6 2.2-2.4 3.8-2.4s3 .8 3.8 2.4" {...common} />
      </>
    ),
    // Parent: an adult and a child.
    family: (
      <>
        <Circle cx="8.5" cy="6.8" r="2.3" {...common} />
        <Path d="M4.8 20v-4.4a3.7 3.7 0 0 1 7.4 0V20" {...common} />
        <Circle cx="16.8" cy="9.5" r="1.8" {...common} />
        <Path d="M13.9 20v-3.1a2.9 2.9 0 0 1 5.8 0V20" {...common} />
      </>
    ),
    // Student: a check in, held up to be read.
    check: (
      <>
        <Circle cx="12" cy="12" r="8.2" {...common} />
        <Path d="m8.6 12.2 2.4 2.4 4.4-4.8" {...common} />
      </>
    ),
    // Scanning.
    scan: (
      <>
        <Path d="M4.5 8.5v-2a2 2 0 0 1 2-2h2M15.5 4.5h2a2 2 0 0 1 2 2v2M19.5 15.5v2a2 2 0 0 1-2 2h-2M8.5 19.5h-2a2 2 0 0 1-2-2v-2" {...common} />
        <Path d="M4.5 12h15" {...common} />
      </>
    ),
    // The board.
    grid: (
      <>
        <Rect x="4.5" y="4.5" width="6" height="6" rx="1.4" {...common} />
        <Rect x="13.5" y="4.5" width="6" height="6" rx="1.4" {...common} />
        <Rect x="4.5" y="13.5" width="6" height="6" rx="1.4" {...common} />
        <Rect x="13.5" y="13.5" width="6" height="6" rx="1.4" {...common} />
      </>
    ),
    lock: (
      <>
        <Rect x="5" y="10.5" width="14" height="9.5" rx="2.4" {...common} />
        <Path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" {...common} />
      </>
    ),
    mail: (
      <>
        <Rect x="3.5" y="5.5" width="17" height="13" rx="2.4" {...common} />
        <Path d="m4.5 8 7.5 5 7.5-5" {...common} />
      </>
    ),
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shapes[name] || shapes.check}
    </Svg>
  );
}
