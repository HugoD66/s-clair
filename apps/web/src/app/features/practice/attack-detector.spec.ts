import { describe, expect, it } from 'vitest';
import { AttackDetector } from '../../../../assets/audio/attack-detector.mjs';

function detect(samples: Float32Array, rate = 48000, block = 128) {
  const detector = new AttackDetector(rate);
  const hits: number[] = [];
  for (let offset = 0; offset < samples.length; offset += block) {
    hits.push(...detector.process(samples.subarray(offset, offset + block), offset).hits);
  }
  return hits;
}

describe('sample-based attack detection', () => {
  it('ignores silence and low background noise', () => {
    const noise = Float32Array.from({ length: 48000 }, (_, i) => Math.sin(i * 1.7) * 0.003);
    expect(detect(new Float32Array(48000))).toEqual([]);
    expect(detect(noise)).toEqual([]);
  });

  it('dates impulses on their sample frames across block boundaries at different sample rates', () => {
    for (const rate of [44100, 48000]) {
      const samples = new Float32Array(rate);
      const frames = [127, 12800, 25601];
      frames.forEach((frame) => {
        samples[frame] = 0.5;
      });
      const expected = frames.map((frame) => (frame * 1000) / rate);
      for (const block of [128, 256]) {
        const hits = detect(samples, rate, block);
        expect(hits).toHaveLength(expected.length);
        hits.forEach((hit, index) => expect(hit).toBeCloseTo(expected[index]!, 9));
      }
    }
  });

  it('counts a resonant hit once and separates hits 250 ms apart', () => {
    const rate = 48000;
    const samples = new Float32Array(rate * 2);
    for (const start of [4800, 16800, 28800]) {
      for (let i = 0; i < 10000; i++)
        samples[start + i] = samples[start + i]! + Math.cos(i * 0.3) * 0.6 * Math.exp(-i / 1800);
    }
    expect(detect(samples)).toEqual([100, 350, 600]);
  });

  it('rejects close rebound impulses but retains weak and strong isolated hits', () => {
    const samples = new Float32Array(48000);
    samples[4800] = 0.04;
    samples[5000] = 0.1;
    samples[16800] = 0.9;
    expect(detect(samples)).toEqual([100, 350]);
  });

  it('adjusts sensitivity, reports clipping and can reset the detector', () => {
    const detector = new AttackDetector(48000);
    const samples = new Float32Array([0.01]);
    expect(detector.process(samples, 0).hits).toEqual([]);
    detector.sensitivity = 100;
    expect(detector.process(samples, 4800).hits).toEqual([100]);
    detector.reset();
    expect(detector.process(new Float32Array([1]), 0)).toEqual({
      hits: [0],
      peak: 1,
      clipped: true,
    });
  });
});
