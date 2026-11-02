import { DOCUMENT } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PracticeSequence } from './practice-sequence';
import type { PracticeAction, PracticeState } from './practice-state';
import type { SessionView } from './practice-engine';
import { PracticeResultPanel } from './practice-result';
import { LanguageService } from '../../i18n/language.service';
import { MicrophoneDiagnostic } from './microphone-diagnostic';

@Component({
  selector: 'sc-practice-screen',
  imports: [TranslatePipe, PracticeSequence, PracticeResultPanel, MicrophoneDiagnostic],
  templateUrl: './practice-screen.html',
  styleUrl: './practice-screen.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeScreen {
  readonly diagnostic = signal(false);
  private readonly diagnosticButton = viewChild<ElementRef<HTMLButtonElement>>('diagnosticButton');
  readonly previewState = input<PracticeState>('ready');
  readonly session = input<SessionView | null>(null);
  readonly state = computed(() => this.session()?.phase ?? this.previewState());
  readonly language = inject(LanguageService);
  readonly action = output<PracticeAction>();
  readonly playing = computed(() => this.state() === 'playing' || this.state() === 'exit');
  readonly canLeave = computed(
    () => this.playing() || ['countdown', 'listening', 'loading'].includes(this.state()),
  );
  readonly currentBeat = computed(() =>
    this.session()
      ? this.session()!.beat
      : this.playing()
        ? 3
        : this.state() === 'listening'
          ? 1
          : null,
  );
  readonly feedback = computed(() => {
    const session = this.session();
    if (session?.phase === 'exit') return 'paused';
    if (session?.phase === 'playing') return session.feedback ?? 'play';
    if (session?.phase === 'ready' && session.listened) return 'listened';
    return this.state() === 'exit' ? 'playing' : this.state();
  });
  private readonly exitDialog = viewChild.required<ElementRef<HTMLDialogElement>>('exitDialog');
  private readonly title = viewChild.required<ElementRef<HTMLHeadingElement>>('title');
  private readonly document = inject(DOCUMENT);

  constructor() {
    let previousOverflow: string | null = null;
    const restoreScroll = () => {
      if (previousOverflow !== null) this.document.body.style.overflow = previousOverflow;
      previousOverflow = null;
    };
    inject(DestroyRef).onDestroy(restoreScroll);
    let previousPhase = this.state();
    let previousDiagnostic = false;
    afterRenderEffect(() => {
      const diagnostic = this.diagnostic();
      if (previousDiagnostic && !diagnostic) this.diagnosticButton()?.nativeElement.focus();
      previousDiagnostic = diagnostic;
      const phase = this.state();
      if (
        this.session() &&
        phase !== previousPhase &&
        ['countdown', 'result', 'ready', 'audio-error'].includes(phase)
      ) {
        this.title().nativeElement.focus({ preventScroll: phase === 'countdown' });
      }
      previousPhase = phase;
      const dialog = this.exitDialog().nativeElement;
      if (this.state() === 'exit' && !dialog.open) {
        previousOverflow = this.document.body.style.overflow;
        this.document.body.style.overflow = 'hidden';
        dialog.showModal();
      } else if (this.state() !== 'exit' && dialog.open) {
        dialog.close();
        restoreScroll();
        this.title().nativeElement.focus();
      }
    });
  }
  cancelExit(event: Event): void {
    event.preventDefault();
    this.action.emit('continue');
  }
  keepDialogFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const buttons = this.exitDialog().nativeElement.querySelectorAll<HTMLButtonElement>('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}
