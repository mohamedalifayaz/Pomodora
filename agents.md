# agents.md — Project Intelligence Guide

> This file helps AI agents and contributors quickly understand the project structure,
> architecture decisions, coding patterns, and conventions used throughout this codebase.

---

## 📁 Project Overview

**Project Name:** Pomodora
**Location:** `/home/workspace/Pomodora`

This repository contains **two distinct sub-projects** that share the same workspace:

| Sub-project | Type | Language(s) | Entry Point |
|---|---|---|---|
| Pomodoro Timer | Web App (front-end only) | HTML + CSS + Vanilla JS | `index.html` |
| Python Mini-Games | CLI Games | Python 3 | Individual `.py` files |

---

## 🗂️ File Structure

```
Pomodora/
├── index.html              # Pomodoro Timer — full app markup + SVG ring
├── style.css               # Pomodoro Timer — all styles (dark theme, animations)
├── app.js                  # Pomodoro Timer — all logic (timer, audio, state, DOM)
│
├── guess_the_number.py     # CLI game: player guesses a random number
├── hangman.py              # CLI game: classic letter-guessing word game
├── play_tic_tac_toe.py     # CLI game: two-player 3×3 Tic-Tac-Toe
│
├── README.md               # Project overview and challenge list for Python games
├── agents.md               # ← You are here
│
└── .zcode/
    ├── launch.json         # IDE run/debug configurations
    ├── settings.json       # IDE workspace settings
    └── tasks.json          # IDE task definitions
```

---

## 🍅 Sub-project 1 — Pomodoro Timer (Web App)

### Purpose
A fully functional, visually polished Pomodoro productivity timer. No frameworks, no
build steps — pure HTML/CSS/JS served directly from `index.html`.

### Technology Stack
- **HTML5** — semantic markup, SVG progress ring, inline Google Fonts link
- **CSS3** — CSS custom properties (variables), animations, `backdrop-filter`, flexbox
- **Vanilla JavaScript (ES6+)** — `setInterval`, Web Audio API, `localStorage`

### Architecture: Single-File JS (`app.js`)
The entire application logic lives in `app.js` and is organised into clearly labelled
sections using `// ─── Section Name ───` banners:

| Section | Responsibility |
|---|---|
| `CONFIG` | Immutable timer durations and labels per mode |
| `state` | Single mutable object — all runtime state lives here |
| `DOM refs` | All `getElementById` / `querySelector` calls (declared once at top) |
| Ring helpers | SVG `strokeDashoffset` calculation for the circular progress ring |
| Display | `updateDisplay()`, `formatTime()`, `renderStats()`, `renderSessionDots()` |
| Mode switching | `setMode(mode, autoStart)` — switches between "focus" and "break" |
| Timer logic | `startTimer()`, `stopTimer()`, `handleTimerEnd()` |
| Button state | `setBtnState(running)` — toggles Play/Pause icon + text |
| Toast | `showToast(icon, msg)` — temporary notification overlay |
| Audio Context | Singleton `AudioContext` getter |
| Tick Sound | `playTick()`, `startTicking()`, `stopTicking()` — mechanical click via Web Audio |
| Bell Sound | `playBell()` — multi-harmonic bell when a session completes |
| Event listeners | Click handlers for Start/Stop, Reset, Skip, Tab buttons |
| Keyboard shortcuts | `Space` = Start/Pause, `R` = Reset, `S` = Skip |
| Init | Ring setup, initial `updateDisplay()`, `renderStats()`, `renderSessionDots()` |

### Key Constants
```js
CONFIG.focus.duration = 25 * 60   // 1500 seconds
CONFIG.break.duration =  5 * 60   //  300 seconds
SESSIONS_PER_CYCLE    = 4         // dots shown in the header
CIRCUMFERENCE         = 2π × 96  // ≈ 603.19 (SVG circle r=96)
```

### State Shape
```js
state = {
  mode:         "focus" | "break",
  running:      Boolean,
  timeLeft:     Number,       // seconds remaining
  totalSeconds: Number,       // total seconds for current mode (for ring ratio)
  timerId:      Number|null,  // setInterval ID
  sessionsDone: Number,       // completed focus sessions (this browser session)
  todayCount:   Number,       // persisted via localStorage
  totalCount:   Number,       // persisted via localStorage
  focusMins:    Number,       // persisted via localStorage
  lastDate:     String,       // ISO date string for daily reset
}
```

### localStorage Keys
| Key | Value | Description |
|---|---|---|
| `pomo_today` | Number | Focus sessions completed today |
| `pomo_total` | Number | All-time focus sessions |
| `pomo_focus` | Number | Total accumulated focus minutes |
| `pomo_date`  | String | `new Date().toDateString()` — used to reset daily counter |

### CSS Architecture
All styles are in `style.css` and follow a **section-per-component** pattern, separated
by `/* ─── Section Name ───── */` banners matching the HTML structure.

**CSS Custom Properties (`:root`):**
```css
--focus-primary / --focus-secondary   /* Red-orange gradient for focus mode */
--break-primary / --break-secondary   /* Green-teal gradient for break mode */
--bg                                  /* #0f0f1a — deep dark background */
--surface / --surface-hover           /* Semi-transparent card surfaces */
--border                              /* Subtle white border */
--text-primary / --text-muted         /* White + 45% white */
--radius-lg / --radius-md / --radius-sm
--shadow / --transition
```

**Body Class States (drive mode-specific theming):**
| Class | When applied |
|---|---|
| `body.break-mode` | During short break; turns ring, tab, and button green |
| `body.running` | Timer is active; adds pulse animation to ring and time digits |
| `body.warning` | Last 10% of time remaining; ring and digits turn red and flash |

### SVG Progress Ring
- Defined in `index.html` as an inline `<svg>` with `viewBox="0 0 220 220"`
- Track: `<circle class="ring-track">` — static grey arc
- Progress: `<circle class="ring-progress" id="ringProgress">` — animated
- Three `<linearGradient>` definitions: `ringGradient` (red), `breakGradient` (green), `warnGradient` (red-orange)
- A `<filter id="glow">` (Gaussian blur + merge) gives the glowing ring effect
- Progress is driven by `strokeDashoffset`: `offset = CIRCUMFERENCE × (1 − ratio)`

### Audio System
Built entirely on the **Web Audio API** — no audio files needed.

- **Bell sound** (`playBell`): Four sine-wave oscillators at harmonic frequencies
  (520, 1040, 1560, 2600 Hz) with exponential gain decay, repeated 3 times with
  0.7s spacing for a natural ringing effect.
- `playBell()` is called **once when the timer starts** and **once when the timer ends**.
  There is no continuous ticking — the timer is silent between start and finish.
- `AudioContext` is lazily instantiated and reused (singleton pattern) to respect
  browser autoplay policies.
- The old `playTick` / `startTicking` / `stopTicking` functions have been removed.

---

## 🐍 Sub-project 2 — Python CLI Games

### Purpose
Three beginner-friendly text-based games written in Python. They are standalone scripts
intended as learning exercises, each containing an embedded list of suggested
enhancements at the bottom of the file.

### Technology Stack
- **Python 3** — standard library only (`random`, built-in I/O)
- No external dependencies, no `requirements.txt` needed

### Game Files

#### `guess_the_number.py`
- **Entry:** `guess_the_number()` function, called under `if __name__ == "__main__"`
- **Flow:** Player inputs a custom numeric range → game picks a random secret → player
  has 10 attempts → hot/cold feedback → win streak tracked → play-again loop
- **Key features:** `ValueError` catching for non-integer input, win streak counter,
  customisable range per game

#### `hangman.py`
- **Entry:** `hangman()` function
- **Helpers:** `choose_random_word()`, `display_word(word, guessed_letters)`
- **Flow:** Random word chosen from a hardcoded list → player guesses letters one at a
  time → 6 incorrect guesses allowed → masked word displayed each round
- **Word list:** `["python", "hangman", "programming", "challenge", "computer"]`

#### `play_tic_tac_toe.py`
- **Entry:** `play_tic_tac_toe()` function
- **Helpers:** `print_board(board)`, `check_win(board, player)`, `is_full(board)`
- **Flow:** Two-player turn-based game on a 3×3 grid represented as a nested list →
  row/column input → win check (rows, columns, diagonals) → draw check
- **Board:** `[[" ", " ", " "], ...]` — space means empty cell

---

## 🔁 Workflows

### Running the Pomodoro Timer
No build step required. Simply open `index.html` in any modern browser.
```bash
# Option A — direct file open
open index.html

# Option B — local HTTP server (avoids any CORS issues with future assets)
python3 -m http.server 8080
# Then visit http://localhost:8080
```

### Running a Python Game
```bash
python3 guess_the_number.py
python3 hangman.py
python3 play_tic_tac_toe.py
```

---

## 🎨 Coding Conventions

### JavaScript (`app.js`)
- **No framework, no transpiler** — plain ES6+ runs directly in the browser
- **Single state object** pattern — all mutable data in `state = { ... }`; never
  scatter globals
- **DOM refs declared once** at the top, never re-queried inside functions
- **Section banners** — use `// ─── Section Name ───────────────────────────────`
  to delimit logical blocks; match the style already in the file
- **Error handling in audio** — always wrap Web Audio API calls in `try/catch` and fail
  silently (browser policy differences)
- **`localStorage` keys** — use the `pomo_` prefix for all persisted keys
- Prefer `const` / `let`; never use `var`
- No semicolons are **not** the style here — semicolons are used throughout

### CSS (`style.css`)
- Use **CSS custom properties** (`var(--name)`) for every repeated colour, radius, or
  shadow value; never hardcode raw values in component rules
- Follow the **section-per-component** comment banner pattern
- Animations are defined with `@keyframes` at the bottom of their relevant section
- Body-class-driven theming (`body.break-mode`, `body.running`, `body.warning`) instead
  of inline styles or JS-applied colour strings

### Python (game files)
- **PEP 8** style — snake_case for functions and variables
- Each game is a **single self-contained function** — no classes needed at this scope
- `if __name__ == "__main__"` guard on every file
- Enhancement task lists are printed to stdout at the end — **do not remove them**;
  they are part of the educational design

---

## 🚧 Known Issues / Notes for AI Agents

1. **Duplicate `<div class="timer-card">` tag in `index.html`** — there is a duplicate
   opening `<div class="timer-card">` block around lines 37–40. The browser renders
   correctly due to error recovery, but it should be cleaned up.

2. **No `package.json` / build tooling** — the web app has zero dependencies and zero
   build steps. Do not add a bundler unless explicitly asked.

3. **Python games have no unit tests** — each game relies on manual CLI interaction.
   If asked to add tests, use `unittest` from the standard library and mock `input()`
   with `unittest.mock.patch`.

4. **No `long break` mode** — the Pomodoro standard includes a long break after every
   4th session, but this app only implements `focus` and `short break`. Adding it
   requires a new key in `CONFIG`, a new gradient, and logic in `handleTimerEnd`.

5. **Daily stats reset** — `pomo_today` is cleared whenever `new Date().toDateString()`
   differs from `pomo_date` in `localStorage`. This runs at page load only.

6. **Audio requires user gesture** — `AudioContext` will be in `suspended` state until
   the user first clicks a button. The `getAudioCtx()` function handles `.resume()`
   automatically, so ticking only begins after the first Start click.

---

## ✅ Enhancement Roadmap (from README)

### Pomodoro Timer (potential additions)
- [ ] Long break mode (every 4th session)
- [ ] Settings panel (customisable durations)
- [ ] Sound toggle / volume control
- [ ] Browser `Notification` API for background alerts
- [ ] Task history / completed task log
- [ ] Dark/light theme toggle

### Python Games (from embedded challenge lists)
- [ ] **Guess the Number:** Hints, dynamic difficulty, GUI with `tkinter`
- [ ] **Hangman:** ASCII art gallows, larger word list, category selection
- [ ] **Tic-Tac-Toe:** AI opponent (minimax), replay loop, 4×4 variant

---

## 🤖 Instructions for AI Agents

- **Before modifying `app.js`:** Check the section banners and insert new code inside
  the appropriate section. Preserve the `// ─── ... ───` banner style.
- **Before modifying `style.css`:** Check if a CSS variable already exists for the
  colour/value you need before adding raw values.
- **Before adding features to the Pomodoro timer:** Check if the `state` object needs a
  new field and if that field should be persisted to `localStorage`.
- **For Python games:** Keep each game self-contained in its own file. Do not introduce
  imports beyond the Python standard library without explicit request.
- **Do not introduce a build system** (webpack, vite, etc.) unless explicitly requested.
- **The web app runs without a server** — keep it that way unless instructed otherwise.
- **Fix the duplicate `<div class="timer-card">` in `index.html`** if doing any HTML
  edits — it is a pre-existing bug.
