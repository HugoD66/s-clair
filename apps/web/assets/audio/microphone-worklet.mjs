/* global AudioWorkletProcessor, registerProcessor, sampleRate, currentFrame */
import { AttackDetector } from './attack-detector.mjs';

class MicrophoneProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.detector = new AttackDetector(sampleRate);
    this.lastReport = 0;
    this.peak = 0;
    this.clipped = false;
    this.revision = 0;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'configure') {
        this.detector.sensitivity = Math.max(0, Math.min(100, data.sensitivity));
        this.detector.reset();
        this.revision = data.revision;
      }
    };
  }

  process(inputs, outputs) {
    // Keep the graph running, but never send captured sound to the speakers.
    for (const output of outputs) for (const channel of output) channel.fill(0);
    const samples = inputs[0]?.[0];
    if (!samples) return true;
    const result = this.detector.process(samples, currentFrame);
    this.peak = Math.max(this.peak, result.peak);
    this.clipped ||= result.clipped;
    if (result.hits.length || currentFrame - this.lastReport >= sampleRate / 20) {
      this.port.postMessage({
        hits: result.hits,
        peak: this.peak,
        clipped: this.clipped,
        revision: this.revision,
      });
      this.lastReport = currentFrame;
      this.peak = 0;
      this.clipped = false;
    }
    return true;
  }
}
registerProcessor('microphone-diagnostic', MicrophoneProcessor);
