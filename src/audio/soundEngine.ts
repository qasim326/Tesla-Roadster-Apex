// Procedural Web Audio API sound engine for Roadster Apex
// Zero external audio files — synthesized hypercar motor, hydraulic suspension jump,
// SpaceX cold-gas nitrogen thrusters, surge boost, impacts, and HUD feedback.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private unlocked = false;

  // Continuous nodes
  private motorOsc1: OscillatorNode | null = null;
  private motorOsc2: OscillatorNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;
  private motorGain: GainNode | null = null;

  private thrusterNoise: AudioBufferSourceNode | null = null;
  private thrusterFilter: BiquadFilterNode | null = null;
  private thrusterSubOsc: OscillatorNode | null = null;
  private thrusterGain: GainNode | null = null;

  private surgeOsc: OscillatorNode | null = null;
  private surgeGain: GainNode | null = null;

  private rainNoise: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.03);
    }
  }

  public unlock(): void {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.72;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Create 2-second looping noise buffer for cold-gas jets & impacts
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Slight pink-ish tilt for richer cold-gas jet texture
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = white * 0.65 + lastOut * 1.4;
    }
    this.noiseBuffer = buffer;

    this.initContinuousLoops();
    this.unlocked = true;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  private initContinuousLoops(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;

    // 1. Hypercar EV / Turbine motor hum
    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.value = 260;
    motorFilter.Q.value = 3.2;

    const motorGain = ctx.createGain();
    motorGain.gain.value = 0;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 65;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 130.5;

    osc1.connect(motorFilter);
    osc2.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(this.masterGain);

    osc1.start();
    osc2.start();

    this.motorOsc1 = osc1;
    this.motorOsc2 = osc2;
    this.motorFilter = motorFilter;
    this.motorGain = motorGain;

    // 2. SpaceX Cold-Gas Nitrogen Thruster jet (continuous loop modulated by gain)
    const thrusterNoise = ctx.createBufferSource();
    thrusterNoise.buffer = this.noiseBuffer;
    thrusterNoise.loop = true;

    const thrusterFilter = ctx.createBiquadFilter();
    thrusterFilter.type = 'bandpass';
    thrusterFilter.frequency.value = 1850;
    thrusterFilter.Q.value = 0.85;

    const thrusterSubOsc = ctx.createOscillator();
    thrusterSubOsc.type = 'sawtooth';
    thrusterSubOsc.frequency.value = 48;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.16;

    const thrusterGain = ctx.createGain();
    thrusterGain.gain.value = 0;

    thrusterNoise.connect(thrusterFilter);
    thrusterFilter.connect(thrusterGain);
    thrusterSubOsc.connect(subGain);
    subGain.connect(thrusterGain);
    thrusterGain.connect(this.masterGain);

    thrusterNoise.start();
    thrusterSubOsc.start();

    this.thrusterNoise = thrusterNoise;
    this.thrusterFilter = thrusterFilter;
    this.thrusterSubOsc = thrusterSubOsc;
    this.thrusterGain = thrusterGain;

    // 3. Surge boost harmonic turbine whine
    const surgeOsc = ctx.createOscillator();
    surgeOsc.type = 'sine';
    surgeOsc.frequency.value = 220;

    const surgeGain = ctx.createGain();
    surgeGain.gain.value = 0;

    surgeOsc.connect(surgeGain);
    surgeGain.connect(this.masterGain);
    surgeOsc.start();

    this.surgeOsc = surgeOsc;
    this.surgeGain = surgeGain;

    // 4. Rain Storm Ambience Loop
    const rainNoise = ctx.createBufferSource();
    rainNoise.buffer = this.noiseBuffer;
    rainNoise.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1350;
    rainFilter.Q.value = 0.55;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;

    rainNoise.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.masterGain);
    rainNoise.start();

    this.rainNoise = rainNoise;
    this.rainFilter = rainFilter;
    this.rainGain = rainGain;
  }

  public updateContinuous(params: {
    playing: boolean;
    speedKmh: number;
    coldGasActive: boolean;
    surgeActive: boolean;
    isAirborne: boolean;
    previewThruster?: boolean;
    weather?: 'clear' | 'rainy' | 'foggy';
  }): void {
    if (!this.ctx || !this.unlocked) return;
    const now = this.ctx.currentTime;

    const isRainy = params.weather === 'rainy';
    const rainTarget = isRainy ? (params.playing ? 0.085 : 0.045) : 0;
    this.rainFilter?.frequency.setTargetAtTime(params.playing ? 1550 : 1200, now, 0.25);
    this.rainGain?.gain.setTargetAtTime(rainTarget, now, 0.28);

    if (!params.playing && !params.previewThruster) {
      this.motorGain?.gain.setTargetAtTime(0, now, 0.08);
      this.thrusterGain?.gain.setTargetAtTime(0, now, 0.06);
      this.surgeGain?.gain.setTargetAtTime(0, now, 0.06);
      return;
    }

    if (params.previewThruster && !params.playing) {
      this.motorGain?.gain.setTargetAtTime(0, now, 0.06);
      this.surgeGain?.gain.setTargetAtTime(0, now, 0.06);
      this.thrusterFilter?.frequency.setTargetAtTime(2100, now, 0.08);
      this.thrusterGain?.gain.setTargetAtTime(0.11, now, 0.08);
      return;
    }

    // Speed-linked motor pitch & filter
    const speedRatio = Math.min(Math.max(params.speedKmh / 540, 0), 1.15);
    const baseFreq = 58 + speedRatio * 145 + (params.surgeActive ? 35 : 0);
    const roadDamp = params.isAirborne ? 0.72 : 1.0;

    this.motorOsc1?.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.motorOsc2?.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.05);
    this.motorFilter?.frequency.setTargetAtTime(220 + speedRatio * 1050, now, 0.05);
    this.motorGain?.gain.setTargetAtTime((0.05 + speedRatio * 0.07) * roadDamp, now, 0.06);

    // Cold-gas thruster plume sound
    const thrusterTarget = params.coldGasActive ? 0.28 : params.surgeActive ? 0.14 : 0;
    const filterFreq = params.coldGasActive ? 2250 : 1350;
    this.thrusterFilter?.frequency.setTargetAtTime(filterFreq, now, 0.05);
    this.thrusterSubOsc?.frequency.setTargetAtTime(params.coldGasActive ? 54 : 42, now, 0.05);
    this.thrusterGain?.gain.setTargetAtTime(thrusterTarget, now, 0.04);

    // Surge turbine whine
    const surgeTarget = params.surgeActive ? 0.075 : 0;
    this.surgeOsc?.frequency.setTargetAtTime(260 + speedRatio * 340, now, 0.08);
    this.surgeGain?.gain.setTargetAtTime(surgeTarget, now, 0.06);
  }

  // Hydraulic suspension jump: punchy low thump + crisp pneumatic release hiss
  public playHydraulicJump(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Pneumatic punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.19);

    oscGain.gain.setValueAtTime(0.42, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);

    // High-pressure hydraulic air snap
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + 0.18);
    filter.Q.value = 1.6;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.21);
  }

  public playLanding(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(98, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.14);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playSurgeEngage(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.24);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playBonusChime(type: 'pad' | 'gap' | 'vault'): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const freqs =
      type === 'gap'
        ? [523.25, 659.25, 783.99]
        : type === 'pad'
          ? [440, 587.33, 880]
          : [493.88, 739.99];

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playShieldHit(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Metallic crunch
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.3);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.48, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.34);

    // Impact sub thud
    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);
    oGain.gain.setValueAtTime(0.38, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(oGain);
    oGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playGameOver(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    this.playShieldHit();

    // Power-down turbine sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.85);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.92);
  }

  public playOrbPickup(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playMissionComplete(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      const t = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playStageVictory(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.085;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  public playUiClick(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.unlocked = false;
    }
  }
}

export const soundEngine = new SoundEngine();
