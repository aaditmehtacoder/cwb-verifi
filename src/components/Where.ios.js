import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { C, F, R, S, T } from '../theme';
import { mapAppName, openInMaps } from '../maps';

/**
 * Where a confirmation happened, on iOS, drawn by Apple Maps.
 *
 * `PROVIDER_DEFAULT` on iOS is MapKit, which is the reason this needs no API
 * key, no billing account and no network configuration: it is the same map
 * engine the phone's own Maps app runs on, already present in the OS.
 *
 * The map is deliberately small, flat and non-interactive. It answers "which
 * part of the building" at a glance and then gets out of the way; a staff
 * member who actually has to walk there taps through to Apple Maps proper,
 * where there is turn-by-turn. Scroll, zoom and rotate are off so that dragging
 * a finger down the sheet this usually sits in scrolls the sheet rather than
 * panning a map nobody meant to touch.
 *
 * The circle is the GPS accuracy, drawn honestly. A pin alone claims a precision
 * indoor positioning does not have, and overstating where a child was seen is
 * exactly the kind of false confidence this product exists to refuse.
 */
export default function Where({ lat, lon, accuracy, place, label, style, height = 150 }) {
  if (lat == null || lon == null) return null;

  // Roughly 150 m across, which is a school campus rather than a city.
  const delta = 0.0015;

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
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ height }}
        pointerEvents="none"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsUserLocation={false}
        showsCompass={false}
        showsScale={false}
        initialRegion={{ latitude: lat, longitude: lon, latitudeDelta: delta, longitudeDelta: delta }}
      >
        {accuracy ? (
          <Circle
            center={{ latitude: lat, longitude: lon }}
            radius={Math.max(accuracy, 8)}
            strokeColor="rgba(18,79,76,0.45)"
            fillColor="rgba(18,79,76,0.12)"
            strokeWidth={1}
          />
        ) : null}
        <Marker
          coordinate={{ latitude: lat, longitude: lon }}
          title={label || place || 'Confirmed here'}
          pinColor={C.verified}
        />
      </MapView>

      <View style={{ padding: S.md, gap: 2, borderTopWidth: 1, borderTopColor: C.rule }}>
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
