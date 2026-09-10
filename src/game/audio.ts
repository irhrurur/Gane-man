export class GameAudio {
  context: AudioContext | null = null;
  volume = 0.4;
  start(volume: number) {
    this.volume = volume / 100;
    try {
      this.context = new AudioContext();
      void this.context.resume();
    } catch {}
  }
  tone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    gain = 0.1,
    slide = 0,
  ) {
    const c = this.context;
    if (!c || this.volume === 0) return;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(frequency, c.currentTime);
    if (slide)
      o.frequency.exponentialRampToValueAtTime(
        Math.max(20, slide),
        c.currentTime + duration,
      );
    g.gain.setValueAtTime(gain * this.volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  }
  shoot() {
    this.tone(120, 0.12, "sawtooth", 0.19, 32);
    this.tone(1800, 0.04, "square", 0.025, 200);
  }
  hit() {
    this.tone(900, 0.07, "sine", 0.16, 1600);
  }
  step() {
    this.tone(75, 0.04, "triangle", 0.12, 30);
  }
  reload() {
    this.tone(360, 0.1, "square", 0.05, 130);
  }
  explosion() {
    this.tone(65, 0.8, "sawtooth", 0.4, 20);
  }
  ui() {
    this.tone(650, 0.1, "sine", 0.1, 1000);
  }
  music(intensity: number) {
    this.tone(55, 0.7, "sine", 0.07);
    if (intensity > 0) this.tone(110, 0.13, "triangle", 0.08);
  }
  dispose() {
    if (this.context) void this.context.close();
  }
}
