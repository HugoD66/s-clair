import { provideHttpClient } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideTranslateService({ lang: 'fr', fallbackLang: 'fr' })],
};
