// Lightweight synthesized SFX + haptics. No external audio files required.

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { ctx = null; }
  }
  return ctx;
}

export type SfxName = 'draw' | 'discard' | 'lay' | 'hit' | 'skip' | 'win' | 'lose' | 'error';

function isMuted(): boolean {
  try { return localStorage.getItem('sound') === 'off'; } catch { return false; }
}

export function setMuted(muted: boolean) {
  try { localStorage.setItem('sound', muted ? 'off' : 'on'); } catch { /* ignore */ }
}

export function isSoundOn(): boolean {
  return !isMuted();
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15, delay = 0) {
  const c = getCtx();
  if (!c || isMuted()) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  osc.connect(g);
  g.connect(c.destination);
  const start = c.currentTime + delay;
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playSfx(name: SfxName) {
  switch (name) {
    case 'draw': tone(660, 0.08, 'triangle', 0.12); break;
    case 'discard': tone(330, 0.08, 'square', 0.1); break;
    case 'lay': tone(523, 0.1, 'sine', 0.15); tone(659, 0.1, 'sine', 0.12, 0.08); break;
    case 'hit': tone(784, 0.06, 'sine', 0.12); break;
    case 'skip': tone(220, 0.15, 'sawtooth', 0.12); break;
    case 'win': tone(523, 0.12, 'sine', 0.15); tone(659, 0.12, 'sine', 0.15, 0.12); tone(784, 0.18, 'sine', 0.18, 0.24); break;
    case 'lose': tone(392, 0.15, 'sine', 0.12); tone(330, 0.2, 'sine', 0.12, 0.15); break;
    case 'error': tone(180, 0.12, 'square', 0.12); break;
  }
  hapticFor(name);
}

function hapticFor(name: SfxName) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (isMuted()) return;
  const patterns: Record<SfxName, number | number[]> = {
    draw: 10, discard: 10, lay: [15, 30, 15], hit: 8, skip: 25, win: [30, 50, 30, 50, 60], lose: 40, error: [20, 40, 20],
  };
  try { navigator.vibrate(patterns[name]); } catch { /* ignore */ }
}

export function toggleSound(): boolean {
  const next = isMuted(); // if muted, turning on
  setMuted(!next);
  if (!isMuted()) playSfx('draw');
  return !isMuted();
}