import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DemoPage } from './features/demo-records/demo-page';
import { PracticeSession } from './features/practice/practice-session';
import { PracticePreview } from './features/practice/practice-preview';

@Component({
  selector: 'sc-root',
  imports: [DemoPage, PracticePreview, PracticeSession],
  template: `@if (practiceSession) {
      <sc-practice-session />
    } @else if (practicePreview) {
      <sc-practice-preview />
    } @else {
      <sc-demo-page />
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly query = new URLSearchParams(inject(DOCUMENT).location?.search ?? '');
  // Keep the original exercise link playable for users with a bookmark.
  readonly practiceSession = this.query.has('practice') || this.query.get('preview') === 'practice';
  readonly practicePreview = this.query.get('preview') === 'practice-states';
}
