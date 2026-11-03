import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageHeader } from './page-header';

/** Shared frame for public pages; the exercise keeps its own focused shell. */
@Component({
  selector: 'sc-page-layout',
  imports: [PageHeader],
  templateUrl: './page-layout.html',
  styleUrl: './page-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLayout {
  readonly layout = input<'content' | 'hero'>('content');
}
