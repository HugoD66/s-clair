import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { errorKey } from './demo-record-api';
import fr from '../../i18n/fr.json';
import en from '../../i18n/en.json';
describe('error translations', () => {
  it('keeps a specific known API error', () => {
    expect(
      errorKey(new HttpErrorResponse({ status: 404, error: { code: 'demoRecordNotFound' } })),
    ).toBe('demoRecordNotFound');
  });
  it('uses a safe fallback for unknown, absent or malformed keys', () => {
    for (const error of [{ code: 'serverSecret' }, null, '<html>proxy error</html>', { code: 1 }]) {
      expect(errorKey(new HttpErrorResponse({ status: 500, error }))).toBe('unexpectedError');
    }
  });
  it('keeps both catalogues complete', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    for (const value of [...Object.values(fr), ...Object.values(en)])
      expect(value.trim()).not.toBe('');
  });
});
