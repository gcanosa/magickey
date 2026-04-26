import './style.css'

// Musical Definitions
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ENHARMONIC_MAP = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'C#': 'C#', 'D#': 'D#', 'F#': 'F#', 'G#': 'G#', 'A#': 'A#'
};

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Audio — shared context; resume() must complete before scheduling or first output is silent
let audioCtx = null;

function freqFromPitchClass(pc, octaveOffset = 0) {
  const midi = 60 + pc + 12 * octaveOffset;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

async function ensureAudioReady() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Piano-like tone: harmonic sines + lowpass; longer decay so pitch is easy to hear.
 * @returns {AudioNode[]} all nodes (for stop/disconnect)
 */
function schedulePianoLikeNote(ctx, dest, pitchClassIndex, when, options = {}) {
  const duration = options.duration ?? 0.62;
  const peak = options.peak ?? 0.36;
  const octaveOffset = options.octaveOffset ?? 0;

  const freq = freqFromPitchClass(pitchClassIndex, octaveOffset);
  const releaseTail = 0.34;
  const tEnd = when + duration;
  const stopAt = tEnd + releaseTail + 0.05;

  const master = ctx.createGain();
  master.connect(dest);
  master.gain.setValueAtTime(0, when);
  master.gain.linearRampToValueAtTime(peak, when + 0.016);
  master.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.58), when + duration * 0.25);
  master.gain.exponentialRampToValueAtTime(0.001, tEnd + releaseTail);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(9000, Math.max(700, freq * 11)), when);
  filter.frequency.exponentialRampToValueAtTime(Math.min(2600, Math.max(350, freq * 3.2)), when + duration * 0.38);
  filter.Q.setValueAtTime(0.62, when);
  filter.connect(master);

  const partials = [
    [1, 1],
    [2, 0.41],
    [3, 0.175],
    [4, 0.078],
    [5, 0.036],
    [6, 0.017]
  ];

  const nodes = [master, filter];

  partials.forEach(([h, amp]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * h, when);
    if (h > 1) osc.detune.setValueAtTime((h % 2 === 0 ? 2.8 : -2.8) * (h - 1), when);

    const g = ctx.createGain();
    g.gain.setValueAtTime(amp, when);

    osc.connect(g);
    g.connect(filter);
    osc.start(when);
    osc.stop(stopAt);
    nodes.push(osc, g);
  });

  return nodes;
}

function disconnectAudioNodes(nodes) {
  nodes.forEach(n => {
    try {
      if (n instanceof OscillatorNode) n.stop(0);
      n.disconnect();
    } catch {
      /* ignore */
    }
  });
}

async function playChillSequence() {
  const ctx = await ensureAudioReady();
  const now = ctx.currentTime + 0.02;
  const notes = [261.63, 329.63, 392.0, 493.88];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.15);

    const t = now + i * 0.15;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 1.15);
  });
}

async function playQuickTone(pitchClassIndex) {
  const ctx = await ensureAudioReady();
  const when = ctx.currentTime;
  schedulePianoLikeNote(ctx, ctx.destination, pitchClassIndex, when, {
    duration: 0.72,
    peak: 0.42
  });
}

let scalePlaybackGen = 0;
const scalePlaybackTimers = [];
const scalePlaybackNodes = [];

function stopScalePlayback() {
  scalePlaybackGen++;
  scalePlaybackTimers.splice(0).forEach(clearTimeout);
  disconnectAudioNodes(scalePlaybackNodes);
  scalePlaybackNodes.length = 0;
  updateScalePlaybackUI(null);
}

function updateScalePlaybackUI(activeCard) {
  if (!grid) return;
  grid.querySelectorAll('.scale-card').forEach(card => {
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

async function startScalePlayback(noteNames, cardEl) {
  stopScalePlayback();
  const myGen = scalePlaybackGen;
  const ctx = await ensureAudioReady();
  if (myGen !== scalePlaybackGen) return;

  updateScalePlaybackUI(cardEl);

  const step = 0.5;
  const now = ctx.currentTime + 0.04;

  noteNames.forEach((name, i) => {
    const pc = CHROMATIC.indexOf(name);
    if (pc < 0) return;
    const t0 = now + i * step;
    const nodes = schedulePianoLikeNote(ctx, ctx.destination, pc, t0, {
      duration: 0.52,
      peak: 0.3
    });
    scalePlaybackNodes.push(...nodes);
  });

  const lastStart = now + Math.max(0, noteNames.length - 1) * step;
  const totalMs = (lastStart - now + 0.52 + 0.36 + 0.08) * 1000;
  const t = setTimeout(() => {
    if (myGen === scalePlaybackGen) {
      scalePlaybackNodes.length = 0;
      updateScalePlaybackUI(null);
    }
  }, totalMs);
  scalePlaybackTimers.push(t);
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

// UI Elements
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
  card.innerHTML = `
    <h3>${rootName} mayor (Jónica)</h3>
    <div class="scale-notes">
      ${scaleNotes.map(n => {
        const idx = CHROMATIC.indexOf(n);
        const isRoot = idx === rootIndex;
        return `<span class="scale-note ${isRoot ? 'highlight' : ''}">${n}</span>`;
      }).join('')}
    </div>
  `;
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
      void startScalePlayback(match.notes, card);
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
      const span = document.createElement('span');
      span.className = `scale-note${isSelected ? ' highlight' : ''}`;
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

  notePreviewToggle.onclick = () => {
    notePreviewEnabled = !notePreviewEnabled;
    notePreviewToggle.classList.toggle('active', notePreviewEnabled);
    notePreviewToggle.setAttribute('aria-pressed', notePreviewEnabled ? 'true' : 'false');
    if (notePreviewEnabled) void ensureAudioReady();
  };

  resetBtn.onclick = () => {
    stopScalePlayback();
    selectedNotesIndices.clear();
    document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
    lastUniqueProbableKey = false;
    refreshUI();
  };

  appRoot.dataset.mode = appMode;
}

init();
refreshUI();
