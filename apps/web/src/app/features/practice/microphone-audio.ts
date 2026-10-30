import { BrowserPracticeAudio } from './practice-audio';

export type MicrophoneError = 'unsupported' | 'denied' | 'missing' | 'busy' | 'lost' | 'failed';
export interface MicrophoneReport {
  hits: number[];
  peak: number;
  clipped: boolean;
  revision: number;
}

/** Owns capture resources only. Captured audio is never stored or sent to a server. */
export class MicrophoneAudio {
  private generation = 0;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: AudioWorkletNode | null = null;
  private readonly pulse = new BrowserPracticeAudio();
  private pulseTimer: ReturnType<typeof setTimeout> | undefined;
  private pulseGeneration = 0;
  private revision = 0;

  constructor(
    private readonly report: (report: MicrophoneReport) => void,
    private readonly failed: (error: MicrophoneError) => void,
    private readonly pulseEnded: () => void,
  ) {}

  async start(sensitivity: number): Promise<boolean> {
    this.stop();
    const generation = this.generation;
    if (
      !globalThis.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      !globalThis.AudioContext
    ) {
      this.failed('unsupported');
      return false;
    }
    try {
      const context = new AudioContext({ latencyHint: 'interactive' });
      this.context = context;
      if (!context.audioWorklet) throw new DOMException('Worklet unavailable', 'NotSupportedError');
      // Resume on the initiating gesture, before the permission request settles.
      await context.resume();
      if (generation !== this.generation) return false;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      this.stream = stream;
      await context.audioWorklet.addModule(
        new URL('assets/audio/microphone-worklet.mjs', document.baseURI).href,
      );
      if (generation !== this.generation) return false;
      const source = context.createMediaStreamSource(stream);
      this.source = source;
      const processor = new AudioWorkletNode(context, 'microphone-diagnostic', {
        channelCount: 1,
        channelCountMode: 'explicit',
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      this.processor = processor;
      processor.port.onmessage = ({ data }: MessageEvent<MicrophoneReport>) => {
        if (generation === this.generation && data.revision === this.revision) this.report(data);
      };
      const lost = () => {
        if (generation !== this.generation) return;
        this.stop();
        this.failed('lost');
      };
      processor.onprocessorerror = lost;
      for (const track of stream.getAudioTracks()) {
        track.onended = lost;
        track.onmute = lost;
        if (track.readyState !== 'live' || track.muted) throw new Error('Inactive microphone');
      }
      context.onstatechange = () => {
        if (context.state !== 'running') lost();
      };
      if (context.state !== 'running') throw new Error('Inactive audio context');
      this.configure(sensitivity);
      // The processor outputs zeros. There is no monitoring/feedback path.
      source.connect(processor).connect(context.destination);
      return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      this.stop();
      const name = error instanceof Error ? error.name : '';
      this.failed(
        name === 'NotAllowedError'
          ? 'denied'
          : name === 'NotFoundError'
            ? 'missing'
            : name === 'NotReadableError'
              ? 'busy'
              : name === 'NotSupportedError'
                ? 'unsupported'
                : 'failed',
      );
      return false;
    }
  }

  configure(sensitivity: number): void {
    this.revision++;
    this.processor?.port.postMessage({ type: 'configure', sensitivity, revision: this.revision });
  }

  settings(): MediaTrackSettings | null {
    return this.stream?.getAudioTracks()[0]?.getSettings() ?? null;
  }

  async startPulse(): Promise<boolean> {
    this.stopPulse();
    const generation = this.pulseGeneration;
    try {
      await this.pulse.open();
      if (generation !== this.pulseGeneration || !this.processor) return false;
      const start = this.pulse.startTime();
      for (let i = 0; i < 60; i++) this.pulse.schedule('pulse', start + i * 1000);
      this.pulseTimer = setTimeout(
        () => {
          this.stopPulse();
          this.pulseEnded();
        },
        start - this.pulse.now() + 60_000,
      );
      return true;
    } catch {
      if (generation === this.pulseGeneration) this.stopPulse();
      return false;
    }
  }

  stopPulse(): void {
    this.pulseGeneration++;
    clearTimeout(this.pulseTimer);
    this.pulse.close();
  }

  stop(): void {
    this.generation++;
    this.stopPulse();
    if (this.processor) {
      this.processor.port.onmessage = null;
      this.processor.onprocessorerror = null;
      this.processor.port.close();
      this.processor.disconnect();
    }
    this.processor = null;
    this.source?.disconnect();
    this.source = null;
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.onmute = null;
      track.stop();
    });
    this.stream = null;
    const context = this.context;
    this.context = null;
    if (context) {
      context.onstatechange = null;
      if (context.state !== 'closed') void context.close().catch(() => undefined);
    }
  }
}
