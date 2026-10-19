export type PracticeSound = 'pulse' | 'count' | 'drum';

/** Absolute times share the audio output clock, in milliseconds. */
export interface PracticeAudio {
  open(): Promise<void>;
  now(): number;
  startTime(): number;
  schedule(sound: PracticeSound, atMs: number): void;
  stop(): void;
  close(): void;
  running(): boolean;
}

/** Short synthesized sounds; no microphone, network assets or recorded audio. */
export class BrowserPracticeAudio implements PracticeAudio {
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private readonly sources = new Set<AudioScheduledSourceNode>();

  async open(): Promise<void> {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      const length = Math.ceil(this.context.sampleRate * 0.12);
      this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let index = 0; index < length; index++) samples[index] = Math.random() * 2 - 1;
    }
    const context = this.context;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        context.resume(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Audio activation timed out')), 4000);
        }),
      ]);
      if (context.state !== 'running') throw new Error('Audio is not running');
    } finally {
      clearTimeout(timeout);
    }
  }

  now(): number {
    const context = this.context;
    if (!context) return 0;
    // Align visuals and input timestamps with the device's output, not render-ahead time.
    const timestamp = context.getOutputTimestamp?.();
    if (
      timestamp?.performanceTime &&
      timestamp.contextTime &&
      timestamp.performanceTime > 0 &&
      timestamp.contextTime > 0
    ) {
      return timestamp.contextTime * 1000 + performance.now() - timestamp.performanceTime;
    }
    return (context.currentTime - context.baseLatency - (context.outputLatency || 0)) * 1000;
  }

  running(): boolean {
    return this.context?.state === 'running';
  }

  startTime(): number {
    // Leave render-ahead room even when the output device has substantial latency.
    return Math.max(this.now() + 200, (this.context?.currentTime ?? 0) * 1000 + 60);
  }

  schedule(sound: PracticeSound, atMs: number): void {
    const context = this.context;
    if (!context || !this.running()) throw new Error('Audio is not running');
    const at = Math.max(context.currentTime, atMs / 1000);
    const drum = sound === 'drum';
    const gain = context.createGain();
    gain.gain.setValueAtTime(drum ? 0.25 : 0.1, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + (drum ? 0.12 : 0.045));
    gain.connect(context.destination);
    let source: AudioScheduledSourceNode;
    let filter: BiquadFilterNode | undefined;
    if (drum) {
      const noise = context.createBufferSource();
      noise.buffer = this.noise;
      filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 900;
      noise.connect(filter).connect(gain);
      source = noise;
    } else {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = sound === 'count' ? 1000 : 650;
      oscillator.connect(gain);
      source = oscillator;
    }
    this.sources.add(source);
    source.onended = () => {
      source.disconnect();
      filter?.disconnect();
      gain.disconnect();
      this.sources.delete(source);
    };
    source.start(at);
    source.stop(at + (drum ? 0.13 : 0.06));
  }

  stop(): void {
    for (const source of this.sources) {
      source.stop();
      source.disconnect();
    }
    this.sources.clear();
  }

  close(): void {
    this.stop();
    const context = this.context;
    this.context = null;
    this.noise = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }
}
