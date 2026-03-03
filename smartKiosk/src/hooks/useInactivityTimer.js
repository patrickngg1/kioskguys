// src/hooks/useInactivityTimer.js
import { useEffect, useRef, useCallback } from 'react';

/**
 * useInactivityTimer
 *
 * Two independent timers that both call onTimeout:
 *
 * ── Timer 1: Inactivity (limitMs) ──────────────────────────────────────────
 *
 * Why every previous approach failed for the cross-origin iframe:
 *
 *   pointerenter/pointerleave — iframe calls setPointerCapture on tap, which
 *     fires pointerleave on the wrapper immediately even though the finger is
 *     still on screen. Suspension ends the moment interaction starts.
 *
 *   mouseenter/mouseleave — correct for mouse, but a touchscreen kiosk has NO
 *     mouse cursor, so these events never fire during real touch interaction.
 *
 *   touchstart/touchend on the wrapper — touch events inside a cross-origin
 *     iframe are consumed entirely by the iframe's browsing context. They do
 *     NOT bubble to the parent document. The wrapper never sees them.
 *
 *   window 'blur' / 'focus' AND document.hasFocus() polling — both rely on
 *     keyboard focus moving to the iframe. Mappedin is a WebGL/canvas app.
 *     Canvas does NOT receive keyboard focus when touched on a touchscreen.
 *     So focus never moves, window.blur never fires, and document.hasFocus()
 *     always returns true — these mechanisms are completely blind to map use.
 *
 *   document 'pointerdown' bubble phase — on some Chrome/touchscreen configs,
 *     the cross-origin iframe can interrupt bubble propagation before the event
 *     reaches document. The bubble listener fires too late or not at all.
 *
 * The correct mechanism: document 'pointerdown' with capture:true
 *
 *   Using { capture: true } means the handler fires in the CAPTURE phase,
 *   which runs BEFORE the event reaches the <iframe> target. Nothing in
 *   the iframe's browsing context can prevent this handler from running.
 *   e.target is still the <iframe> element (target is fixed at dispatch time).
 *
 *   This works for:
 *     • Touchscreen single tap          → pointerdown on <iframe> ✓
 *     • Touchscreen drag / pinch zoom   → each new touch fires pointerdown ✓
 *     • Desktop mouse click             → pointerdown on <iframe> ✓
 *     • Multi-touch gestures            → each finger fires pointerdown ✓
 *     • User returns to sidebar         → pointerdown on non-map target ✓
 *
 * SUPPLEMENTARY: window 'message' from Mappedin
 *   If the Mappedin embed dispatches any postMessage (room selection, map
 *   interaction, analytics pings, etc.), treat it as user activity. This
 *   provides a second signal in case pointerdown alone is insufficient.
 *
 * ── Timer 2: Max session (maxSessionMs) ────────────────────────────────────
 * Fires unconditionally after maxSessionMs regardless of all activity.
 * Handles the case where a user walks away while still on the map (inactivity
 * timer is suspended, but max session fires and shows the warning modal).
 * Resets only when the user dismisses the modal (paused: true → false).
 *
 * @param {object}          options
 * @param {boolean}         options.enabled         - Activate (user is logged in)
 * @param {boolean}         options.paused          - Both timers suspended while modal is visible
 * @param {number}          options.limitMs         - Inactivity threshold ms  (default 60 000)
 * @param {number}          [options.maxSessionMs]  - Hard session cap ms — unconditional
 * @param {() => void}      options.onTimeout       - Called by either timer
 * @param {React.RefObject} [options.mapContainerRef] - Ref to the map wrapper div (used to identify map taps)
 */
export function useInactivityTimer({
  enabled,
  paused,
  limitMs = 60_000,
  maxSessionMs,
  onTimeout,
  mapContainerRef,
}) {
  const idleTimerRef = useRef(null);
  const maxTimerRef  = useRef(null);
  const isOverMapRef = useRef(false);

  // Stable ref so neither timer needs onTimeout in its dependency array.
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => { onTimeoutRef.current = onTimeout; });

  // ── reset (inactivity only) ─────────────────────────────────────────────────
  // Pushes the idle deadline forward. No-op while the map has the pointer.
  const reset = useCallback(() => {
    if (paused) return;
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
    if (isOverMapRef.current) return; // suspended — user is on the map
    idleTimerRef.current = setTimeout(() => onTimeoutRef.current?.(), limitMs);
  }, [paused, limitMs]);

  // ── 1. Window-level events (parent page interactions) ──────────────────────
  useEffect(() => {
    if (!enabled || paused) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
      return;
    }

    const EVENTS = [
      'mousemove', 'mousedown', 'keydown',
      'scroll', 'touchstart', 'touchmove', 'pointerdown',
    ];

    EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    };
  }, [enabled, paused, reset]);

  // ── 2. Cross-origin iframe: capture-phase pointerdown + postMessage ─────────
  //
  // PRIMARY — document.pointerdown with { capture: true }:
  //   Fires in the CAPTURE phase, before the event reaches <iframe>.
  //   e.target === <iframe> for any touch on the map area.
  //   capture:true means the iframe content cannot interfere with this handler.
  //
  // SUPPLEMENTARY — window 'message' from Mappedin origin:
  //   Many map embeds dispatch postMessages (room selection, ready events, etc.).
  //   Any message from app.mappedin.com is treated as ongoing map activity,
  //   keeping isOverMapRef=true and the idle timer suspended.
  //
  // SUPPLEMENTARY — window blur/focus:
  //   For desktop + keyboard navigation (no-op on this touchscreen kiosk
  //   because Mappedin canvas never receives keyboard focus, but costs nothing).
  useEffect(() => {
    if (!enabled) return;

    const getMapContainer = () =>
      mapContainerRef?.current ?? document.getElementById('map-frame');

    const onPointerDown = (e) => {
      const mapEl = getMapContainer();
      const tappedMap = mapEl != null && mapEl.contains(e.target);

      // DEBUG: uncomment the line below to verify what fires in Chrome DevTools
      // console.debug('[inactivity] pointerdown | target:', e.target?.tagName, e.target?.id, '| tappedMap:', tappedMap, '| mapEl:', mapEl?.id);

      if (tappedMap && !isOverMapRef.current) {
        // First touch on the map — suspend idle timer.
        isOverMapRef.current = true;
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      } else if (!tappedMap && isOverMapRef.current) {
        // User tapped parent UI — resume idle timer.
        isOverMapRef.current = false;
        // Effect 1's window 'pointerdown' fires next in the bubble phase;
        // reset() sees isOverMapRef.current===false and starts a fresh countdown.
      }
    };

    // Supplementary: any postMessage from Mappedin = map is still active.
    const onMapMessage = (e) => {
      if (e.origin !== 'https://app.mappedin.com') return;
      // DEBUG:
      // console.debug('[inactivity] mappedin message — keeping timer suspended');
      if (!isOverMapRef.current) {
        isOverMapRef.current = true;
      }
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    };

    // Supplementary: window blur/focus for desktop + keyboard navigation.
    const onWindowBlurFocus = () => {
      const iframeHasFocus = !document.hasFocus();
      if (iframeHasFocus === isOverMapRef.current) return;

      isOverMapRef.current = iframeHasFocus;
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;

      if (!iframeHasFocus && !paused) {
        idleTimerRef.current = setTimeout(
          () => onTimeoutRef.current?.(),
          limitMs
        );
      }
    };

    // capture: true — fires in the CAPTURE phase, before the event reaches
    // the <iframe> element. Nothing inside the iframe can prevent this handler
    // from running. The document-level capture fires after window-capture but
    // before the target phase, so isOverMapRef is set before Effect 1's
    // window.pointerdown (bubble) → reset() runs.
    document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    window.addEventListener('message', onMapMessage);
    window.addEventListener('blur',  onWindowBlurFocus);
    window.addEventListener('focus', onWindowBlurFocus);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('message', onMapMessage);
      window.removeEventListener('blur',  onWindowBlurFocus);
      window.removeEventListener('focus', onWindowBlurFocus);
      isOverMapRef.current = false;
    };
  }, [enabled, paused, limitMs]);

  // ── 3. Max session timer (unconditional) ───────────────────────────────────
  // Completely independent — not affected by map focus or user activity.
  // Fires after maxSessionMs no matter what. Resets when user dismisses
  // the modal. Cleared on logout.
  useEffect(() => {
    if (!enabled || paused || !maxSessionMs) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
      return;
    }

    maxTimerRef.current = setTimeout(
      () => onTimeoutRef.current?.(),
      maxSessionMs
    );

    return () => {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    };
  }, [enabled, paused, maxSessionMs]);
}
