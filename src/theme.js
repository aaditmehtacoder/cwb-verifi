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

// Translucent material for floating chrome, bars, sheets, the code panel.
// The content beneath stays faintly legible, so nothing feels stacked on top
// of the room the way an opaque panel does.
export const glassStyle = {
  backgroundColor: 'rgba(255,255,255,0.66)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.72)',
  shadowColor: '#16232A',
  shadowOpacity: 0.1,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

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
