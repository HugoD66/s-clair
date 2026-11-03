import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageLayout } from '../../shared/page-layout';
import { PAGE_LINKS } from '../../shared/page-links';

@Component({
  selector: 'sc-home-page',
  imports: [TranslatePipe, PageLayout],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly links = PAGE_LINKS;
  readonly rhythmHeights = [12, 28, 48, 80, 122, 80, 48, 28, 12];
}
