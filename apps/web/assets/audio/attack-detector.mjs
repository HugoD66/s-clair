/** Sample-based transient detector. No knowledge of the exercise or expected beats. */
export class AttackDetector {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.sensitivity = 50;
    this.reset();
  }

  reset() {
    this.envelope = 0;
    this.background = 0;
    this.armed = true;
    this.lastHit = -Infinity;
  }

  process(samples, firstFrame) {
    const hits = [];
    let peak = 0;
    // A high sensitivity lowers the minimum attack level. Noise still raises it.
    const floor = 0.12 * Math.pow(0.025, this.sensitivity / 100);
    const release = Math.exp(-1 / (this.sampleRate * 0.006));
    const smoothing = Math.exp(-1 / (this.sampleRate * 0.15));
    for (let i = 0; i < samples.length; i++) {
      const amplitude = Math.abs(samples[i]);
      peak = Math.max(peak, amplitude);
      const threshold = Math.max(floor, this.background * 5);
      this.envelope = Math.max(amplitude, this.envelope * release);
      const frame = firstFrame + i;
      if (this.envelope < threshold * 0.4) this.armed = true;
      if (this.armed && amplitude >= threshold && frame - this.lastHit >= this.sampleRate * 0.08) {
        hits.push((frame / this.sampleRate) * 1000);
        this.lastHit = frame;
        this.armed = false;
      }
      this.background = smoothing * this.background + (1 - smoothing) * amplitude;
    }
    return { hits, peak, clipped: peak >= 0.98 };
  }
}
