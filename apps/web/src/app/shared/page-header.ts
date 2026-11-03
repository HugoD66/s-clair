import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PAGE_LINKS } from './page-links';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'sc-page-header',
  imports: [TranslatePipe],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly links = PAGE_LINKS;
  readonly language = inject(LanguageService);
}
