// Verifi design tokens.
// Light mode only. There is no red anywhere in this product, ochre carries all urgency.

export const C = {
  paper: '#F1F3F2',
  card: '#FFFFFF',
  ink: '#16232A',
  inkSoft: '#5C6B72',
  rule: '#DDE2E1',
  verified: '#2F7D68',
  pending: '#B98524',
  absent: '#98A2A6',
  reunified: '#3E6FA3',
  accent: '#124F4C',
};

// Three faces, each with a job.
// Archivo, the system talking. Serif, a human vouched for it. Mono, figures.
export const F = {
  ui: 'Archivo_400Regular',
  uiMed: 'Archivo_500Medium',
  uiSemi: 'Archivo_600SemiBold',
  serif: 'SourceSerif4_400Regular',
  serifSemi: 'SourceSerif4_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMed: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const R = { card: 16, small: 10, tile: 4, pill: 999 };

// Type scale: 32/24/18/15/13/11
export const T = {
  // Display and title tighten as they grow, the way institutional signage does.
  display: { fontFamily: F.uiSemi, fontSize: 32, lineHeight: 37, letterSpacing: -0.6, color: C.ink },
  title: { fontFamily: F.uiSemi, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: C.ink },
  heading: { fontFamily: F.uiSemi, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: C.ink },
  body: { fontFamily: F.ui, fontSize: 15, lineHeight: 23, letterSpacing: -0.05, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 13, lineHeight: 20, letterSpacing: -0.02, color: C.inkSoft },
  label: {
    fontFamily: F.uiSemi,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    color: C.inkSoft,
  },
  // Serif is reserved for statements a human has confirmed, and for the all-clear.
  // The serif is set a touch looser: it is the one voice meant to be read slowly.
  vouched: { fontFamily: F.serif, fontSize: 24, lineHeight: 33, color: C.ink },
  vouchedSm: { fontFamily: F.serif, fontSize: 15, lineHeight: 23, color: C.ink },
  mono: { fontFamily: F.mono, fontSize: 13, letterSpacing: 0.2, color: C.ink },
};

// Surfaces sit on the paper like glass on a table: a hairline edge, a soft
// low shadow, no glow.
export const cardStyle = {
  backgroundColor: C.card,
  borderWidth: 1,
  borderColor: C.rule,
  borderRadius: R.card,
  shadowColor: '#16232A',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

// ── Glass ────────────────────────────────────────────────────────────────────
//
// Real glass is not a translucent rectangle. It has a lit edge where light
// catches the bevel, a shadowed edge where it does not, and it lifts off the
// surface underneath rather than lying flat on it. Three tokens carry that:
// `glassStyle` is the body, `glassSheen` is the highlight along the top inner
// edge, and `glassEdge` is the hairline that separates the pane from the paper.
//
// The rule that governs where this is allowed has not changed and is the whole
// reason it stays legible: glass is for chrome that floats over content. A
// reading surface stays flat and opaque, so text contrast never depends on what
// happens to be scrolling underneath it. Ninety-nine saturated tiles behind a
// sentence is not a background, it is noise.

export const glassStyle = {
  backgroundColor: 'rgba(255,255,255,0.62)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.85)',
  shadowColor: '#0B1C22',
  shadowOpacity: 0.12,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
};

// The lit top edge. An absolutely positioned hairline, one pixel inside the
// border, at the low opacity a real bevel actually catches.
export const glassSheen = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 1,
  backgroundColor: 'rgba(255,255,255,0.9)',
};

// A denser pane, for chrome that has to stay readable over the field.
export const glassSolidStyle = {
  ...glassStyle,
  backgroundColor: 'rgba(255,255,255,0.93)',
  borderColor: 'rgba(255,255,255,0.95)',
};

// The accent-tinted pane, for the one surface on a screen that is the subject
// rather than the frame.
export const glassAccentStyle = {
  ...glassStyle,
  backgroundColor: 'rgba(18,79,76,0.07)',
  borderColor: 'rgba(18,79,76,0.16)',
};

// The wash the glass sits on. Two soft pools of colour, far apart and very
// faint, so a pane has something to refract instead of flat grey. Rendered as
// plain views rather than a gradient dependency; at 3% nobody can tell, and it
// is one fewer thing to fail on a phone in a hallway.
export const AMBIENT = [
  { color: 'rgba(18,79,76,0.055)', size: 380, top: -140, left: -120 },
  { color: 'rgba(47,125,104,0.05)', size: 320, top: 300, left: 200 },
  { color: 'rgba(185,133,36,0.035)', size: 300, top: 620, left: -90 },
];

export const statusColor = {
  verified: C.verified,
  pending: C.pending,
  absent: C.absent,
  reunified: C.reunified,
};

export const statusLabel = {
  verified: 'Verified',
  pending: 'Needs verification',
  absent: 'Absent',
  reunified: 'Reunified',
};

export const MIN_TAP = 56;
