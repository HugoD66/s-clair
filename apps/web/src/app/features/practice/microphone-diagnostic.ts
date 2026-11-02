import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MicrophoneAudio, type MicrophoneError } from './microphone-audio';

@Component({
  selector: 'sc-microphone-diagnostic',
  imports: [TranslatePipe],
  templateUrl: './microphone-diagnostic.html',
  styleUrl: './microphone-diagnostic.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MicrophoneDiagnostic {
  readonly closed = output<void>();
  readonly state = signal<'idle' | 'loading' | 'running' | 'stopped' | 'error'>('idle');
  readonly error = signal<MicrophoneError>('failed');
  readonly count = signal(0);
  readonly level = signal(0);
  readonly clipped = signal(false);
  readonly sensitivity = signal(50);
  readonly pulse = signal(false);
  readonly pulseLoading = signal(false);
  readonly pulseError = signal(false);
  readonly processed = signal(false);
  readonly flash = signal(false);
  private clipUntil = 0;
  private flashUntil = 0;
  private operation = 0;
  private readonly document = inject(DOCUMENT);
  private readonly title = viewChild.required<ElementRef<HTMLHeadingElement>>('title');
  private readonly audio = new MicrophoneAudio(
    (report) => {
      const now = performance.now();
      this.count.update((count) => count + report.hits.length);
      this.level.set(Math.min(100, Math.round(Math.sqrt(report.peak) * 100)));
      if (report.clipped) this.clipUntil = now + 1000;
      if (report.hits.length) this.flashUntil = now + 120;
      this.clipped.set(now < this.clipUntil);
      this.flash.set(now < this.flashUntil);
    },
    (error) => {
      this.clearIndicators();
      this.error.set(error);
      this.state.set('error');
    },
    () => this.pulse.set(false),
  );

  constructor() {
    afterNextRender(() => this.title().nativeElement.focus());
    const hidden = () => {
      if (this.document.visibilityState === 'hidden') this.stop();
    };
    const pagehide = () => this.stop();
    this.document.addEventListener('visibilitychange', hidden);
    this.document.defaultView?.addEventListener('pagehide', pagehide);
    inject(DestroyRef).onDestroy(() => {
      this.stop();
      this.document.removeEventListener('visibilitychange', hidden);
      this.document.defaultView?.removeEventListener('pagehide', pagehide);
    });
  }

  async start(): Promise<void> {
    const operation = ++this.operation;
    this.state.set('loading');
    this.clearIndicators();
    if (await this.audio.start(this.sensitivity())) {
      if (operation !== this.operation) return;
      // The sensitivity may have changed while permission was pending.
      this.audio.configure(this.sensitivity());
      const settings = this.audio.settings();
      this.processed.set(
        Boolean(
          settings?.echoCancellation || settings?.noiseSuppression || settings?.autoGainControl,
        ),
      );
      this.state.set('running');
    }
  }

  reset(): void {
    this.audio.configure(this.sensitivity());
    this.count.set(0);
    this.flashUntil = 0;
    this.flash.set(false);
  }

  changeSensitivity(event: Event): void {
    this.sensitivity.set(Number((event.target as HTMLInputElement).value));
    this.audio.configure(this.sensitivity());
  }

  async togglePulse(): Promise<void> {
    if (this.pulse()) {
      this.audio.stopPulse();
      this.pulse.set(false);
      return;
    }
    const operation = this.operation;
    this.pulseLoading.set(true);
    this.pulseError.set(false);
    const started = await this.audio.startPulse();
    if (operation !== this.operation || this.state() !== 'running') return;
    this.pulseLoading.set(false);
    this.pulse.set(started);
    this.pulseError.set(!started);
  }

  stop(): void {
    this.operation++;
    this.audio.stop();
    this.clearIndicators();
    this.state.set('stopped');
  }

  close(): void {
    this.stop();
    this.closed.emit();
  }

  private clearIndicators(): void {
    this.level.set(0);
    this.clipped.set(false);
    this.flash.set(false);
    this.clipUntil = 0;
    this.flashUntil = 0;
    this.pulse.set(false);
    this.pulseLoading.set(false);
    this.pulseError.set(false);
    this.processed.set(false);
  }
}
