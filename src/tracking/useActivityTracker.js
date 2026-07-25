/**
 * Wires GPS into the tracking engine and hands a screen a live, readable state.
 *
 * To move to background capture in a development build, change the import below
 * to ./locationService, add `import './tracking/locationService';` at the app
 * entry, then `npx expo install expo-task-manager expo-dev-client` and
 * `eas build --profile development`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createTracker } from './trackingEngine';
import { isBackgroundCapable, requestPermission, watch } from './locationService.expoGo';

export default function useActivityTracker() {
  const tracker = useRef(createTracker());
  const stopWatch = useRef(null);
  const [running, setRunning] = useState(false);
  const [permission, setPermission] = useState(null);
  const [track, setTrack] = useState(tracker.current.state);

  // The clock has to move between fixes, or a stationary screen looks frozen.
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setTrack(tracker.current.state), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => () => stopWatch.current?.(), []);

  const start = useCallback(async () => {
    const granted = await requestPermission();
    setPermission(granted);
    if (!granted) return false;

    tracker.current.start();
    setTrack(tracker.current.state);
    setRunning(true);

    stopWatch.current = await watch((fix) => {
      setTrack(tracker.current.add(fix));
    });
    return true;
  }, []);

  const stop = useCallback(() => {
    stopWatch.current?.();
    stopWatch.current = null;
    const final = tracker.current.stop();
    setRunning(false);
    setTrack(final);
    return final;
  }, []);

  return { running, permission, track, start, stop, isBackgroundCapable };
}
