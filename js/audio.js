/**
 * Web Audio API — procedural sounds. No external files.
 */

let ctx = null;
let bgmNode = null;
let bgmGain = null;

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
}

export function resumeAudio() {
  if (ctx?.state === 'suspended') {
    ctx.resume();
  }
}

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playHit() {
  if (!ctx) return;
  playTone(80, 0.15, 'sawtooth', 0.2);
  setTimeout(() => playTone(60, 0.2, 'square', 0.15), 30);
}

export function playPass() {
  if (!ctx) return;
  playTone(440, 0.08, 'sine', 0.15);
  playTone(554, 0.08, 'sine', 0.1);
}

export function playCollect() {
  if (!ctx) return;
  playTone(880, 0.06, 'sine', 0.2);
  setTimeout(() => playTone(1100, 0.08, 'sine', 0.15), 40);
}

export function playNearMiss() {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(660, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.22);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.22);
}

export function playMenuSelect() {
  if (!ctx) return;
  playTone(330, 0.05, 'sine', 0.2);
}

export function playCountdownBeep() {
  if (!ctx) return;
  playTone(523, 0.12, 'sine', 0.35);
}

export function playGo() {
  if (!ctx) return;
  playTone(523, 0.06, 'sine', 0.3);
  setTimeout(() => playTone(659, 0.06, 'sine', 0.25), 60);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.35), 120);
}

export function startBGM() {
  if (!ctx || bgmNode) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'sine';
  osc.frequency.value = 110;
  osc.connect(filter);
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  filter.connect(gain);
  gain.gain.value = 0.04;
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  bgmNode = osc;
  bgmGain = gain;
}

export function stopBGM() {
  if (bgmNode && ctx) {
    bgmGain?.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    bgmNode.stop(ctx.currentTime + 0.3);
    bgmNode = null;
    bgmGain = null;
  }
}
