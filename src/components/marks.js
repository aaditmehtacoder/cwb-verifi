import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * Identity provider marks.
 *
 * These are the one place in Verifi where the palette is not ours. A sign-in
 * button carries a trust signal that only works when the mark is the mark
 * somebody already recognises, so each is drawn from the vendor's own published
 * geometry rather than approximated: Google's four-path G, Microsoft's four
 * squares in their exact hexes, Apple's glyph.
 *
 * Microsoft's red square is the only red in this product. Everywhere else ochre
 * carries urgency and red is banned, because red on a screen about children
 * reads as a casualty. A vendor logo is not the product speaking, so it stands,
 * and the rule holds for every pixel Verifi itself draws.
 */

export function GoogleMark({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

/** Four squares, one gutter, the hexes from Microsoft's brand sheet. */
export function MicrosoftMark({ size = 18 }) {
  const s = 10.4;
  const gap = 1.2;
  const a = 1;
  const b = a + s + gap;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={a} y={a} width={s} height={s} fill="#F25022" />
      <Rect x={b} y={a} width={s} height={s} fill="#7FBA00" />
      <Rect x={a} y={b} width={s} height={s} fill="#00A4EF" />
      <Rect x={b} y={b} width={s} height={s} fill="#FFB900" />
    </Svg>
  );
}

/**
 * The Apple glyph. Monochrome by rule: Apple's guidelines allow black or
 * white only, and on a white button that means black.
 */
export function AppleMark({ size = 18, color = '#000000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M17.05 12.72c-.03-2.62 2.14-3.88 2.24-3.94-1.22-1.79-3.12-2.03-3.8-2.06-1.62-.16-3.16.95-3.98.95-.82 0-2.09-.93-3.43-.9-1.77.03-3.4 1.03-4.31 2.61-1.83 3.18-.47 7.89 1.31 10.47.87 1.26 1.91 2.68 3.28 2.63 1.32-.05 1.81-.85 3.4-.85 1.59 0 2.03.85 3.42.82 1.41-.02 2.31-1.29 3.17-2.55 1-1.46 1.41-2.88 1.44-2.95-.03-.01-2.76-1.06-2.79-4.2z"
      />
      <Path
        fill={color}
        d="M14.47 4.97c.72-.88 1.21-2.1 1.08-3.31-1.04.04-2.3.69-3.05 1.57-.67.77-1.26 2.01-1.1 3.2 1.16.09 2.35-.59 3.07-1.46z"
      />
    </Svg>
  );
}

export default { GoogleMark, MicrosoftMark, AppleMark };
