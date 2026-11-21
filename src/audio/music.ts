// Procedural ambient background music using Web Audio API.
// Generates a slow pentatonic loop so there are no external audio files.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let playing = false;
let timer: number | null = null;

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { ctx = null; }
  }
  return ctx;
}

function isMuted(): boolean {
  try { return localStorage.getItem('music') === 'off'; } catch { return false; }
}

export function setMusicMuted(muted: boolean) {
  try { localStorage.setItem('music', muted ? 'off' : 'on'); } catch { /* ignore */ }
  if (muted) stopMusic(); else startMusic();
}

export function isMusicOn(): boolean {
  return !isMuted();
}

function note(freq: number, time: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  const c = getCtx();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  osc.connect(g);
  g.connect(master);
  g.gain.linearRampToValueAtTime(gain, time + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.start(time);
  osc.stop(time + duration + 0.1);
}

function playLoop() {
  const c = getCtx();
  if (!c || !master || isMuted()) return;
  const now = c.currentTime + 0.1;
  const beat = 0.9;
  const bars = 8;
  for (let i = 0; i < bars * 4; i++) {
    const t = now + i * beat;
    // bass
    if (i % 4 === 0) {
      note(PENTATONIC[0] / 2, t, beat * 3.5, 0.06, 'sine');
    }
    // melody (sparse)
    if (Math.random() < 0.55) {
      const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      note(f, t, beat * 1.8, 0.05, 'triangle');
    }
    // high shimmer
    if (i % 2 === 0 && Math.random() < 0.3) {
      note(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)] * 2, t, beat * 0.6, 0.025, 'sine');
    }
  }
  const loopMs = bars * 4 * beat * 1000;
  timer = window.setTimeout(() => {
    if (playing && !isMuted()) playLoop();
  }, loopMs - 200);
}

export function startMusic() {
  if (playing || isMuted()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  master = c.createGain();
  master.gain.value = 0.35;
  master.connect(c.destination);
  playing = true;
  playLoop();
}

export function stopMusic() {
  playing = false;
  if (timer) { clearTimeout(timer); timer = null; }
  if (master) { master.disconnect(); master = null; }
}

export function toggleMusic(): boolean {
  const next = isMuted();
  setMusicMuted(!next);
  return !isMuted();
}