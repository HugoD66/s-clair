import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { PracticeResult } from './exercise';

@Component({
  selector: 'sc-practice-result',
  imports: [TranslatePipe],
  template: `
    <p>
      {{
        (result().missed === 0 && result().extra === 0
          ? 'practice.results.complete'
          : 'practice.results.encouragement'
        ) | translate
      }}
    </p>
    <dl>
      <div class="sc-panel perfect">
        <dt>{{ 'practice.results.perfect' | translate }}</dt>
        <dd>{{ result().perfect }}</dd>
      </div>
      <div class="sc-panel good">
        <dt>{{ 'practice.results.good' | translate }}</dt>
        <dd>{{ result().good }}</dd>
      </div>
      <div class="sc-panel missed">
        <dt>{{ 'practice.results.missed' | translate }}</dt>
        <dd>{{ result().missed }}</dd>
      </div>
      <div class="sc-panel missed">
        <dt>{{ 'practice.results.extra' | translate }}</dt>
        <dd>{{ result().extra }}</dd>
      </div>
    </dl>
  `,
  styles: `
    p {
      color: var(--sc-color-text-muted);
    }
    dl {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--sc-space-18);
      margin: var(--sc-space-26) 0;
    }
    dl > div {
      display: flex;
      flex-direction: column;
    }
    dt {
      color: var(--sc-color-text-muted);
    }
    dd {
      order: -1;
      margin: 0 0 var(--sc-space-6);
      font-size: var(--sc-font-size-title);
      font-weight: var(--sc-font-weight-title);
      font-variant-numeric: tabular-nums;
    }
    .perfect dd {
      color: var(--sc-color-feedback-success);
    }
    .good dd {
      color: var(--sc-color-feedback-good);
    }
    .missed dd {
      color: var(--sc-color-feedback-error);
    }
    @media (max-width: 60rem) {
      dl {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 37.5rem) {
      dl {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeResultPanel {
  readonly result = input.required<PracticeResult>();
}
