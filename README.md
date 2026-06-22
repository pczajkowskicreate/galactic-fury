# Galactic Fury

A fast-paced arcade space shooter built with **Phaser 3.60** and fully synthesized **Web Audio** sound — no audio files needed.

## Features

- 3 campaign stages · 25 waves · 5 boss fights
- Endless mode with escalating difficulty tiers
- Secret Prism Dimension bonus area
- Rainbow Combo system
- 11 enemy types including Void Leech bonus encounter
- Fully synthesized sound via Web Audio API
- Pixel art assets (Warped, Gothicvania, PixelLab AI)

## How to Play

### Windows — double-click to launch
Double-click **`play.bat`** — it starts a local server and opens your browser automatically.  
Requires **Python 3** (free: [python.org](https://python.org)).

### Any OS — terminal
```
python -m http.server 8000
```
Then open **http://localhost:8000** in your browser.

### VS Code
Right-click `index.html` → **Open with Live Server** (requires the Live Server extension).

> `index.html` cannot be opened directly by double-clicking — browsers block local file loading for security, so a server is required.

## Controls

| Action | Key |
|--------|-----|
| Move | WASD / Arrow keys |
| Fire | SPACE |
| Plasma Shield | E |
| Pause | P / ESC |
| How to Play / Bestiary | H |

## Credits

- **Game design & code**: Przemyslaw Czajkowski & Claude (Anthropic)
- **Engine**: Phaser 3.60
- **Art**: Warped · Gothicvania · PixelLab AI
- **Sound**: Web Audio API — fully synthesized
