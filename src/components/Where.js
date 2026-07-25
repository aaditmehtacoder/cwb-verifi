import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, F, R, S, T } from '../theme';
import { mapAppName, openInMaps } from '../maps';

/**
 * Where a confirmation happened, everywhere that is not iOS.
 *
 * The iOS build of this file draws an inline Apple Maps view; see `Where.ios.js`.
 * Android would need a Google Maps API key to render anything but a grey
 * rectangle, and a grey rectangle is worse than no map, so here the position is
 * stated in words and figures and handed to whichever map app the phone has.
 *
 * Metro picks between the two by filename, so react-native-maps is never even
 * pulled into the Android or web bundle.
 */
export default function Where({ lat, lon, accuracy, place, label, style }) {
  if (lat == null || lon == null) return null;

  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: C.rule,
          borderRadius: R.card,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.8)',
        },
        style,
      ]}
    >
      <View style={{ padding: S.md, gap: 2 }}>
        <Text style={[T.label, { fontSize: 10 }]}>Confirmed at</Text>
        <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>
          {place || 'a recorded position'}
        </Text>
        <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>
          {lat.toFixed(5)}, {lon.toFixed(5)}
          {accuracy ? ` ±${Math.round(accuracy)} m` : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => openInMaps({ lat, lon, label: label || place })}
        accessibilityRole="button"
        accessibilityLabel={`Open in ${mapAppName}`}
        style={({ pressed }) => ({
          minHeight: 46,
          alignItems: 'center',
          justifyContent: 'center',
          borderTopWidth: 1,
          borderTopColor: C.rule,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ fontFamily: F.uiSemi, fontSize: 13, color: C.accent }}>
          Open in {mapAppName}
        </Text>
      </Pressable>
    </View>
  );
}
