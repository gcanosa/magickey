# Magic Key

**Magic Key** is a browser-based **musical scale discoverer** and **key reference** tool. It helps you turn a set of notes into concrete scale names, hear them, and read them on a treble staff with a sensible key signature and accidentals.

The interface is in Spanish, but the music theory and note names (C, D♯, B♭, etc.) are universal.

## What is it for?

- **Identifying scales from real music**: You hear or see a few pitches and want to know which common scales or modes *contain* those notes. Select the pitch classes; the app lists every matching scale (per root) from its built-in library.
- **Studying modes and non-diatonic scales**: Alongside major and natural minor, you get harmonic and melodic minor, all seven diatonic modes, pentatonic major/minor, and blues.
- **Guessing a “probable” key**: When the selection narrows to a clear winner, the app surfaces a **probable key** (with ties shown when several roots score equally). A short celebratory arpeggio plays when the guess becomes unique.
- **Major key reference**: In **“Notas en tonalidad mayor”** mode, pick a single note as the tonic and see the **Ionian (major) scale** for that root—same playback and staff view as in discovery mode.
- **Ear and sight together**: Each result can **play** the scale in sequence (piano-style synthesized tone), and the **title** of a result opens a **treble-clef** staff: key signature, note heads, stems, and accidentals (including naturals when the key cancels a sharp or flat).

## Modes

| Mode | What you do | What you get |
|------|-------------|----------------|
| **Descubrir escalas** | Toggle any combination of the 12 chromatic notes | All scales in the database whose notes **include** your selection; match count; probable key when relevant |
| **Notas en tonalidad mayor** | Select exactly one note as tonic | The seven notes of the **major scale** for that tonic |

## Scales in the database

- Major (Jónica), Menor natural (Eólica), Menor armónica, Menor melódica  
- Dórica, Frigia, Lidia, Mixolidia, Locria  
- Pentatónica mayor, Pentatónica menor, Blues  

## Notable details

- **Note preview**: Optional click sound for each note (piano-style synthesis).
- **Theme**: Light and dark; preference is stored in `localStorage`.
- **Audio implementation**: Scales and previews use offline PCM → WAV playback so that sound remains reliable on more browsers and contexts where Web Audio can be finicky.
- **Reset**: Clears the selection, stops playback, and closes the staff dialog.

## Requirements

- [Node.js](https://nodejs.org/) (version compatible with the Vite version in this repo; Vite 8 is declared in `package.json`).

## Development

```bash
npm install
npm run dev
```

The Vite dev server is configured in `vite.config.js` to listen on **port 3377** and host `0.0.0.0` (see that file for `allowedHosts` if you use a custom domain).

## Production build

```bash
npm run build
```

Static output goes to `dist/`. To preview the build:

```bash
npm run preview
```

Preview uses the same port and host pattern as in `package.json` (port **3377**).

## Project layout (high level)

- `index.html` — App shell, modes, and UI structure  
- `main.js` — Scale matching, major-tonality view, staff SVG, audio  
- `style.css` — Styling and themes  

## License and credits

Project by **Gerardo Canosa** (see footer in the app for contact). All rights reserved unless otherwise stated in this repository.

---

*If you are learning harmony or transcribing, Magic Key is meant to be a quick lab bench—not a replacement for ear training, analysis of chord function, or a full score editor.*
