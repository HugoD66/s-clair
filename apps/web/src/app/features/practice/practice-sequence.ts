import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'sc-practice-sequence',
  imports: [TranslatePipe],
  templateUrl: './practice-sequence.html',
  styleUrl: './practice-sequence.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeSequence {
  readonly currentBeat = input<number | null>(null);
  // The approved first exercise, displayed without a timing engine.
  readonly beats = [true, true, false, true, true, false, true, false] as const;
}
