import './style.css'

// Musical Definitions
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ENHARMONIC_MAP = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'C#': 'C#', 'D#': 'D#', 'F#': 'F#', 'G#': 'G#', 'A#': 'A#'
};

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

function scaleNoteKind(noteName) {
  if (noteName.includes('#')) return 'sharp';
  if (noteName.length > 1 && noteName.includes('b')) return 'flat';
  return 'natural';
}

// Audio: offline PCM + WAV <audio> playback so http:// (non-secure) and mobile browsers
// still get sound. Web Audio is often inaudible on iOS for insecure remote origins.
const SAMPLE_RATE = 44100;
const PIANO_PARTIALS = [
  [1, 1],
  [2, 0.41],
  [3, 0.175],
  [4, 0.078],
  [5, 0.036],
  [6, 0.017]
];

function freqFromPitchClass(pc, octaveOffset = 0) {
  const midi = 60 + pc + 12 * octaveOffset;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function envelopePianoMaster(localT, duration, peak, releaseTail) {
  const t1 = 0.016;
  const t2 = Math.max(t1 + 1e-4, duration * 0.25);
  const t3 = duration + releaseTail;
  if (localT < 0) return 0;
  if (localT <= t1) return (localT / t1) * peak;
  if (localT <= t2) {
    const a = Math.max(0.0001, peak * 0.58);
    return peak * Math.pow(a / peak, (localT - t1) / (t2 - t1));
  }
  if (localT <= t3) {
    const a = Math.max(0.0001, peak * 0.58);
    return a * Math.pow(0.001 / a, (localT - t2) / (t3 - t2));
  }
  return 0;
}

function mixPianoNote(f32, startSample, pitchClassIndex, duration, peak, octaveOffset) {
  const releaseTail = 0.34;
  const totalSamples = Math.ceil((duration + releaseTail + 0.06) * SAMPLE_RATE) + 2;
  const freq0 = freqFromPitchClass(pitchClassIndex, octaveOffset);
  const t0sec = startSample / SAMPLE_RATE;

  for (let j = 0; j < totalSamples; j++) {
    const i = startSample + j;
    if (i >= f32.length) break;
    const t = i / SAMPLE_RATE;
    const localT = t - t0sec;
    const g = envelopePianoMaster(localT, duration, peak, releaseTail);
    if (g < 1e-7) continue;
    let s = 0;
    for (const [h, ap] of PIANO_PARTIALS) {
      const detC = h > 1 ? (h % 2 === 0 ? 1 : -1) * 2.8 * (h - 1) : 0;
      const fh = freq0 * h * Math.pow(2, detC / 1200);
      s += ap * Math.sin(2 * Math.PI * fh * t);
    }
    f32[i] += s * g;
  }
}

function normalizeF32(f32) {
  let m = 0;
  for (let i = 0; i < f32.length; i++) m = Math.max(m, Math.abs(f32[i]));
  if (m > 0.99) for (let i = 0; i < f32.length; i++) f32[i] *= 0.99 / m;
}

function buildWavMono16(int16) {
  const n = int16.length;
  const ab = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(ab);
  const w = (o, s) => {
    for (let k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k));
  };
  w(0, 'RIFF');
  dv.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, SAMPLE_RATE, true);
  dv.setUint32(28, SAMPLE_RATE * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  w(36, 'data');
  dv.setUint32(40, n * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    let v = int16[i];
    v = Math.max(-32768, Math.min(32767, v));
    dv.setInt16(o, v, true);
    o += 2;
  }
  return ab;
}

function playWavPcmF32(f32) {
  normalizeF32(f32);
  const n = f32.length;
  const int16 = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32000));
  }
  const ab = buildWavMono16(int16);
  const url = URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
  const a = new Audio();
  a.src = url;
  a.addEventListener(
    'ended',
    () => {
      URL.revokeObjectURL(url);
    },
    { once: true }
  );
  a.play().catch(() => {
    URL.revokeObjectURL(url);
  });
}

function playChillSequence() {
  const freqs = [261.63, 329.63, 392.0, 493.88];
  const step = 0.15;
  const endLast = 3 * step + 1.15;
  const total = Math.ceil(endLast * SAMPLE_RATE) + 8;
  const f32 = new Float32Array(total);
  for (let ni = 0; ni < 4; ni++) {
    const t0s = ni * step;
    for (let i = 0; i < total; i++) {
      const t = i / SAMPLE_RATE;
      const localT = t - t0s;
      if (localT < 0 || localT > 1.15) continue;
      let g;
      if (localT < 0.08) g = (localT / 0.08) * 0.16;
      else g = 0.16 * Math.pow(0.001 / 0.16, (localT - 0.08) / 0.87);
      f32[i] += g * Math.sin(2 * Math.PI * freqs[ni] * t);
    }
  }
  playWavPcmF32(f32);
}

function playQuickTone(pitchClassIndex) {
  const duration = 0.72;
  const peak = 0.42;
  const releaseTail = 0.34;
  const len = Math.ceil((releaseTail + duration + 0.1) * SAMPLE_RATE) + 4;
  const f32 = new Float32Array(len);
  mixPianoNote(f32, 0, pitchClassIndex, duration, peak, 0);
  playWavPcmF32(f32);
}

let scalePlaybackGen = 0;
/** @type {number[]} */
let scaleNoteHighlightTimeouts = [];
/** @type {HTMLAudioElement | null} */
let activeScalePlayer = null;
let activeScaleObjectUrl = null;

const SCALE_STEP_SEC = 0.5;

/** @param {string[]} noteNames */
function ascendingOctaveOffsetsForScale(noteNames) {
  const offsets = new Array(noteNames.length).fill(0);
  let relOct = 0;
  let lastPc = -1;
  for (let k = 0; k < noteNames.length; k++) {
    const pc = CHROMATIC.indexOf(noteNames[k]);
    if (pc < 0) continue;
    if (lastPc >= 0 && pc <= lastPc) relOct += 1;
    offsets[k] = relOct;
    lastPc = pc;
  }
  return offsets;
}

function clearScaleNoteHighlights() {
  scaleNoteHighlightTimeouts.forEach(id => clearTimeout(id));
  scaleNoteHighlightTimeouts = [];
  document.querySelectorAll('.scale-note-playing').forEach(el => {
    el.classList.remove('scale-note-playing');
  });
}

function stopScalePlayback() {
  scalePlaybackGen++;
  clearScaleNoteHighlights();
  if (activeScalePlayer) {
    try {
      activeScalePlayer.pause();
      activeScalePlayer.removeAttribute('src');
    } catch {
      /* ignore */
    }
    activeScalePlayer = null;
  }
  if (activeScaleObjectUrl) {
    try {
      URL.revokeObjectURL(activeScaleObjectUrl);
    } catch {
      /* ignore */
    }
    activeScaleObjectUrl = null;
  }
  updateScalePlaybackUI(null);
}

function updateScalePlaybackUI(activeCard) {
  if (!appRoot) return;
  appRoot.querySelectorAll('.scale-card').forEach(card => {
    const play = card.querySelector('.scale-play-btn');
    const stop = card.querySelector('.scale-stop-btn');
    if (!play || !stop) return;
    if (!activeCard) {
      play.disabled = false;
      stop.disabled = true;
    } else {
      play.disabled = true;
      stop.disabled = card !== activeCard;
    }
  });
}

function startScalePlayback(noteNames, cardEl) {
  stopScalePlayback();
  const myGen = scalePlaybackGen;

  const step = SCALE_STEP_SEC;
  const duration = 0.52;
  const peak = 0.3;
  const releaseTail = 0.34;
  const lastI = Math.max(0, noteNames.length - 1);
  const endSec = lastI * step + duration + releaseTail + 0.08;
  const totalSamples = Math.ceil(endSec * SAMPLE_RATE) + 8;
  const f32 = new Float32Array(totalSamples);
  const octOffsets = ascendingOctaveOffsetsForScale(noteNames);
  for (let i = 0; i < noteNames.length; i++) {
    const pc = CHROMATIC.indexOf(noteNames[i]);
    if (pc < 0) continue;
    const startSamp = Math.floor((i * step) * SAMPLE_RATE);
    mixPianoNote(f32, startSamp, pc, duration, peak, octOffsets[i]);
  }

  normalizeF32(f32);
  const n = f32.length;
  const int16 = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32000));
  }
  const ab = buildWavMono16(int16);
  const url = URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
  const a = new Audio();
  a.src = url;
  activeScaleObjectUrl = url;
  activeScalePlayer = a;
  updateScalePlaybackUI(cardEl);

  const spans = cardEl.querySelectorAll('.scale-note');
  for (let i = 0; i < noteNames.length; i++) {
    const t = window.setTimeout(() => {
      if (myGen !== scalePlaybackGen) return;
      spans.forEach(s => s.classList.remove('scale-note-playing'));
      const el = spans[i];
      if (el) el.classList.add('scale-note-playing');
    }, i * step * 1000);
    scaleNoteHighlightTimeouts.push(t);
  }

  a.addEventListener(
    'ended',
    () => {
      if (activeScaleObjectUrl === url) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
        activeScaleObjectUrl = null;
        activeScalePlayer = null;
        if (scalePlaybackGen === myGen) {
          clearScaleNoteHighlights();
          updateScalePlaybackUI(null);
        }
      }
    },
    { once: true }
  );
  a.play().catch(() => {
    if (activeScaleObjectUrl === url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
      activeScaleObjectUrl = null;
      activeScalePlayer = null;
    }
    clearScaleNoteHighlights();
    updateScalePlaybackUI(null);
  });
}

// Patterns (number of semitones from root)
const SCALES_DATA = [
  { name: 'Major (Jónica)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'Menor Natural (Eólica)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'Menor Armónica', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { name: 'Menor Melódica', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { name: 'Dórica', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'Frigia', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { name: 'Lidia', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { name: 'Mixolidia', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { name: 'Locria', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { name: 'Pentatónica Mayor', intervals: [0, 2, 4, 7, 9] },
  { name: 'Pentatónica Menor', intervals: [0, 3, 5, 7, 10] },
  { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] }
];

// App State
/** @type {'discover' | 'tonality'} */
let appMode = 'discover';
let selectedNotesIndices = new Set();
let lastUniqueProbableKey = false;
let notePreviewEnabled = false;

const THEME_STORAGE_KEY = 'magickey-theme';

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function setTheme(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  syncThemeToggle();
}

function syncThemeToggle() {
  const isLight = getTheme() === 'light';
  if (!themeToggle) return;
  themeToggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', isLight ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
  themeToggle.title = isLight ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';
}

// UI Elements
const themeToggle = document.getElementById('theme-toggle');
const appRoot = document.getElementById('app');
const naturalsRow = document.getElementById('naturals-row');
const sharpsRow = document.getElementById('sharps-row');
const flatsRow = document.getElementById('flats-row');
const grid = document.getElementById('scales-grid');
const matchCount = document.getElementById('match-count');
const resetBtn = document.getElementById('reset-btn');
const keyDetector = document.getElementById('key-detector');
const bestKeyDisplay = document.getElementById('best-key');
const discoverOnlyEls = document.querySelectorAll('.discover-only');
const tonalityPanel = document.getElementById('tonality-panel');
const modeDiscoverBtn = document.getElementById('mode-discover');
const modeTonalityBtn = document.getElementById('mode-tonality');
const notePreviewToggle = document.getElementById('note-preview-toggle');

const NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARPS = ['C#', 'D#', 'F#', 'G#', 'A#'];
const FLATS = ['Db', 'Eb', 'Gb', 'Ab', 'Bb'];

function triggerNotePreview(pitchIndex) {
  if (!notePreviewEnabled) return;
  void playQuickTone(pitchIndex);
}

function handleNoteClick(index, btn) {
  if (appMode === 'tonality') {
    if (selectedNotesIndices.has(index) && selectedNotesIndices.size === 1) {
      selectedNotesIndices.clear();
      btn.classList.remove('active');
    } else {
      selectedNotesIndices.clear();
      document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
      selectedNotesIndices.add(index);
      btn.classList.add('active');
    }
    triggerNotePreview(index);
    refreshUI();
    return;
  }

  if (selectedNotesIndices.has(index)) {
    selectedNotesIndices.delete(index);
    btn.classList.remove('active');
  } else {
    selectedNotesIndices.add(index);
    btn.classList.add('active');
  }
  triggerNotePreview(index);
  updateDiscover();
}

function createNoteBtn(note, list) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'note-btn';
  btn.textContent = note;

  const index = CHROMATIC.indexOf(ENHARMONIC_MAP[note] || note);
  btn.dataset.pitchIndex = String(index);

  btn.onclick = () => handleNoteClick(index, btn);

  list.appendChild(btn);
}

function setAppMode(mode) {
  stopScalePlayback();
  appMode = mode;
  selectedNotesIndices.clear();
  lastUniqueProbableKey = false;
  document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
  appRoot.dataset.mode = mode;

  modeDiscoverBtn.classList.toggle('active', mode === 'discover');
  modeTonalityBtn.classList.toggle('active', mode === 'tonality');
  modeDiscoverBtn.setAttribute('aria-selected', mode === 'discover' ? 'true' : 'false');
  modeTonalityBtn.setAttribute('aria-selected', mode === 'tonality' ? 'true' : 'false');

  discoverOnlyEls.forEach(el => el.classList.toggle('hidden-by-mode', mode === 'tonality'));
  tonalityPanel.classList.toggle('hidden', mode !== 'tonality');

  refreshUI();
}

function refreshUI() {
  if (appMode === 'tonality') {
    renderTonality();
    return;
  }
  updateDiscover();
}

function renderTonality() {
  stopScalePlayback();
  tonalityPanel.innerHTML = '';

  if (selectedNotesIndices.size === 0) {
    tonalityPanel.innerHTML =
      '<div class="empty-state tonality-empty">Toca una nota para ver las notas de su escala mayor</div>';
    return;
  }

  const rootIndex = Array.from(selectedNotesIndices)[0];
  const rootName = CHROMATIC[rootIndex];
  const scaleNotes = MAJOR_INTERVALS.map(i => CHROMATIC[(rootIndex + i) % 12]);

  const card = document.createElement('div');
  card.className = 'scale-card tonality-card';

  const head = document.createElement('div');
  head.className = 'scale-card-head';

  const h3 = document.createElement('h3');
  h3.textContent = `${rootName} mayor (Jónica)`;

  const actions = document.createElement('div');
  actions.className = 'scale-card-actions';

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'scale-play-btn';
  playBtn.textContent = 'Play';
  playBtn.title = 'Tocar escala';

  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.className = 'scale-stop-btn';
  stopBtn.textContent = 'Stop';
  stopBtn.title = 'Detener';
  stopBtn.disabled = true;

  playBtn.addEventListener('click', () => {
    startScalePlayback(scaleNotes, card);
  });
  stopBtn.addEventListener('click', () => {
    stopScalePlayback();
  });

  actions.append(playBtn, stopBtn);
  head.append(h3, actions);

  const notesEl = document.createElement('div');
  notesEl.className = 'scale-notes';
  scaleNotes.forEach(n => {
    const index = CHROMATIC.indexOf(n);
    const isRoot = index === rootIndex;
    const span = document.createElement('span');
    const kind = scaleNoteKind(n);
    span.className = `scale-note scale-note--${kind}${isRoot ? ' highlight' : ''}`;
    span.textContent = n;
    notesEl.appendChild(span);
  });

  card.append(head, notesEl);
  tonalityPanel.appendChild(card);
}

function updateDiscover() {
  if (selectedNotesIndices.size === 0) {
    grid.innerHTML = '<div class="empty-state">Comienza a marcar notas para ver resultados</div>';
    matchCount.textContent = '0 coincidencias';
    keyDetector.classList.add('hidden');
    lastUniqueProbableKey = false;
    stopScalePlayback();
    return;
  }

  const selected = Array.from(selectedNotesIndices);
  const matches = [];

  for (let root = 0; root < 12; root++) {
    for (const scale of SCALES_DATA) {
      const scaleNotesIndices = scale.intervals.map(i => (root + i) % 12);

      const isMatch = selected.every(val => scaleNotesIndices.includes(val));

      if (isMatch) {
        let score = 0;
        if (scale.name.includes('Major')) score += 10;
        if (scale.name.includes('Menor Natural')) score += 10;
        score -= scaleNotesIndices.length;

        matches.push({
          rootName: CHROMATIC[root],
          scaleName: scale.name,
          notes: scaleNotesIndices.map(i => CHROMATIC[i]),
          score: score
        });
      }
    }
  }

  let uniqueProbableKey = false;

  if (matches.length > 0) {
    keyDetector.classList.remove('hidden');
    const sorted = [...matches].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const topScore = best.score;
    const winnersCount = sorted.filter(m => m.score === topScore).length;
    uniqueProbableKey = winnersCount === 1;

    let shortName = best.rootName;
    if (best.scaleName.includes('Menor')) shortName += 'm';

    if (sorted.length > 1 && sorted[1].score === best.score) {
      let secondName = sorted[1].rootName;
      if (sorted[1].scaleName.includes('Menor')) secondName += 'm';
      bestKeyDisplay.textContent = `${shortName} / ${secondName}`;
      bestKeyDisplay.classList.remove('best-key-large');
      bestKeyDisplay.classList.add('best-key-compact');
    } else {
      bestKeyDisplay.textContent = shortName;
      bestKeyDisplay.classList.add('best-key-large');
      bestKeyDisplay.classList.remove('best-key-compact');
    }

    if (uniqueProbableKey && !lastUniqueProbableKey) {
      void playChillSequence();
    }
    lastUniqueProbableKey = uniqueProbableKey;
  } else {
    keyDetector.classList.add('hidden');
    lastUniqueProbableKey = false;
  }

  stopScalePlayback();
  renderResults(matches);
}

function renderResults(matches) {
  grid.innerHTML = '';
  matchCount.textContent = `${matches.length} coincidencias`;

  if (matches.length === 0) {
    grid.innerHTML = '<div class="empty-state">No se encontraron escalas con estas notas</div>';
    return;
  }

  const sortedDisplay = [...matches].sort((a, b) => {
    if (a.scaleName.includes('Major')) return -1;
    return 0;
  });

  sortedDisplay.forEach(match => {
    const card = document.createElement('div');
    card.className = 'scale-card';

    const head = document.createElement('div');
    head.className = 'scale-card-head';

    const h3 = document.createElement('h3');
    h3.textContent = `${match.rootName} ${match.scaleName}`;

    const actions = document.createElement('div');
    actions.className = 'scale-card-actions';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'scale-play-btn';
    playBtn.textContent = 'Play';
    playBtn.title = 'Tocar escala';

    const stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'scale-stop-btn';
    stopBtn.textContent = 'Stop';
    stopBtn.title = 'Detener';
    stopBtn.disabled = true;

    playBtn.addEventListener('click', () => {
      startScalePlayback(match.notes, card);
    });
    stopBtn.addEventListener('click', () => {
      stopScalePlayback();
    });

    actions.append(playBtn, stopBtn);
    head.append(h3, actions);

    const notesEl = document.createElement('div');
    notesEl.className = 'scale-notes';
    match.notes.forEach(n => {
      const index = CHROMATIC.indexOf(n);
      const isSelected = selectedNotesIndices.has(index);
      const kind = scaleNoteKind(n);
      const span = document.createElement('span');
      span.className = `scale-note scale-note--${kind}${isSelected ? ' highlight' : ''}`;
      span.textContent = n;
      notesEl.appendChild(span);
    });

    card.append(head, notesEl);
    grid.appendChild(card);
  });
}

function init() {
  NATURALS.forEach(n => createNoteBtn(n, naturalsRow));
  SHARPS.forEach(n => createNoteBtn(n, sharpsRow));
  FLATS.forEach(n => createNoteBtn(n, flatsRow));

  modeDiscoverBtn.onclick = () => setAppMode('discover');
  modeTonalityBtn.onclick = () => setAppMode('tonality');

  function syncNotePreviewButton() {
    if (!notePreviewToggle) return;
    notePreviewToggle.classList.toggle('active', notePreviewEnabled);
    notePreviewToggle.setAttribute('aria-pressed', notePreviewEnabled ? 'true' : 'false');
    if (notePreviewEnabled) {
      notePreviewToggle.title = 'Desactivar sonido al tocar notas';
      notePreviewToggle.setAttribute('aria-label', 'Desactivar sonido al tocar notas. Sonido activado.');
    } else {
      notePreviewToggle.title = 'Activar sonido al tocar notas';
      notePreviewToggle.setAttribute('aria-label', 'Activar sonido al tocar notas. Sonido desactivado.');
    }
  }

  notePreviewToggle.onclick = () => {
    notePreviewEnabled = !notePreviewEnabled;
    syncNotePreviewButton();
  };
  syncNotePreviewButton();

  resetBtn.onclick = () => {
    stopScalePlayback();
    selectedNotesIndices.clear();
    document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
    lastUniqueProbableKey = false;
    refreshUI();
  };

  appRoot.dataset.mode = appMode;

  if (themeToggle) {
    themeToggle.onclick = () => setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }
  syncThemeToggle();
}

init();
refreshUI();
