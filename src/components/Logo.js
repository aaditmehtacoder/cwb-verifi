import React from 'react';
import { Image } from 'react-native';

/**
 * The Verifi mark: assets/logo.png, the file itself rather than a redrawing of
 * it, so the mark on screen is byte for byte the mark on the home screen and in
 * every export.
 *
 * `mono` tints it a single colour, which the dark event bar needs, since the
 * artwork's own gradient is light and would otherwise sit too quietly on it.
 */
const SOURCE = require('../../assets/icon.png');

export default function Logo({ size = 40, mono, style }) {
  return (
    <Image
      source={SOURCE}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Verifi"
      style={[{ width: size, height: size }, mono ? { tintColor: mono } : null, style]}
    />
  );
}
