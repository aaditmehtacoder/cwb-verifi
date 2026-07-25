import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Check, Rule } from '../components/ui';

// ── Slide art ────────────────────────────────────────────────────────────────
// Everything is drawn from the same tokens as the product. No photographs, 
// this app never shows a picture of a student.

function MiniField() {
  const rows = [
    ['v', 'v', 'v', 'v', 'v', 'v', 'v', 'v', 'v', 'v'],
    ['v', 'v', 'p', 'v', 'v', 'v', 'v', 'v', 'v', 'v'],
    ['v', 'v', 'v', 'v', 'v', 'v', 'a', 'a', 'a', 'a'],
  ];
  const color = { v: C.verified, p: C.pending, a: C.absent };

  return (
    <View style={[cardStyle, { padding: S.lg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={T.label}>Accountability field</Text>
        <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>10:41</Text>
      </View>
      <View style={{ marginTop: S.md, gap: 6 }}>
        {rows.map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
            {row.map((s, j) => (
              <View
                key={j}
                style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: color[s] }}
              />
            ))}
          </View>
        ))}
      </View>
      <Rule style={{ marginVertical: S.lg }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: S.sm }}>
        <Text style={{ fontFamily: F.monoSemi, fontSize: 24, color: C.ink }}>99</Text>
        <Text style={{ fontFamily: F.mono, fontSize: 14, color: C.inkSoft }}>/ 100 verified</Text>
      </View>
    </View>
  );
}

function MiniSuggestion() {
  return (
    <View style={[cardStyle, { padding: S.lg }]}>
      <View
        style={{
          backgroundColor: 'rgba(18,79,76,0.06)',
          borderLeftWidth: 1,
          borderLeftColor: C.accent,
          borderRadius: 6,
          padding: S.md,
        }}
      >
        <Text style={[T.label, { fontSize: 10, color: C.accent }]}>Suggestion, not a confirmation</Text>
        <Text style={{ fontFamily: F.ui, fontSize: 13, lineHeight: 20, color: C.ink, marginTop: 6 }}>
          Probable match at Nurse Checkpoint. A staff member must verify.
        </Text>
      </View>

      <View style={{ alignItems: 'center', paddingVertical: S.md }}>
        <Text style={{ fontFamily: F.mono, fontSize: 16, color: C.rule }}>↓</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: S.md,
          borderWidth: 1,
          borderColor: C.rule,
          borderRadius: R.card,
          padding: S.md,
        }}
      >
        <Check size={16} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.ink }}>
            Maya Reyes is with me.
          </Text>
          <Text style={{ fontFamily: F.ui, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
            R. Alvarez · 10:42
          </Text>
        </View>
      </View>
    </View>
  );
}

function MiniParent() {
  return (
    <View style={[cardStyle, { padding: S.lg }]}>
      <Text style={{ fontFamily: F.serif, fontSize: 20, lineHeight: 28, color: C.ink }}>
        Maya has been verified safe by school staff.
      </Text>
      <Rule style={{ marginVertical: S.md }} />
      <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.ink }}>
        Confirmed by Nurse R. Alvarez at 10:42.
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: S.sm,
          marginTop: S.md,
          backgroundColor: C.paper,
          borderRadius: 8,
          padding: S.md,
        }}
      >
        <View style={{ width: 34, height: 8, borderRadius: 4, backgroundColor: C.rule }} />
        <Text style={{ fontFamily: F.ui, fontSize: 12, lineHeight: 18, color: C.inkSoft, flex: 1 }}>
          Location withheld during an active event.
        </Text>
      </View>
    </View>
  );
}

const SLIDES = [
  {
    id: 'count',
    art: MiniField,
    title: 'Every student, accounted for.',
    body: 'In an emergency, the count is the whole job. Verifi keeps it live on every phone in the building.',
  },
  {
    id: 'human',
    art: MiniSuggestion,
    title: 'A person always confirms.',
    body: 'Verifi gathers evidence and suggests where to look. Only a staff member can mark a student safe.',
  },
  {
    id: 'privacy',
    art: MiniParent,
    title: 'Families get certainty, not location.',
    body: 'Parents see one thing: confirmed, or not yet. Nothing that could put a student at risk.',
  },
];

function Dots({ count, active }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === active ? C.accent : C.rule,
          }}
        />
      ))}
    </View>
  );
}

export default function Onboarding({ navigate }) {
  // The pager measures itself, so each slide is exactly one screen and its
  // content sits centred rather than stacked at the top.
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);
  const scroller = useRef(null);

  const goTo = (next) => {
    if (next >= SLIDES.length) {
      navigate('signin');
      return;
    }
    setPage(next);
    scroller.current?.scrollTo({ x: next * w, animated: true });
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: S.xl,
          paddingTop: S.lg,
        }}
      >
        <Text style={{ fontFamily: F.uiSemi, fontSize: 18, letterSpacing: -0.18, color: C.ink }}>Verifi</Text>
        <Pressable
          onPress={() => navigate('signin')}
          accessibilityRole="button"
          hitSlop={12}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: F.uiSemi, fontSize: 13, color: C.accent }}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setSize({ w: width, h: height });
        }}
        onScroll={(e) => {
          if (!w) return;
          const next = Math.round(e.nativeEvent.contentOffset.x / w);
          if (next !== page) setPage(next);
        }}
        style={{ flex: 1 }}
      >
        {w > 0
          ? SLIDES.map((slide) => {
            const Art = slide.art;
            return (
              <View
                key={slide.id}
                style={{
                  width: w,
                  height: h,
                  paddingHorizontal: S.xl,
                  paddingBottom: S.xl,
                  justifyContent: 'center',
                }}
              >
                <Art />
                <Text style={[T.title, { fontSize: 26, lineHeight: 32, marginTop: S.xxl }]}>{slide.title}</Text>
                <Text style={[T.body, { color: C.inkSoft, marginTop: S.md }]}>{slide.body}</Text>
              </View>
            );
          })
          : null}
      </ScrollView>

      <View style={{ padding: S.xl, paddingTop: S.md, gap: S.lg }}>
        <Dots count={SLIDES.length} active={page} />
        <Button
          title={page === SLIDES.length - 1 ? 'Get started' : 'Next'}
          onPress={() => goTo(page + 1)}
        />
        <Text style={[T.label, { fontSize: 10, textAlign: 'center', letterSpacing: 0.9 }]}>
          Institutional grade safety · FERPA compliant
        </Text>
      </View>
    </View>
  );
}
