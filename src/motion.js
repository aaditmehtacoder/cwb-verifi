import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Respect prefers-reduced-motion: callers replace orchestrated motion with a 200ms fade.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduced(!!v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

export const dur = (reduced, ms) => (reduced ? 200 : ms);
