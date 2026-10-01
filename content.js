/**
 * YouTube Temporary Speed Clutch — Content Script
 *
 * Responsibility:
 *   While the configured hotkey is held down on a YouTube page, force the
 *   active video's playbackRate to 1x. The instant the key is released
 *   (or focus/visibility is lost), restore whatever rate was active before
 *   the key was pressed.
 *
 * Design notes:
 *   - We rely on `event.code` (not `event.key`) because `code` reports the
 *     physical key location (e.g. "ShiftLeft" vs "ShiftRight"), which is
 *     required to satisfy "only the LEFT Shift key should trigger this".
 *   - We never call `event.preventDefault()`. This extension only reacts to
 *     the hotkey; it does not stop the event from reaching YouTube's own
 *     handlers, so we never break native shortcuts.
 *   - All state lives in module-scoped `let` variables inside an IIFE, so
 *     nothing leaks onto `window` or clashes with YouTube's own scripts.
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'clutchHotkey';
  const DEFAULT_HOTKEY = { code: 'ShiftLeft', label: 'Left Shift' };

  // The hotkey currently in effect. Updated on load and whenever the user
  // changes it in the popup (via chrome.storage.onChanged).
  let currentHotkey = DEFAULT_HOTKEY;

  // Tracks the <video> element we last saw, so we can detect YouTube's SPA
  // navigation swapping in a new video without a full page reload.
  let currentVideo = null;

  // True while the hotkey is physically held down and the clutch is engaged.
  let isClutching = false;

  // The playback rate that was active immediately before the clutch engaged.
  // This is what we restore to on release — never a hardcoded "2x" guess.
  let previousRate = 1;

  /**
   * Finds YouTube's main video element.
   * `video.html5-main-video` is the class YouTube's own player uses for the
   * primary player; falling back to a generic `video` selector covers
   * embeds or markup changes. Returns `null` if no video exists yet
   * (e.g. the page hasn't finished loading a watch page).
   */
  function findVideoElement() {
    return (
      document.querySelector('video.html5-main-video') ||
      document.querySelector('video')
    );
  }

  /**
   * Returns true if the user is currently typing into a text field
   * (YouTube's search bar, a comment box, a live chat input, etc).
   * We must never hijack Shift in those contexts — Shift is used
   * constantly for capitalization while typing.
   */
  function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true; // covers YouTube's comment box
    return false;
  }

  /**
   * Sets playbackRate defensively. During SPA navigation a video element
   * can be mid-teardown (detached from the DOM) for a brief moment;
   * wrapping in try/catch means we fail silently instead of throwing
   * console errors (Feature 9).
   */
  function setRateSafely(video, rate) {
    if (!video) return;
    try {
      video.playbackRate = rate;
    } catch (error) {
      // Intentionally swallowed — video may be detached during navigation.
    }
  }

  /**
   * Engages the clutch: remembers the current speed, then forces 1x.
   * Guarded by `isClutching` so that OS keyboard-repeat (which fires
   * `keydown` repeatedly while a key is held) never re-triggers this and
   * never overwrites `previousRate` with 1x — that's what causes flicker
   * and data loss of the "real" previous speed (Feature 7).
   */
  function engageClutch(video) {
    if (isClutching) return;
    isClutching = true;
    previousRate = video.playbackRate;
    setRateSafely(video, 1);
  }

  /**
   * Releases the clutch: restores the remembered speed.
   * Safe to call multiple times or when not clutching — it's a no-op then.
   * We re-query the video element fresh here rather than relying on the
   * one captured at engage-time, in case a fast SPA navigation swapped
   * the underlying <video> node while the key was still held.
   */
  function releaseClutch() {
    if (!isClutching) return;
    isClutching = false;
    const video = findVideoElement();
    setRateSafely(video, previousRate);
  }

  function handleKeyDown(event) {
    if (event.code !== currentHotkey.code) return;
    if (isTypingTarget(event.target)) return;
    const video = findVideoElement();
    if (!video) return; // No video yet — fail gracefully, do nothing.
    engageClutch(video);
  }

  function handleKeyUp(event) {
    if (event.code !== currentHotkey.code) return;
    releaseClutch();
  }

  // If the window loses focus entirely (alt-tab, switching apps) while the
  // key is held, we will never receive a `keyup` for it. Releasing on blur
  // prevents the video getting stuck at 1x forever.
  function handleWindowBlur() {
    releaseClutch();
  }

  // Belt-and-suspenders alongside `blur`: also release when the tab becomes
  // hidden (switching browser tabs, minimizing).
  function handleVisibilityChange() {
    if (document.hidden) releaseClutch();
  }

  /**
   * YouTube is a Single Page Application — navigating to a new video does
   * NOT reload the page or re-inject content scripts. The old <video>
   * element is destroyed and a new one is created in its place. We detect
   * that swap here and reset any stale clutch state so we never restore a
   * playback rate onto the wrong (new) video.
   */
  function checkForVideoChange() {
    const video = findVideoElement();
    if (video && video !== currentVideo) {
      currentVideo = video;
      isClutching = false; // Any previous clutch state no longer applies.
    }
  }

  function loadHotkey() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) return;
      currentHotkey = (result && result[STORAGE_KEY]) || DEFAULT_HOTKEY;
    });
  }

  function init() {
    loadHotkey();

    // React live if the user changes the hotkey in the popup while this
    // page is already open, instead of requiring a page refresh.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY]) {
        currentHotkey = changes[STORAGE_KEY].newValue || DEFAULT_HOTKEY;
        releaseClutch(); // Safety: don't leave old key's clutch engaged.
      }
    });

    // `capture: true` ensures we see the key event on its way down through
    // the DOM, before YouTube's own player shortcuts might stop it from
    // bubbling. We still never call preventDefault, so nothing is broken.
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // YouTube fires this custom event after an SPA navigation completes.
    document.addEventListener('yt-navigate-finish', checkForVideoChange);

    // Fallback safety net: a cheap querySelector every second in case
    // 'yt-navigate-finish' doesn't fire (older UI, embeds, edge cases).
    checkForVideoChange();
    setInterval(checkForVideoChange, 1000);
  }

  init();
})();
