import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'sc-page-header',
  imports: [TranslatePipe],
  template: `
    <a class="sc-skip-link" href="#main">{{ 'skipToContent' | translate }}</a>
    <header>
      <a class="sc-brand" href="/" [attr.aria-label]="'home.back' | translate">
        <img
          src="assets/images/logo-s-clair.png"
          alt="S-Clair"
          width="2172"
          height="724"
          fetchpriority="high"
        />
      </a>
      <nav [attr.aria-label]="'language' | translate">
        <button
          type="button"
          lang="fr"
          aria-label="Français"
          [attr.aria-pressed]="language.current() === 'fr'"
          (click)="language.select('fr')"
        >
          FR
        </button>
        <button
          type="button"
          lang="en"
          aria-label="English"
          [attr.aria-pressed]="language.current() === 'en'"
          (click)="language.select('en')"
        >
          EN
        </button>
      </nav>
    </header>
  `,
  styles: `
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      padding: 20px 40px;
      border-bottom: 1px solid #ffffff0d;
      background: var(--sc-color-canvas);
    }
    .sc-brand {
      width: 174px;
      padding: 8px 12px;
    }
    nav {
      display: flex;
      gap: 4px;
    }
    button {
      font: inherit;
      font-size: 0.875rem;
      border: 0;
      background: transparent;
      color: var(--sc-color-text-muted);
      min-height: 44px;
      min-width: 44px;
      border-radius: var(--sc-radius-control);
      cursor: pointer;
    }
    button[aria-pressed='true'] {
      background: #ffffff0b;
      color: var(--sc-color-accent);
    }
    @media (max-width: 600px) {
      header {
        padding: 16px 20px;
      }
      .sc-brand {
        width: 144px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly language = inject(LanguageService);
}
