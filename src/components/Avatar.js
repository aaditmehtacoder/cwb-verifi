import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { C, F } from '../theme';

/**
 * A face, where a face helps a person do their job.
 *
 * Staff carry one so a name on the board reads as somebody you can picture, and
 * a scanned student shows theirs so the staff member can check that the record
 * matches the person actually standing there. That check is the entire reason a
 * human confirmation is worth more than a scan.
 *
 * The accountability field deliberately has none. A hundred faces on one screen
 * is a directory of children, and the board only ever needs to say counted or
 * not counted.
 *
 * Faces are generated, never photographs of real people. A school roster of
 * children is the last place to hotlink stock portraits, and an illustrated
 * face still does the one job that matters: giving a staff member something to
 * check against the person in front of them.
 *
 * Each seed always resolves to the same face, and initials carry the load until
 * one arrives, or permanently if the network is down, which during an event it
 * often is.
 */

export function photoFor(seed) {
  if (!seed) return null;
  const who = encodeURIComponent(String(seed));
  // Muted paper grey behind every face, so a wall of them still reads as one
  // surface rather than a patchwork.
  return `https://api.dicebear.com/9.x/notionists/png?seed=${who}&size=200&backgroundColor=e7eae9&scale=105`;
}

export default function Avatar({ name, seed, uri, size = 40, style, ring }) {
  const [failed, setFailed] = useState(false);
  const source = uri || photoFor(seed || name);

  const initials = String(name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#E7EAE9',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: ring ? 2 : 1,
          borderColor: ring || C.rule,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: F.monoMed, fontSize: size * 0.32, color: C.inkSoft }}>{initials}</Text>
      {source && !failed ? (
        <Image
          source={{ uri: source }}
          onError={() => setFailed(true)}
          style={{ position: 'absolute', width: size, height: size }}
        />
      ) : null}
    </View>
  );
}
