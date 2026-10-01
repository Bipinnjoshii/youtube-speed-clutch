# ⚡ YouTube Speed Clutch

> **Hold a key → speed drops to 1x. Release → your original speed snaps back. Instantly.**

A lightweight Chrome extension for YouTube power-users who watch at 1.5x, 2x, or higher and want a quick way to slow down for a moment — like a clutch pedal for your video speed.

---

## 🎬 Demo

| Action | Result |
|--------|--------|
| Set YouTube to 2x speed | Video plays fast |
| Hold **Left Shift** | Instantly drops to 1× |
| Release **Left Shift** | Snaps back to 2× |
| Change hotkey in popup | Works on already-open tabs, no refresh needed |

---

## ✨ Features

- 🎯 **Hold-to-slow** — hold any key to drop to 1x, release to restore your speed
- ⌨️ **Fully customizable hotkey** — rebind to any key from the popup
- 🔁 **SPA-aware** — works across YouTube navigation without page reloads
- 🛡️ **Smart context detection** — won't trigger while typing in search bar or comments
- 🪟 **Focus-safe** — releases clutch if you alt-tab or switch browser tabs
- 🚫 **Zero bloat** — no npm, no bundler, no build step — pure HTML/CSS/JS
- 🔒 **Minimal permissions** — only uses `storage`, nothing else

---

## 📦 Installation (Load Unpacked)

> **No Chrome Web Store needed** — load it directly in 30 seconds.

1. **Download** this repository (click `Code → Download ZIP` and extract it)
2. Open Chrome and go to `chrome://extensions`
3. Toggle **Developer mode** ON (top-right corner)
4. Click **Load unpacked**
5. Select the `youtube-speed-clutch` folder
6. Done! 🎉 Open any YouTube video and try it

---

## 🎮 How to Use

1. Open any YouTube video
2. Set your preferred speed (e.g. **2x** via the gear icon ⚙️)
3. Hold **Left Shift** — video instantly drops to **1x**
4. Release — speed **snaps back to 2x**

### Changing the Hotkey

1. Click the extension icon in your toolbar
2. Click **Change Hotkey**
3. Press any key (or `Esc` to cancel)
4. It saves instantly — works on already-open tabs immediately!
5. Click **Reset to Default** to go back to Left Shift

---

## 📁 Project Structure

```
youtube-speed-clutch/
├── manifest.json       # Extension config (Manifest V3)
├── content.js          # Core logic — runs inside YouTube pages
├── popup.html          # Toolbar popup UI
├── popup.css           # Popup styling (YouTube dark theme)
├── popup.js            # Hotkey settings & storage
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🧠 How It Works

```
User holds hotkey
      │
      ▼
content.js detects keydown (via event.code, capture phase)
      │
      ├─ Is user typing? (INPUT/TEXTAREA/contentEditable) → ignore
      ├─ Is video element found? → if not, silently do nothing
      │
      ▼
engageClutch()
  - Saves current playbackRate as previousRate
  - Sets video.playbackRate = 1
      │
      ▼
User releases hotkey
      │
      ▼
releaseClutch()
  - Restores video.playbackRate = previousRate
```

**Key design decisions:**
- Uses `event.code` (not `event.key`) to distinguish Left vs Right Shift
- Never calls `event.preventDefault()` — YouTube's own shortcuts still work
- Guards against keyboard repeat with `isClutching` flag to prevent rate overwrite
- Handles YouTube's SPA navigation via `yt-navigate-finish` event + 1s interval fallback

---

## 🛡️ Edge Cases Handled

| Edge Case | How It's Handled |
|-----------|-----------------|
| SPA navigation (new video, no reload) | `yt-navigate-finish` listener + 1s interval fallback |
| Key held before video loads | Silently does nothing |
| Keyboard repeat (OS auto-repeat) | `isClutching` flag prevents rate overwrite |
| Alt-tab / window focus lost | `blur` event triggers `releaseClutch()` |
| Switching browser tabs | `visibilitychange` listener triggers `releaseClutch()` |
| Typing in search/comments | `isTypingTarget()` check skips the hotkey |
| Multiple `<video>` elements | Prioritizes `video.html5-main-video` (YouTube's main player) |
| Fullscreen / Theater / PiP | Same `<video>` DOM reference — works unchanged |
| Left vs Right Shift | Matched on `event.code`, not `event.key` |

---

## 🚀 Publishing to Chrome Web Store

1. ZIP the folder contents (so `manifest.json` is at the ZIP root)
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay the one-time **\$5** developer fee (if not already done)
4. Click **New Item** → upload the ZIP
5. Fill in store listing details, screenshots, and privacy practices
6. Submit for review — minimal-permission extensions like this review fast!

---

## 🤝 Contributing

Pull requests are welcome! Some ideas for improvement:

- [ ] On-screen "1×" overlay badge while clutch is engaged
- [ ] Support for modifier key combos (e.g. `Ctrl+Shift`)
- [ ] `MutationObserver` instead of polling interval for video detection
- [ ] Firefox / Edge support

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">
  Made with ❤️ for YouTube speed-watchers everywhere
  <br/>
  <sub>If this helped you, consider giving it a ⭐</sub>
</div>
