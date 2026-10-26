import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstExercise, type BeatOutcome } from './exercise';

@Component({
  selector: 'sc-practice-sequence',
  imports: [TranslatePipe],
  templateUrl: './practice-sequence.html',
  styleUrl: './practice-sequence.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeSequence {
  readonly currentBeat = input<number | null>(null);
  readonly outcomes = input<readonly BeatOutcome[]>([]);
  readonly beats = firstExercise.beats;
}
