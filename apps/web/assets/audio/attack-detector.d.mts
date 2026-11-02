export class AttackDetector {
  constructor(sampleRate: number);
  sensitivity: number;
  reset(): void;
  process(
    samples: Float32Array,
    firstFrame: number,
  ): {
    hits: number[];
    peak: number;
    clipped: boolean;
  };
}
