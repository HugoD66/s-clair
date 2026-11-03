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
import { PageLayout } from '../../shared/page-layout';
import { PAGE_LINKS } from '../../shared/page-links';
import { MicrophoneDiagnostic } from '../practice/microphone-diagnostic';

@Component({
  selector: 'sc-settings-page',
  imports: [TranslatePipe, PageLayout, MicrophoneDiagnostic],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  readonly links = PAGE_LINKS;
  private readonly document = inject(DOCUMENT);
  private readonly title = viewChild.required<ElementRef<HTMLHeadingElement>>('title');
  constructor() {
    afterNextRender(() => this.title().nativeElement.focus());
  }
  goHome(): void {
    this.document.location.href = this.links.home;
  }
}
