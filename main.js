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

/** C=0 … B=6 for diatonic distance (scientific pitch / letter names). */
const DIATONIC_LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

const STAFF_REF_DIATONIC = 4 * 7 + DIATONIC_LETTER_INDEX.E;

/** @param {string} noteName e.g. C#, Bb */
function noteLetter(noteName) {
  return noteName[0];
}

/** @param {string} letter @param {number} octave */
function diatonicIndex(letter, octave) {
  const k = DIATONIC_LETTER_INDEX[letter];
  if (k === undefined) return STAFF_REF_DIATONIC;
  return octave * 7 + k;
}

const LETTER_TO_NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const KEY_SIG_SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const KEY_SIG_FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** Treble clef — vertical placement for key signature accidentals (letter + octave). */
const TREBLE_KEY_SIG_SHARP_POS = [
  { letter: 'F', octave: 5 },
  { letter: 'C', octave: 5 },
  { letter: 'G', octave: 5 },
  { letter: 'D', octave: 5 },
  { letter: 'A', octave: 4 },
  { letter: 'E', octave: 5 },
  { letter: 'B', octave: 4 }
];
const TREBLE_KEY_SIG_FLAT_POS = [
  { letter: 'B', octave: 4 },
  { letter: 'E', octave: 5 },
  { letter: 'A', octave: 4 },
  { letter: 'D', octave: 5 },
  { letter: 'G', octave: 4 },
  { letter: 'C', octave: 5 },
  { letter: 'F', octave: 4 }
];

/** @param {number} pc pitch class 0–11 @returns {{ type: 'sharp' | 'flat', count: number }} */
function keySignatureForMajorRoot(pc) {
  const sharpRoots = [0, 7, 2, 9, 4, 11, 6, 1];
  const si = sharpRoots.indexOf(pc);
  if (si >= 0) return { type: 'sharp', count: si };

  const flatRoots = [5, 10, 3, 8];
  const fi = flatRoots.indexOf(pc);
  if (fi >= 0) return { type: 'flat', count: fi + 1 };

  return { type: 'sharp', count: 0 };
}

/** Parent major root (pitch class) used for key signature, from scale tonic and name. */
function parentMajorPcForKeySignature(rootPc, scaleName) {
  if (!scaleName || scaleName.includes('Blues')) return null;

  if (
    scaleName.includes('Major') ||
    scaleName.includes('Jónica') ||
    scaleName.includes('mayor') ||
    scaleName.includes('Pentatónica Mayor')
  ) {
    return rootPc;
  }
  if (scaleName.includes('Menor Natural') || scaleName.includes('Eólica') || scaleName.includes('Pentatónica Menor')) {
    return (rootPc + 3) % 12;
  }
  if (scaleName.includes('Menor Armónica') || scaleName.includes('Menor Melódica')) {
    return (rootPc + 3) % 12;
  }
  if (scaleName.includes('Dórica')) return (rootPc + 10) % 12;
  if (scaleName.includes('Frigia')) return (rootPc + 8) % 12;
  if (scaleName.includes('Lidia')) return (rootPc + 7) % 12;
  if (scaleName.includes('Mixolidia')) return (rootPc + 5) % 12;
  if (scaleName.includes('Locria')) return (rootPc + 1) % 12;

  return rootPc;
}

/** @param {string} tonicLetter one of C…B */
function sevenLettersFromTonic(tonicLetter) {
  const order = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const i = order.indexOf(tonicLetter);
  const start = i >= 0 ? i : 0;
  return Array.from({ length: 7 }, (_, k) => order[(start + k) % 7]);
}

/** Letter index offsets from tonic for each note in the scale (by scale type). */
function scaleLetterOffsets(scaleName, noteCount) {
  if (!scaleName || noteCount === 7) return [0, 1, 2, 3, 4, 5, 6];
  if (scaleName.includes('Pentatónica Mayor')) return [0, 1, 2, 4, 5];
  if (scaleName.includes('Pentatónica Menor')) return [0, 2, 3, 4, 6];
  return [0, 1, 2, 3, 4, 5, 6].slice(0, noteCount);
}

/** @returns {-2|-1|0|1|2} alteration vs natural letter to reach pitch class */
function alterStepsForLetterToPc(letter, targetPc) {
  const nat = LETTER_TO_NATURAL_PC[letter];
  if (nat === undefined) return 0;
  for (const a of [0, 1, -1, 2, -2]) {
    const pc = ((((nat + a) % 12) + 12) % 12);
    if (pc === targetPc) return /** @type {-2|-1|0|1|2} */ (a);
  }
  return 0;
}

/** @param {'sharp'|'flat'} type @param {number} count */
function keySigLetterAlterMap(type, count) {
  /** @type {Record<string, 1 | -1>} */
  const m = Object.create(null);
  if (count <= 0) return m;
  if (type === 'sharp') {
    for (let i = 0; i < count; i++) m[KEY_SIG_SHARP_ORDER[i]] = 1;
  } else {
    for (let i = 0; i < count; i++) m[KEY_SIG_FLAT_ORDER[i]] = -1;
  }
  return m;
}

function keySigImpliedAlter(letter, map) {
  if (!map || !letter) return 0;
  return map[letter] ?? 0;
}

/**
 * @param {string} letter
 * @param {number} targetPc
 * @param {Record<string, 1 | -1>} map
 * @returns {{ show: boolean, symbol: string | null }}
 */
function accidentalPrintPlan(letter, targetPc, map) {
  const need = alterStepsForLetterToPc(letter, targetPc);
  const implied = keySigImpliedAlter(letter, map);
  if (need === implied) return { show: false, symbol: null };
  if (need === 1) return { show: true, symbol: '\u266F' };
  if (need === -1) return { show: true, symbol: '\u266D' };
  if (need === 0 && implied !== 0) return { show: true, symbol: '\u266E' };
  if (need === 2) return { show: true, symbol: '\u266F' };
  if (need === -2) return { show: true, symbol: '\u266D' };
  return { show: false, symbol: null };
}

/** @typedef {{ rootPc: number, scaleName: string }} StaffMeta */

/** @param {string[]} noteNames @param {StaffMeta | undefined} staffMeta */
function buildStaffSVG(noteNames, staffMeta) {
  const oct = ascendingOctaveOffsetsForScale(noteNames);
  const LINE_GAP = 12;
  const TOP_LINE_Y = 36;
  const BOTTOM_LINE_Y = TOP_LINE_Y + 4 * LINE_GAP;
  const Y_E4 = BOTTOM_LINE_Y;
  const HALF = LINE_GAP / 2;
  const MIDDLE_LINE_Y = Y_E4 - 4 * HALF;
  const NOTE_DX = 44;
  const CLEF_X = 10;
  const KEY_SIG_X0 = 46;
  const KEY_ACC_DX = 12;
  const BASE_LEFT_AFTER_CLEF = 72;

  const parentMaj = staffMeta ? parentMajorPcForKeySignature(staffMeta.rootPc, staffMeta.scaleName) : null;
  const keySig =
    parentMaj !== null ? keySignatureForMajorRoot(parentMaj) : { type: /** @type {'sharp'} */ ('sharp'), count: 0 };
  const letterAlterMap =
    staffMeta && parentMaj !== null && keySig.count > 0
      ? keySigLetterAlterMap(keySig.type, keySig.count)
      : staffMeta && parentMaj !== null
        ? {}
        : null;

  const useKeySigLayout = Boolean(staffMeta && parentMaj !== null);
  const keyAccCount = useKeySigLayout ? keySig.count : 0;
  const keySigWidth = keyAccCount > 0 ? 8 + keyAccCount * KEY_ACC_DX : 0;
  const LEFT_MARGIN = BASE_LEFT_AFTER_CLEF + keySigWidth;
  const n = noteNames.length;
  const width = LEFT_MARGIN + Math.max(1, n) * NOTE_DX + 48;
  const height = 130;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('class', 'staff-sheet-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Pentagrama en clave de sol');

  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS(ns, 'line');
    const y = TOP_LINE_Y + i * LINE_GAP;
    line.setAttribute('x1', '0');
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(width));
    line.setAttribute('y2', String(y));
    line.setAttribute('class', 'staff-sheet-staff-line');
    svg.appendChild(line);
  }

  const clef = document.createElementNS(ns, 'text');
  clef.setAttribute('x', String(CLEF_X));
  clef.setAttribute('y', String(Y_E4 + 6));
  clef.setAttribute('class', 'staff-sheet-clef');
  clef.textContent = '\u{1D11E}';
  svg.appendChild(clef);

  if (useKeySigLayout && keySig.count > 0) {
    const positions = keySig.type === 'sharp' ? TREBLE_KEY_SIG_SHARP_POS : TREBLE_KEY_SIG_FLAT_POS;
    const sym = keySig.type === 'sharp' ? '\u266F' : '\u266D';
    for (let k = 0; k < keySig.count; k++) {
      const { letter, octave } = positions[k];
      const steps = diatonicIndex(letter, octave) - STAFF_REF_DIATONIC;
      const ky = Y_E4 - steps * HALF;
      const kx = KEY_SIG_X0 + k * KEY_ACC_DX;
      const acc = document.createElementNS(ns, 'text');
      acc.setAttribute('x', String(kx));
      acc.setAttribute('y', String(ky + 5));
      acc.setAttribute('class', 'staff-sheet-accidental staff-sheet-key-sig-acc');
      acc.textContent = sym;
      svg.appendChild(acc);
    }
  }

  const tonicLetter = staffMeta ? noteLetter(CHROMATIC[staffMeta.rootPc]) : 'C';
  const letters7 = sevenLettersFromTonic(tonicLetter);
  const offsets = staffMeta ? scaleLetterOffsets(staffMeta.scaleName, n) : null;

  for (let i = 0; i < n; i++) {
    const name = noteNames[i];
    const pc = CHROMATIC.indexOf(name);
    if (pc < 0) continue;
    const midi = 60 + pc + 12 * oct[i];
    const octave = Math.floor(midi / 12) - 1;

    let letter;
    if (useKeySigLayout && offsets && offsets[i] !== undefined) {
      letter = letters7[offsets[i]];
    } else {
      letter = noteLetter(name);
    }

    const steps = diatonicIndex(letter, octave) - STAFF_REF_DIATONIC;
    const ny = Y_E4 - steps * HALF;
    const nx = LEFT_MARGIN + i * NOTE_DX;

    if (ny < TOP_LINE_Y - 0.5 || ny > BOTTOM_LINE_Y + 0.5) {
      const ledger = document.createElementNS(ns, 'line');
      ledger.setAttribute('x1', String(nx - 20));
      ledger.setAttribute('y1', String(ny));
      ledger.setAttribute('x2', String(nx + 20));
      ledger.setAttribute('y2', String(ny));
      ledger.setAttribute('class', 'staff-sheet-ledger');
      svg.appendChild(ledger);
    }

    if (useKeySigLayout && letterAlterMap) {
      const plan = accidentalPrintPlan(letter, pc, letterAlterMap);
      if (plan.show && plan.symbol) {
        const acc = document.createElementNS(ns, 'text');
        acc.setAttribute('x', String(nx - 26));
        acc.setAttribute('y', String(ny + 5));
        acc.setAttribute('class', 'staff-sheet-accidental');
        acc.textContent = plan.symbol;
        svg.appendChild(acc);
      }
    } else {
      if (name.includes('#')) {
        const acc = document.createElementNS(ns, 'text');
        acc.setAttribute('x', String(nx - 26));
        acc.setAttribute('y', String(ny + 5));
        acc.setAttribute('class', 'staff-sheet-accidental');
        acc.textContent = '\u266F';
        svg.appendChild(acc);
      } else if (name.length > 1 && name.includes('b')) {
        const acc = document.createElementNS(ns, 'text');
        acc.setAttribute('x', String(nx - 26));
        acc.setAttribute('y', String(ny + 5));
        acc.setAttribute('class', 'staff-sheet-accidental');
        acc.textContent = '\u266D';
        svg.appendChild(acc);
      }
    }

    const head = document.createElementNS(ns, 'ellipse');
    head.setAttribute('cx', String(nx));
    head.setAttribute('cy', String(ny));
    head.setAttribute('rx', '9');
    head.setAttribute('ry', '6.5');
    head.setAttribute('transform', `rotate(-22 ${nx} ${ny})`);
    head.setAttribute('class', 'staff-sheet-note-head');
    svg.appendChild(head);

    const stemUp = ny > MIDDLE_LINE_Y;
    const stem = document.createElementNS(ns, 'line');
    if (stemUp) {
      stem.setAttribute('x1', String(nx + 7));
      stem.setAttribute('y1', String(ny - 1));
      stem.setAttribute('x2', String(nx + 7));
      stem.setAttribute('y2', String(ny - 42));
    } else {
      stem.setAttribute('x1', String(nx - 7));
      stem.setAttribute('y1', String(ny + 1));
      stem.setAttribute('x2', String(nx - 7));
      stem.setAttribute('y2', String(ny + 42));
    }
    stem.setAttribute('class', 'staff-sheet-stem');
    svg.appendChild(stem);
  }

  return svg;
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
const staffSheetDialog = document.getElementById('staff-sheet-dialog');
const staffSheetTitle = document.getElementById('staff-sheet-dialog-title');
const staffSheetCloseBtn = document.getElementById('staff-sheet-dialog-close');
const staffSvgMount = document.getElementById('staff-sheet-svg-mount');

/** @type {Element | null} */
let staffSheetDialogPrevFocus = null;

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

function closeStaffSheetModal() {
  if (!staffSheetDialog?.open) return;
  staffSheetDialog.close();
}

/** @param {string} titleText @param {string[]} noteNames @param {StaffMeta | undefined} staffMeta */
function openStaffSheetModal(titleText, noteNames, staffMeta) {
  if (!staffSheetDialog || !staffSheetTitle || !staffSvgMount) return;
  const wasOpen = staffSheetDialog.open;
  if (!wasOpen) staffSheetDialogPrevFocus = document.activeElement;
  staffSheetTitle.textContent = titleText;
  staffSvgMount.replaceChildren(buildStaffSVG(noteNames, staffMeta));
  if (!wasOpen) staffSheetDialog.showModal();
  staffSheetCloseBtn?.focus();
}

/** @param {HTMLHeadingElement} h3 @param {string} titleText @param {string[]} noteNames @param {StaffMeta | undefined} staffMeta */
function wireScaleTitleOpener(h3, titleText, noteNames, staffMeta) {
  h3.classList.add('scale-card-title-btn');
  h3.setAttribute('role', 'button');
  h3.setAttribute('tabindex', '0');
  h3.title = 'Ver partitura';
  h3.addEventListener('click', e => {
    e.preventDefault();
    openStaffSheetModal(titleText, noteNames, staffMeta);
  });
  h3.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openStaffSheetModal(titleText, noteNames, staffMeta);
    }
  });
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
  closeStaffSheetModal();
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
  const tonalityTitle = `${rootName} mayor (Jónica)`;
  h3.textContent = tonalityTitle;
  wireScaleTitleOpener(h3, tonalityTitle, scaleNotes, {
    rootPc: rootIndex,
    scaleName: 'Major (Jónica)'
  });

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
    const cardTitle = `${match.rootName} ${match.scaleName}`;
    h3.textContent = cardTitle;
    wireScaleTitleOpener(h3, cardTitle, match.notes, {
      rootPc: CHROMATIC.indexOf(match.rootName),
      scaleName: match.scaleName
    });

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
    closeStaffSheetModal();
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

  if (staffSheetDialog && staffSheetCloseBtn) {
    staffSheetCloseBtn.addEventListener('click', () => closeStaffSheetModal());
    staffSheetDialog.addEventListener('click', e => {
      if (e.target === staffSheetDialog) closeStaffSheetModal();
    });
    staffSheetDialog.addEventListener('close', () => {
      if (staffSheetDialogPrevFocus instanceof HTMLElement) {
        try {
          staffSheetDialogPrevFocus.focus();
        } catch {
          /* ignore */
        }
      }
      staffSheetDialogPrevFocus = null;
    });
  }
}

init();
refreshUI();
