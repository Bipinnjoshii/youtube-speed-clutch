/**
 * YouTube Temporary Speed Clutch — Popup Script
 *
 * Lets the user view and change the hotkey that triggers the clutch.
 * Persists the choice with chrome.storage.local, which content.js listens
 * to via chrome.storage.onChanged for live updates on already-open tabs.
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'clutchHotkey';
  const DEFAULT_HOTKEY = { code: 'ShiftLeft', label: 'Left Shift' };

  const currentHotkeyLabel = document.getElementById('currentHotkeyLabel');
  const changeBtn = document.getElementById('changeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusText = document.getElementById('statusText');

  let hotkey = DEFAULT_HOTKEY;
  let isListening = false;

  /**
   * Translates a KeyboardEvent.code value into a human-readable label
   * for display. This is purely cosmetic — matching in content.js always
   * happens against the raw `code`, never this label.
   *
   * Adding support for a brand-new key later requires no code changes here
   * unless you want a friendlier label than the raw `code` fallback.
   */
  function codeToLabel(code) {
    const knownLabels = {
      ShiftLeft: 'Left Shift',
      ShiftRight: 'Right Shift',
      ControlLeft: 'Left Ctrl',
      ControlRight: 'Right Ctrl',
      AltLeft: 'Left Alt',
      AltRight: 'Right Alt',
      Space: 'Space',
      CapsLock: 'Caps Lock',
      Tab: 'Tab',
      Backquote: '`',
    };

    if (knownLabels[code]) return knownLabels[code];
    if (code.startsWith('Key')) return code.replace('Key', '');
    if (code.startsWith('Digit')) return code.replace('Digit', '');
    if (code.startsWith('Arrow')) return `${code.replace('Arrow', '')} Arrow`;
    if (/^F\d{1,2}$/.test(code)) return code;
    return code;
  }

  function render() {
    currentHotkeyLabel.textContent = hotkey.label;
    if (!isListening) {
      statusText.textContent = `Hold "${hotkey.label}" on any YouTube video to temporarily set speed to 1x.`;
    }
  }

  function captureKey(event) {
    event.preventDefault();
    event.stopPropagation();

    if (event.code === 'Escape') {
      cancelListening();
      return;
    }

    const newHotkey = { code: event.code, label: codeToLabel(event.code) };

    chrome.storage.local.set({ [STORAGE_KEY]: newHotkey }, () => {
      hotkey = newHotkey;
      cancelListening();
    });
  }

  function startListening() {
    if (isListening) return;
    isListening = true;
    changeBtn.textContent = 'Press any key… (Esc to cancel)';
    statusText.textContent = 'Waiting for a key press…';
    document.addEventListener('keydown', captureKey, true);
  }

  function cancelListening() {
    isListening = false;
    document.removeEventListener('keydown', captureKey, true);
    changeBtn.textContent = 'Change Hotkey';
    render();
  }

  function resetToDefault() {
    chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_HOTKEY }, () => {
      hotkey = DEFAULT_HOTKEY;
      render();
    });
  }

  function init() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      hotkey = (result && result[STORAGE_KEY]) || DEFAULT_HOTKEY;
      render();
    });

    changeBtn.addEventListener('click', startListening);
    resetBtn.addEventListener('click', resetToDefault);
  }

  init();
})();
