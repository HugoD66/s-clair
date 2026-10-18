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
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PracticeSequence } from './practice-sequence';
import type { PracticeAction, PracticeState } from './practice-state';

@Component({
  selector: 'sc-practice-screen',
  imports: [TranslatePipe, PracticeSequence],
  templateUrl: './practice-screen.html',
  styleUrl: './practice-screen.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeScreen {
  readonly state = input.required<PracticeState>();
  readonly action = output<PracticeAction>();
  readonly playing = computed(() => this.state() === 'playing' || this.state() === 'exit');
  readonly canLeave = computed(
    () => this.playing() || this.state() === 'countdown' || this.state() === 'listening',
  );
  readonly currentBeat = computed(() =>
    this.playing() ? 3 : this.state() === 'listening' ? 1 : null,
  );
  readonly feedback = computed(() => (this.state() === 'exit' ? 'playing' : this.state()));
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
    afterRenderEffect(() => {
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
