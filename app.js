// ─── Config ────────────────────────────────────────────────────
const CONFIG = {
  focus: { duration: 25 * 60, label: "Focus Time",  tab: "Focus" },
  break: { duration:  5 * 60, label: "Break Time",  tab: "Short Break" },
};

const settings = {
  autoStartBreak: localStorage.getItem("pomo_autoStartBreak") === "true",
  autoStartFocus: localStorage.getItem("pomo_autoStartFocus") === "true",
};

const SESSIONS_PER_CYCLE = 4;
const CIRCUMFERENCE      = 2 * Math.PI * 96; // r=96 → ≈ 603.19

// ─── State ─────────────────────────────────────────────────────
let state = {
  mode:         "focus",
  running:      false,
  timeLeft:     CONFIG.focus.duration,
  totalSeconds: CONFIG.focus.duration,
  timerId:      null,
  sessionsDone: 0,
  todayCount:   Number(localStorage.getItem("pomo_today") || 0),
  totalCount:   Number(localStorage.getItem("pomo_total") || 0),
  focusMins:    Number(localStorage.getItem("pomo_focus") || 0),
  lastDate:     localStorage.getItem("pomo_date") || "",
};

const today = new Date().toDateString();
if (state.lastDate !== today) {
  state.todayCount = 0;
  localStorage.setItem("pomo_today", 0);
  localStorage.setItem("pomo_date", today);
}

// ─── DOM refs ───────────────────────────────────────────────────
const timeDisplay       = document.getElementById("timeDisplay");
const modeLabel         = document.getElementById("modeLabel");
const ringProgress      = document.getElementById("ringProgress");
const startStopBtn      = document.getElementById("startStopBtn");
const btnIcon           = document.getElementById("btnIcon");
const btnText           = document.getElementById("btnText");
const resetBtn          = document.getElementById("resetBtn");
const skipBtn           = document.getElementById("skipBtn");
const tabs              = document.querySelectorAll(".tab");
const sessionDots       = document.getElementById("sessionDots");
const sessionCycleText  = document.getElementById("sessionCycleText");
const todayCount        = document.getElementById("todayCount");
const totalCount        = document.getElementById("totalCount");
const focusTime         = document.getElementById("focusTime");
const todayCountBar     = document.getElementById("todayCountBar");
const totalCountBar     = document.getElementById("totalCountBar");
const focusTimeBar      = document.getElementById("focusTimeBar");
const toast             = document.getElementById("toast");
const toastMsg          = document.getElementById("toastMsg");
const toastIcon         = document.getElementById("toastIcon");
const taskInput         = document.getElementById("taskInput");
const currentTaskChip   = document.getElementById("currentTaskChip");
const settingsBtn       = document.getElementById("settingsBtn");
const settingsPanel     = document.getElementById("settingsPanel");
const settingsClose     = document.getElementById("settingsClose");
const autoStartBreakChk = document.getElementById("autoStartBreak");
const autoStartFocusChk = document.getElementById("autoStartFocus");

// ─── Ring helpers ───────────────────────────────────────────────
function setRingProgress(ratio) {
  ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - ratio);
}

function formatTime(s) {
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function formatFocus(mins) {
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

// ─── Task chip sync ─────────────────────────────────────────────
function syncTaskChip() {
  const val = taskInput.value.trim();
  if (val) {
    currentTaskChip.textContent = "🏍️  " + val;
    currentTaskChip.classList.add("has-task");
  } else {
    currentTaskChip.textContent = "No mission set — add one in the sidebar";
    currentTaskChip.classList.remove("has-task");
  }
}

taskInput.addEventListener("input", syncTaskChip);

// ─── Display ────────────────────────────────────────────────────
function updateDisplay() {
  timeDisplay.textContent = formatTime(state.timeLeft);
  document.title = `${formatTime(state.timeLeft)} — Moto Focus`;
  const ratio = state.timeLeft / state.totalSeconds;
  setRingProgress(ratio);
  document.body.classList.toggle("warning", state.running && ratio <= 0.1);
}

function renderStats() {
  const focusStr = formatFocus(state.focusMins);
  if (todayCount)    todayCount.textContent    = state.todayCount;
  if (totalCount)    totalCount.textContent    = state.totalCount;
  if (focusTime)     focusTime.textContent     = focusStr;
  if (todayCountBar) todayCountBar.textContent = state.todayCount;
  if (totalCountBar) totalCountBar.textContent = state.totalCount;
  if (focusTimeBar)  focusTimeBar.textContent  = focusStr;
}

function renderSessionDots() {
  sessionDots.innerHTML = "";
  const filled = state.sessionsDone % SESSIONS_PER_CYCLE;
  const allFull = state.sessionsDone > 0 && filled === 0;
  for (let i = 0; i < SESSIONS_PER_CYCLE; i++) {
    const dot = document.createElement("span");
    dot.className = "dot" + (allFull || i < filled ? " filled" : "");
    sessionDots.appendChild(dot);
  }
  if (sessionCycleText) {
    sessionCycleText.textContent = `${allFull ? SESSIONS_PER_CYCLE : filled} / ${SESSIONS_PER_CYCLE}`;
  }
}

// ─── Mode switching ─────────────────────────────────────────────
function setMode(mode, autoStart = false) {
  stopTimer();
  state.mode         = mode;
  state.timeLeft     = CONFIG[mode].duration;
  state.totalSeconds = CONFIG[mode].duration;
  document.body.classList.toggle("break-mode", mode === "break");
  document.body.classList.remove("running", "warning");
  modeLabel.textContent = CONFIG[mode].label;
  tabs.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
  setBtnState(false);
  updateDisplay();
  if (autoStart) startTimer();
}

// ─── Timer logic ────────────────────────────────────────────────
function startTimer() {
  if (state.running) return;
  state.running = true;
  document.body.classList.add("running");
  setBtnState(true);
  playBell();
  state.timerId = setInterval(() => {
    state.timeLeft--;
    if (state.mode === "focus" && state.timeLeft % 60 === 0 && state.timeLeft > 0) {
      state.focusMins++;
      localStorage.setItem("pomo_focus", state.focusMins);
      renderStats();
    }
    updateDisplay();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      state.running = false;
      handleTimerEnd();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  state.running = false;
  document.body.classList.remove("running");
}

function handleTimerEnd() {
  playBell();
  if (state.mode === "focus") {
    state.sessionsDone++;
    state.todayCount++;
    state.totalCount++;
    state.focusMins++;
    localStorage.setItem("pomo_today", state.todayCount);
    localStorage.setItem("pomo_total", state.totalCount);
    localStorage.setItem("pomo_focus", state.focusMins);
    localStorage.setItem("pomo_date",  today);
    renderStats();
    renderSessionDots();
    showToast("🍅", "Focus session done! Time for a pit stop.");
    setTimeout(() => setMode("break", settings.autoStartBreak), 1500);
  } else {
    showToast("💪", "Break over! Ready to ride again?");
    setTimeout(() => setMode("focus", settings.autoStartFocus), 1500);
  }
}

// ─── Button state ───────────────────────────────────────────────
function setBtnState(running) {
  const isFocus = state.mode === "focus";
  btnText.textContent = running
    ? (isFocus ? "Pause Ride"  : "Pause Break")
    : (isFocus ? "Start Ride"  : "Start Break");
  btnIcon.innerHTML = running
    ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
}

// ─── Toast ───────────────────────────────────────────────────────
let toastTimer;
function showToast(icon, msg) {
  toastIcon.textContent = icon;
  toastMsg.textContent  = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

// ─── Audio ──────────────────────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx || audioCtx.state === "closed") audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function playBell() {
  try {
    const ctx = getAudioCtx();
    [[520,0.5,2.5],[1040,0.3,1.8],[1560,0.15,1.2],[2600,0.08,0.8]].forEach(([freq,gain,decay]) => {
      [0, 0.7, 1.4].forEach(delay => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = freq;
        const t = ctx.currentTime + delay;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + decay);
        osc.start(t); osc.stop(t + decay + 0.1);
      });
    });
  } catch(e) {}
}

// ─── Event listeners ────────────────────────────────────────────
startStopBtn.addEventListener("click", () => {
  if (state.running) { stopTimer(); setBtnState(false); }
  else { startTimer(); }
});

resetBtn.addEventListener("click", () => {
  stopTimer();
  state.timeLeft     = CONFIG[state.mode].duration;
  state.totalSeconds = CONFIG[state.mode].duration;
  setBtnState(false);
  updateDisplay();
});

skipBtn.addEventListener("click", () => {
  stopTimer();
  setMode(state.mode === "focus" ? "break" : "focus", false);
});

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    if (tab.dataset.mode !== state.mode) setMode(tab.dataset.mode, false);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.target === taskInput) return;
  if (e.code === "Space")   { e.preventDefault(); startStopBtn.click(); }
  else if (e.code === "KeyR") resetBtn.click();
  else if (e.code === "KeyS") skipBtn.click();
});

settingsBtn.addEventListener("click", (e) => { e.stopPropagation(); settingsPanel.classList.toggle("open"); });
settingsClose.addEventListener("click", () => settingsPanel.classList.remove("open"));
document.addEventListener("click", (e) => {
  if (!settingsPanel.contains(e.target) && e.target !== settingsBtn)
    settingsPanel.classList.remove("open");
});

autoStartBreakChk.addEventListener("change", () => {
  settings.autoStartBreak = autoStartBreakChk.checked;
  localStorage.setItem("pomo_autoStartBreak", settings.autoStartBreak);
});
autoStartFocusChk.addEventListener("change", () => {
  settings.autoStartFocus = autoStartFocusChk.checked;
  localStorage.setItem("pomo_autoStartFocus", settings.autoStartFocus);
});

// ─── Init ────────────────────────────────────────────────────────
ringProgress.style.strokeDasharray  = CIRCUMFERENCE;
ringProgress.style.strokeDashoffset = 0;
autoStartBreakChk.checked = settings.autoStartBreak;
autoStartFocusChk.checked = settings.autoStartFocus;
updateDisplay();
renderStats();
renderSessionDots();
syncTaskChip();
