import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DemoPage } from './features/demo-records/demo-page';
import { PracticePreview } from './features/practice/practice-preview';

@Component({
  selector: 'sc-root',
  imports: [DemoPage, PracticePreview],
  template: `@if (practicePreview) {
      <sc-practice-preview />
    } @else {
      <sc-demo-page />
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // A review entry point, not product routing or a playable session.
  readonly practicePreview =
    new URLSearchParams(inject(DOCUMENT).location?.search ?? '').get('preview') === 'practice';
}
