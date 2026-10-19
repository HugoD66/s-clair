import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BrowserPracticeAudio } from './practice-audio';
import { PracticeEngine } from './practice-engine';
import { PracticeScreen } from './practice-screen';
import type { PracticeAction } from './practice-state';

@Component({
  selector: 'sc-practice-session',
  imports: [TranslatePipe, PracticeScreen],
  template: `
    <a class="sc-skip-link" href="#practice-main">{{ 'skipToContent' | translate }}</a>
    <sc-practice-screen [session]="view()" (action)="act($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeSession {
  private readonly document = inject(DOCUMENT);
  private readonly audio = new BrowserPracticeAudio();
  private readonly engine = new PracticeEngine(this.audio);
  readonly view = signal(this.engine.view());

  constructor() {
    const window = this.document.defaultView!;
    const keydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.code !== 'Space' ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.isComposing ||
        (target instanceof Element &&
          target.closest(
            'button,a,input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="button"]',
          ))
      )
        return;
      if (!['playing', 'countdown'].includes(this.view().phase)) return;
      event.preventDefault();
      if (event.repeat) return;
      // event.timeStamp and performance.now use the same monotonic origin.
      const delay = Math.max(0, window.performance.now() - event.timeStamp);
      this.engine.hit(this.audio.now() - delay);
      this.refresh();
    };
    const beforeunload = (event: BeforeUnloadEvent) => {
      if (!this.view().active) return;
      this.engine.pause();
      this.refresh();
      event.preventDefault();
      event.returnValue = '';
    };
    const visibility = () => {
      if (this.document.visibilityState !== 'hidden') return;
      if (this.view().active) this.engine.pause();
      else if (['loading', 'listening'].includes(this.view().phase)) this.engine.reset();
      this.refresh();
    };
    const timer = window.setInterval(() => this.refresh(), 20);
    this.document.addEventListener('keydown', keydown);
    this.document.addEventListener('visibilitychange', visibility);
    // All navigation in this small application is full-document navigation. The native
    // guard also covers Back, reload and tab close, subject to browser restrictions.
    window.addEventListener('beforeunload', beforeunload);
    inject(DestroyRef).onDestroy(() => {
      window.clearInterval(timer);
      this.document.removeEventListener('keydown', keydown);
      this.document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('beforeunload', beforeunload);
      this.engine.close();
    });
  }

  act(action: PracticeAction): void {
    switch (action) {
      case 'listen':
        void this.engine.listen().then(() => this.refresh());
        break;
      case 'start':
        this.engine.start();
        break;
      case 'continue':
        this.engine.continue();
        break;
      case 'leave':
        if (this.view().active) this.engine.pause();
        else this.engine.reset();
        break;
      case 'confirm-leave':
      case 'replay':
        this.engine.reset();
        break;
    }
    this.refresh();
  }

  private refresh(): void {
    const next = this.engine.view();
    // Publish only visual changes; the clock itself is not an Angular signal.
    if (JSON.stringify(next) !== JSON.stringify(this.view())) this.view.set(next);
  }
}
