import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../i18n/language.service';
import { PracticeScreen } from './practice-screen';
import { practiceStates, type PracticeAction, type PracticeState } from './practice-state';

@Component({
  selector: 'sc-practice-preview',
  imports: [TranslatePipe, PracticeScreen],
  templateUrl: './practice-preview.html',
  styleUrl: './practice-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticePreview {
  readonly language = inject(LanguageService);
  readonly states = practiceStates;
  readonly state = signal<PracticeState>('ready');
  selectState(value: string): void {
    const state = this.states.find((state) => state === value);
    if (state) this.state.set(state);
  }
  // Illustrate the wireframe transitions only. No clock, audio, input or scoring.
  act(action: PracticeAction): void {
    switch (action) {
      case 'listen':
        this.state.set('listening');
        break;
      case 'start':
      case 'continue':
        this.state.set('countdown');
        break;
      case 'leave':
        this.state.set(this.state() === 'listening' ? 'ready' : 'exit');
        break;
      case 'confirm-leave':
        this.state.set('ready');
        break;
    }
  }
}
