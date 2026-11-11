// Music and sound effects, synthesized in the browser with the Web Audio API.
// Nothing is downloaded, so there are no audio files to license or cache.
//
// Browsers only allow sound after the visitor interacts with the page, so the
// engine waits for the first tap or key press before it starts the context.

export type TrackName = "landing" | "match"
export type SfxName =
  | "click"
  | "join"
  | "start"
  | "submit"
  | "vote"
  | "whoosh"
  | "tick"
  | "reveal"
  | "correct"
  | "miss"
  | "bluff"
  | "pop"
  | "win"
  | "finish"

type Engine = {
  ctx: AudioContext
  master: GainNode
  music: GainNode
  sfx: GainNode
  noise: AudioBuffer
}

const MUSIC_LEVEL = 0.18
const SFX_LEVEL = 0.6
const LOOKAHEAD_S = 0.12
const SCHEDULE_MS = 25

let engine: Engine | null = null
let enabled = true
let desiredTrack: TrackName | null = null
let playing: { name: TrackName; stop: () => void } | null = null
let unlockBound = false

function midi(note: number) {
  return 440 * 2 ** ((note - 69) / 12)
}

function create(): Engine | null {
  if (engine) return engine
  if (typeof window === "undefined") return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  const ctx = new Ctor()
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -14
  compressor.ratio.value = 4
  compressor.connect(ctx.destination)
  const master = ctx.createGain()
  master.gain.value = 1
  master.connect(compressor)
  const music = ctx.createGain()
  music.gain.value = MUSIC_LEVEL
  music.connect(master)
  const sfx = ctx.createGain()
  sfx.gain.value = SFX_LEVEL
  sfx.connect(master)
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  engine = { ctx, master, music, sfx, noise }

  document.addEventListener("visibilitychange", () => {
    if (!engine) return
    if (document.visibilityState === "hidden") void engine.ctx.suspend()
    else if (enabled) void engine.ctx.resume()
  })
  return engine
}

/** Start audio on the first interaction, as browsers require. */
function bindUnlock() {
  if (unlockBound || typeof window === "undefined") return
  unlockBound = true
  const unlock = () => {
    const e = create()
    if (!e) return
    void e.ctx.resume().then(() => {
      if (enabled) syncMusic()
    })
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }
  window.addEventListener("pointerdown", unlock)
  window.addEventListener("keydown", unlock)
}

function ready(): Engine | null {
  if (!enabled || !engine || engine.ctx.state !== "running") return null
  return engine
}

// Instruments -----------------------------------------------------------------

function envelope(
  g: GainNode,
  time: number,
  peak: number,
  attack: number,
  release: number
) {
  g.gain.setValueAtTime(0.0001, time)
  g.gain.exponentialRampToValueAtTime(peak, time + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, time + attack + release)
}

function tone(
  e: Engine,
  out: AudioNode,
  {
    freq,
    time,
    type = "triangle",
    peak = 0.2,
    attack = 0.005,
    release = 0.25,
    to,
    filter,
    detune = 0,
  }: {
    freq: number
    time: number
    type?: OscillatorType
    peak?: number
    attack?: number
    release?: number
    to?: number
    filter?: number
    detune?: number
  }
) {
  const osc = e.ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, time)
  if (to)
    osc.frequency.exponentialRampToValueAtTime(to, time + attack + release)
  osc.detune.value = detune
  const g = e.ctx.createGain()
  envelope(g, time, peak, attack, release)
  let node: AudioNode = osc
  if (filter) {
    const f = e.ctx.createBiquadFilter()
    f.type = "lowpass"
    f.frequency.value = filter
    osc.connect(f)
    node = f
  }
  node.connect(g)
  g.connect(out)
  osc.start(time)
  osc.stop(time + attack + release + 0.05)
}

function noiseHit(
  e: Engine,
  out: AudioNode,
  time: number,
  {
    type,
    freq,
    peak,
    release,
  }: { type: BiquadFilterType; freq: number; peak: number; release: number }
) {
  const src = e.ctx.createBufferSource()
  src.buffer = e.noise
  const f = e.ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = e.ctx.createGain()
  envelope(g, time, peak, 0.002, release)
  src.connect(f)
  f.connect(g)
  g.connect(out)
  src.start(time)
  src.stop(time + release + 0.05)
}

const kick = (e: Engine, out: AudioNode, t: number, peak = 0.9) =>
  tone(e, out, {
    freq: 150,
    to: 42,
    time: t,
    type: "sine",
    peak,
    release: 0.28,
  })
const hat = (e: Engine, out: AudioNode, t: number, peak = 0.08) =>
  noiseHit(e, out, t, { type: "highpass", freq: 7500, peak, release: 0.05 })
const clap = (e: Engine, out: AudioNode, t: number, peak = 0.25) =>
  noiseHit(e, out, t, { type: "bandpass", freq: 1600, peak, release: 0.14 })

function pad(
  e: Engine,
  out: AudioNode,
  notes: number[],
  t: number,
  dur: number
) {
  for (const n of notes) {
    for (const detune of [-7, 7]) {
      tone(e, out, {
        freq: midi(n),
        time: t,
        type: "sawtooth",
        peak: 0.025,
        attack: dur * 0.3,
        release: dur * 0.75,
        filter: 1100,
        detune,
      })
    }
  }
}

// Tracks ----------------------------------------------------------------------

type StepContext = {
  e: Engine
  out: AudioNode
  /** 16th-note step within the bar, 0 to 15. */
  s: number
  /** Bar within the loop. */
  bar: number
  /** How many times the whole loop has played, for variations. */
  cycle: number
  t: number
  /** Length of one 16th note in seconds. */
  sd: number
  /** 0 = calm, 1 = time is almost up. */
  intensity: number
}

type Track = {
  bpm: number
  /** Tempo at full intensity. */
  maxBpm: number
  bars: number
  step: (c: StepContext) => void
}

/** A marimba-like mallet: a sine with a quick, bright overtone. */
function mallet(
  e: Engine,
  out: AudioNode,
  note: number,
  t: number,
  peak = 0.12,
  release = 0.22
) {
  tone(e, out, { freq: midi(note), time: t, type: "sine", peak, release })
  tone(e, out, {
    freq: midi(note) * 4,
    time: t,
    type: "sine",
    peak: peak * 0.18,
    release: 0.04,
  })
}

/** A short falling tom, used in fills. */
const tom = (e: Engine, out: AudioNode, t: number, from: number) =>
  tone(e, out, {
    freq: from,
    to: from * 0.55,
    time: t,
    type: "sine",
    peak: 0.35,
    release: 0.16,
  })

// Landing: a bouncy party-menu tune in C major, 8 bars with a melody.
// C, Am, F, G, C, Am, Dm, G.
const LANDING_ROOTS = [48, 45, 41, 43, 48, 45, 50, 43]
const LANDING_CHORDS = [
  [60, 64, 67],
  [57, 60, 64],
  [57, 60, 65],
  [55, 59, 62],
  [60, 64, 67],
  [57, 60, 64],
  [57, 62, 65],
  [55, 59, 62],
]
// [step, note] pairs for each bar of the melody.
const LANDING_MELODY: [number, number][][] = [
  [
    [0, 76],
    [3, 79],
    [6, 76],
    [8, 72],
    [12, 74],
  ],
  [
    [0, 72],
    [3, 76],
    [6, 72],
    [8, 69],
    [12, 71],
  ],
  [
    [0, 72],
    [2, 74],
    [4, 77],
    [8, 76],
    [12, 72],
  ],
  [
    [0, 74],
    [3, 79],
    [6, 74],
    [8, 71],
    [10, 74],
    [12, 79],
  ],
  [
    [0, 76],
    [3, 79],
    [6, 84],
    [8, 79],
    [12, 76],
  ],
  [
    [0, 76],
    [2, 74],
    [4, 72],
    [8, 69],
    [12, 72],
  ],
  [
    [0, 74],
    [3, 77],
    [6, 74],
    [8, 72],
    [12, 69],
  ],
  [
    [0, 71],
    [4, 74],
    [8, 79],
  ],
]

function landingStep({ e, out, s, bar, cycle, t, sd }: StepContext) {
  const root = LANDING_ROOTS[bar]
  const chord = LANDING_CHORDS[bar]
  // Every fourth pass is a breakdown: no drums for the first half.
  const breakdown = cycle % 4 === 3 && bar < 4
  // Every other pass the melody gets an echo and shifts some notes later.
  const variant = cycle % 2 === 1
  // Every third pass the melody rests and a chord arpeggio takes over.
  const arpeggioPass = cycle % 4 === 2

  // "Oom-pah": bass on the beat, chord stabs on the off-beat.
  if (s === 0 || s === 8) {
    tone(e, out, {
      freq: midi(root - 12),
      time: t,
      type: "triangle",
      peak: 0.3,
      release: sd * 3,
    })
  }
  if (s === 6 && bar % 2 === 1) {
    tone(e, out, {
      freq: midi(root - 5),
      time: t,
      type: "triangle",
      peak: 0.2,
      release: sd * 2,
    })
  }
  if (s === 4 || s === 12) {
    for (const n of chord) mallet(e, out, n, t, 0.05, 0.12)
  }

  if (arpeggioPass) {
    if (s % 2 === 0) mallet(e, out, chord[(s / 2) % 3] + 12, t, 0.08, 0.16)
  } else {
    for (const [at, note] of LANDING_MELODY[bar]) {
      const when = variant && at === 6 ? 7 : at
      if (when === s) {
        mallet(e, out, note, t, 0.14, 0.3)
        if (variant) mallet(e, out, note + 12, t + sd * 3, 0.04, 0.2)
      }
    }
  }

  if (breakdown) return
  if (s === 0 || s === 8 || (s === 11 && bar % 2 === 1)) kick(e, out, t, 0.55)
  if (s === 4 || s === 12) clap(e, out, t, 0.12)
  if (s % 2 === 1) hat(e, out, t, s % 4 === 3 ? 0.05 : 0.025)
  // A tom fill into the top of the loop.
  if (bar === 7 && s >= 12) tom(e, out, t, 220 - (s - 12) * 30)
}

// Match: a tense A minor loop that speeds up and fills out as time runs low.
// Am, F, C, G, Am, F, G, E.
const MATCH_ROOTS = [45, 41, 48, 43, 45, 41, 43, 40]
const MATCH_CHORDS = [
  [57, 60, 64],
  [57, 60, 65],
  [55, 60, 64],
  [55, 59, 62],
  [57, 60, 64],
  [57, 60, 65],
  [55, 59, 62],
  [56, 59, 64],
]
// Two short lead hooks that alternate every other pass.
const MATCH_HOOKS: [number, number][][] = [
  [
    [0, 0],
    [3, 2],
    [6, 1],
    [10, 0],
  ],
  [
    [0, 2],
    [2, 1],
    [4, 0],
    [7, 1],
    [12, 2],
  ],
]

function matchStep({ e, out, s, bar, cycle, t, sd, intensity }: StepContext) {
  const root = MATCH_ROOTS[bar]
  const chord = MATCH_CHORDS[bar]
  const cutoff = 450 + intensity * 1800

  // Reveal: strip back to a heartbeat and a low pad for suspense.
  if (intensity < 0.15) {
    if (s === 0 || s === 3) kick(e, out, t, s === 0 ? 0.6 : 0.35)
    if (s === 0 && bar % 2 === 0) pad(e, out, chord, t, sd * 32)
    return
  }

  // Driving bass: 8ths, 16ths once things heat up.
  const bassEvery = intensity > 0.6 ? 1 : 2
  if (s % bassEvery === 0) {
    const up = s % 4 === 2 ? 12 : 0
    tone(e, out, {
      freq: midi(root - 12 + up),
      time: t,
      type: "square",
      peak: 0.08,
      release: sd * 1.4,
      filter: cutoff,
    })
  }
  if (s === 0) pad(e, out, chord, t, sd * 16)

  // Arpeggio joins at medium intensity, and climbs an octave near the end.
  if (intensity > 0.3 && s % 2 === 1) {
    const lift = intensity > 0.75 ? 24 : 12
    tone(e, out, {
      freq: midi(chord[(s >> 1) % 3] + lift),
      time: t,
      type: "triangle",
      peak: 0.045,
      release: sd * 1.4,
      filter: 3500,
    })
  }

  // Lead hook on even bars, alternating between two hooks.
  if (bar % 2 === 0) {
    for (const [at, degree] of MATCH_HOOKS[cycle % 2]) {
      if (at === s) {
        tone(e, out, {
          freq: midi(chord[degree] + 12),
          time: t,
          type: "square",
          peak: 0.05,
          release: sd * 2,
          filter: 2200,
        })
      }
    }
  }

  // Drums. The last half-bar of every 4 bars drops out before a fill.
  const fillBar = bar % 4 === 3
  const drop = fillBar && s >= 14 && cycle % 2 === 1
  if (!drop) {
    if (s % 4 === 0) kick(e, out, t, 0.7)
    if (intensity > 0.85 && s === 14) kick(e, out, t, 0.5)
    if (s === 4 || s === 12) clap(e, out, t, 0.2)
    if (intensity > 0.3 ? true : s % 2 === 1)
      hat(e, out, t, s % 2 === 1 ? 0.05 : 0.025)
    if (intensity > 0.6 && s % 4 === 2)
      noiseHit(e, out, t, {
        type: "highpass",
        freq: 6000,
        peak: 0.05,
        release: 0.18,
      })
  }
  if (fillBar && s >= 12 && !drop) clap(e, out, t, 0.08 + (s - 12) * 0.04)

  // A ticking clock on top once time is nearly up.
  if (intensity > 0.85 && s % 4 === 0) {
    tone(e, out, {
      freq: 2000,
      time: t,
      type: "square",
      peak: 0.025,
      release: 0.03,
      filter: 5000,
    })
  }
}

const tracks: Record<TrackName, Track> = {
  landing: { bpm: 112, maxBpm: 112, bars: 8, step: landingStep },
  match: { bpm: 116, maxBpm: 136, bars: 8, step: matchStep },
}

// How tense the match music is: a base level per phase, plus urgency as the
// timer runs out. The track eases toward it so changes never jump.
let baseIntensity = 0.35
let urgency = 0

function targetIntensity() {
  return Math.min(1, baseIntensity + urgency * (1 - baseIntensity))
}

function startTrack(e: Engine, name: TrackName) {
  const track = tracks[name]
  const out = e.ctx.createGain()
  out.gain.setValueAtTime(0.0001, e.ctx.currentTime)
  out.gain.exponentialRampToValueAtTime(1, e.ctx.currentTime + 1.2)
  out.connect(e.music)
  let next = e.ctx.currentTime + 0.1
  let index = 0
  let intensity = targetIntensity()
  const timer = window.setInterval(() => {
    while (next < e.ctx.currentTime + LOOKAHEAD_S) {
      intensity += (targetIntensity() - intensity) * 0.08
      const bpm = track.bpm + (track.maxBpm - track.bpm) * intensity
      const sd = 60 / bpm / 4
      const barIndex = Math.floor(index / 16)
      track.step({
        e,
        out,
        s: index % 16,
        bar: barIndex % track.bars,
        cycle: Math.floor(barIndex / track.bars),
        t: next,
        sd,
        intensity,
      })
      next += sd
      index++
    }
  }, SCHEDULE_MS)
  return () => {
    window.clearInterval(timer)
    const now = e.ctx.currentTime
    out.gain.cancelScheduledValues(now)
    out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now)
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)
    window.setTimeout(() => out.disconnect(), 1200)
  }
}

/** Dip the music briefly so a sound effect cuts through. */
function duck(e: Engine) {
  const now = e.ctx.currentTime
  e.music.gain.cancelScheduledValues(now)
  e.music.gain.setTargetAtTime(MUSIC_LEVEL * 0.4, now, 0.02)
  e.music.gain.setTargetAtTime(MUSIC_LEVEL, now + 0.3, 0.25)
}

function syncMusic() {
  const e = ready()
  const want = e ? desiredTrack : null
  if (playing?.name === want) return
  playing?.stop()
  playing = null
  if (e && want) playing = { name: want, stop: startTrack(e, want) }
}

// Public API ------------------------------------------------------------------

/** Which loop should play. Pass null for silence. */
export function setTrack(name: TrackName | null) {
  desiredTrack = name
  bindUnlock()
  syncMusic()
}

export function setSoundEnabled(next: boolean) {
  enabled = next
  if (next) {
    const e = create()
    bindUnlock()
    void e?.ctx.resume().then(syncMusic)
  } else {
    playing?.stop()
    playing = null
  }
}

/** Match tension for this phase, 0 (calm) to 1 (frantic). */
export function setMusicIntensity(level: number) {
  baseIntensity = Math.max(0, Math.min(1, level))
}

/** How close the timer is to running out, 0 (plenty) to 1 (zero left). */
export function setMusicUrgency(level: number) {
  urgency = Math.max(0, Math.min(1, level))
}

export function playSfx(name: SfxName) {
  const e = ready()
  if (!e) return
  if (name !== "tick" && name !== "click") duck(e)
  const t = e.ctx.currentTime + 0.01
  const out = e.sfx
  switch (name) {
    case "click":
      tone(e, out, {
        freq: 900,
        time: t,
        type: "square",
        peak: 0.05,
        release: 0.04,
        filter: 3000,
      })
      break
    case "pop":
      tone(e, out, {
        freq: 500,
        to: 1100,
        time: t,
        type: "sine",
        peak: 0.25,
        release: 0.09,
      })
      break
    case "join":
      tone(e, out, {
        freq: midi(72),
        time: t,
        type: "triangle",
        peak: 0.25,
        release: 0.12,
      })
      tone(e, out, {
        freq: midi(79),
        time: t + 0.08,
        type: "triangle",
        peak: 0.25,
        release: 0.2,
      })
      break
    case "start":
      ;[60, 64, 67, 72].forEach((n, i) =>
        tone(e, out, {
          freq: midi(n),
          time: t + i * 0.07,
          type: "square",
          peak: 0.12,
          release: 0.25,
          filter: 2500,
        })
      )
      kick(e, out, t + 0.28, 0.9)
      break
    case "submit":
      noiseHit(e, out, t, {
        type: "bandpass",
        freq: 2500,
        peak: 0.12,
        release: 0.18,
      })
      tone(e, out, {
        freq: midi(76),
        time: t + 0.05,
        type: "sine",
        peak: 0.25,
        release: 0.18,
      })
      tone(e, out, {
        freq: midi(83),
        time: t + 0.12,
        type: "sine",
        peak: 0.22,
        release: 0.3,
      })
      break
    case "vote":
      tone(e, out, {
        freq: midi(81),
        time: t,
        type: "triangle",
        peak: 0.22,
        release: 0.1,
      })
      break
    case "whoosh":
      noiseHit(e, out, t, {
        type: "bandpass",
        freq: 900,
        peak: 0.18,
        release: 0.45,
      })
      tone(e, out, {
        freq: 220,
        to: 880,
        time: t,
        type: "sine",
        peak: 0.08,
        attack: 0.2,
        release: 0.2,
      })
      break
    case "tick":
      tone(e, out, {
        freq: 1500,
        time: t,
        type: "square",
        peak: 0.06,
        release: 0.03,
        filter: 4000,
      })
      tone(e, out, {
        freq: 60,
        time: t,
        type: "sine",
        peak: 0.25,
        release: 0.08,
      })
      break
    case "reveal":
      tone(e, out, {
        freq: 110,
        to: 55,
        time: t,
        type: "sine",
        peak: 0.5,
        release: 0.6,
      })
      ;[72, 76, 79, 84, 88].forEach((n, i) =>
        tone(e, out, {
          freq: midi(n),
          time: t + 0.1 + i * 0.05,
          type: "triangle",
          peak: 0.12,
          release: 0.4,
        })
      )
      break
    case "correct":
      tone(e, out, {
        freq: midi(79),
        time: t,
        type: "sine",
        peak: 0.3,
        release: 0.15,
      })
      tone(e, out, {
        freq: midi(84),
        time: t + 0.1,
        type: "sine",
        peak: 0.3,
        release: 0.45,
      })
      break
    case "miss":
      tone(e, out, {
        freq: midi(62),
        to: midi(55),
        time: t,
        type: "sawtooth",
        peak: 0.1,
        release: 0.45,
        filter: 900,
      })
      break
    case "bluff":
      // A sneaky "cha-ching" for fooling people.
      tone(e, out, {
        freq: midi(88),
        time: t,
        type: "square",
        peak: 0.08,
        release: 0.08,
        filter: 5000,
      })
      tone(e, out, {
        freq: midi(93),
        time: t + 0.09,
        type: "square",
        peak: 0.08,
        release: 0.35,
        filter: 5000,
      })
      noiseHit(e, out, t + 0.09, {
        type: "highpass",
        freq: 6000,
        peak: 0.1,
        release: 0.3,
      })
      break
    case "win":
      ;[60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) =>
        tone(e, out, {
          freq: midi(n),
          time: t + i * 0.11,
          type: "square",
          peak: 0.1,
          release: 0.3,
          filter: 3000,
        })
      )
      ;[0, 0.44, 0.88].forEach((d) => clap(e, out, t + d, 0.2))
      break
    case "finish":
      ;[67, 64, 60].forEach((n, i) =>
        tone(e, out, {
          freq: midi(n),
          time: t + i * 0.14,
          type: "triangle",
          peak: 0.18,
          release: 0.4,
        })
      )
      break
  }
}
