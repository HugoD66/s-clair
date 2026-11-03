import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../shared/page-header';
import { MicrophoneDiagnostic } from '../practice/microphone-diagnostic';

@Component({
  selector: 'sc-settings-page',
  imports: [TranslatePipe, PageHeader, MicrophoneDiagnostic],
  template: `
    <sc-page-header />
    <main id="main" tabindex="-1">
      <a class="back" href="/">← {{ 'home.back' | translate }}</a>
      <h1 #title tabindex="-1">{{ 'home.settings' | translate }}</h1>
      <sc-microphone-diagnostic [focusOnOpen]="false" (closed)="goHome()" />
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100svh;
    }
    main {
      padding: 36px clamp(24px, 3vw, 40px);
      scroll-margin-top: 8rem;
    }
    h1 {
      overflow-wrap: anywhere;
      margin: 24px 0 0;
      font-size: var(--sc-font-size-title);
    }
    .back {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      color: var(--sc-color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly document = inject(DOCUMENT);
  private readonly title = viewChild.required<ElementRef<HTMLHeadingElement>>('title');
  constructor() {
    afterNextRender(() => this.title().nativeElement.focus());
  }
  goHome(): void {
    this.document.location.href = '/';
  }
}
