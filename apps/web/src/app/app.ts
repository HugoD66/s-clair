import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { DemoRecordApi, errorKey } from './features/demo-records/demo-record-api';
import type { DemoRecord } from './features/demo-records/demo-record-api';
import { LanguageService } from './i18n/language.service';
@Component({
  selector: 'sc-root',
  imports: [TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly language = inject(LanguageService);
  private readonly api = inject(DemoRecordApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly record = signal<DemoRecord | null>(null);
  readonly error = signal<string | null>(null);
  readonly isLoading = signal(false);
  load(missing = false): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.record.set(null);
    const id = missing
      ? '00000000-0000-4000-8000-000000000002'
      : '00000000-0000-4000-8000-000000000001';
    this.api
      .read(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (record) => this.record.set(record),
        error: (error: unknown) => this.error.set(errorKey(error)),
      });
  }
}
