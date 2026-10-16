import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import fr from './fr.json';
import en from './en.json';
export type Language = 'fr' | 'en';
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  readonly current = signal<Language>('fr');
  constructor() {
    this.translate.setTranslation('fr', fr);
    this.translate.setTranslation('en', en);
    let saved: string | null = null;
    try {
      saved = this.document.defaultView?.localStorage.getItem('s-clair.language') ?? null;
    } catch {
      /* Storage can be unavailable. */
    }
    this.select(saved === 'en' ? 'en' : 'fr');
  }
  select(language: Language): void {
    this.current.set(language);
    this.document.documentElement.lang = language;
    this.translate.use(language).subscribe();
    try {
      this.document.defaultView?.localStorage.setItem('s-clair.language', language);
    } catch {
      /* The session can still change language. */
    }
  }
}
