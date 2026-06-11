// Fully synthesized ambience — sea, wind, and the Ape's little engine.
// No audio assets; everything is generated with the WebAudio API.
export class Ambience {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
  }

  // must be called from a user gesture
  start() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.5 : 0;
    this.master.connect(ctx.destination);

    // --- sea: looped brown-ish noise through a slow-swelling lowpass ---
    const noiseBuf = this.#noiseBuffer(4, 0.02, true);
    const sea = ctx.createBufferSource();
    sea.buffer = noiseBuf;
    sea.loop = true;
    const seaFilter = ctx.createBiquadFilter();
    seaFilter.type = 'lowpass';
    seaFilter.frequency.value = 420;
    const seaGain = ctx.createGain();
    seaGain.gain.value = 0.5;
    sea.connect(seaFilter).connect(seaGain).connect(this.master);
    sea.start();

    const swell = ctx.createOscillator();
    swell.frequency.value = 0.09;
    const swellAmt = ctx.createGain();
    swellAmt.gain.value = 200;
    swell.connect(swellAmt).connect(seaFilter.frequency);
    swell.start();

    const swellG = ctx.createOscillator();
    swellG.frequency.value = 0.07;
    const swellGAmt = ctx.createGain();
    swellGAmt.gain.value = 0.18;
    swellG.connect(swellGAmt).connect(seaGain.gain);
    swellG.start();

    // --- wind: lighter noise, bandpass with wandering center ---
    const wind = ctx.createBufferSource();
    wind.buffer = this.#noiseBuffer(3, 0.012, false);
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.35;
    wind.connect(windFilter).connect(windGain).connect(this.master);
    wind.start();

    const gust = ctx.createOscillator();
    gust.frequency.value = 0.05;
    const gustAmt = ctx.createGain();
    gustAmt.gain.value = 260;
    gust.connect(gustAmt).connect(windFilter.frequency);
    gust.start();

    // --- engine: a Vespa's two-stroke buzz, pitch follows speed ---
    const engine = ctx.createOscillator();
    engine.type = 'triangle';
    engine.frequency.value = 55;
    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.value = 27.5;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.25;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 220;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.04;
    engine.connect(engineFilter);
    sub.connect(subGain).connect(engineFilter);
    engineFilter.connect(this.engineGain).connect(this.master);
    engine.start();
    sub.start();
    this.engineOsc = engine;
    this.engineSub = sub;
  }

  #noiseBuffer(seconds, amp, brown) {
    const len = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = (Math.random() * 2 - 1);
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * amp * 80;
      } else {
        data[i] = white * amp * 8;
      }
    }
    return buf;
  }

  // called per-frame; speed in [0, ~17]
  setEngine(speed) {
    if (!this.ctx || !this.engineOsc) return;
    const f = Math.abs(speed);
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(55 + f * 7, t, 0.08);
    this.engineSub.frequency.setTargetAtTime(27.5 + f * 3.5, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.04 + Math.min(f / 17, 1) * 0.1, t, 0.1);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.enabled ? 0.5 : 0, this.ctx.currentTime, 0.15);
    }
    return this.enabled;
  }
}
