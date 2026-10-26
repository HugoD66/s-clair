/** First approved exercise. Timing is expressed in milliseconds. */
export const firstExercise = {
  bpm: 60,
  countIn: 4,
  toleranceMs: 150,
  beats: [true, true, false, true, true, false, true, false],
} as const;

export interface Exercise {
  readonly bpm: number;
  readonly countIn: number;
  readonly toleranceMs: number;
  readonly beats: readonly boolean[];
}

export interface PracticeResult {
  readonly correct: number;
  readonly missed: number;
  readonly extra: number;
}

export interface BeatOutcome {
  readonly judgement: 'correct' | 'missed' | null;
  readonly extra: boolean;
}

export interface PracticeEvaluation {
  readonly result: PracticeResult;
  readonly beats: readonly BeatOutcome[];
}

/** Stateless, input-independent evaluation; every hit and note can match only once. */
export function evaluate(
  exercise: Exercise,
  hits: readonly number[],
  elapsedMs: number,
): PracticeResult {
  return evaluateDetails(exercise, hits, elapsedMs).result;
}

/** Exposes the same judgement per beat for presentation, without a second scoring rule. */
export function evaluateDetails(
  exercise: Exercise,
  hits: readonly number[],
  elapsedMs: number,
): PracticeEvaluation {
  const interval = 60_000 / exercise.bpm;
  const expected = exercise.beats.flatMap((hit, index) =>
    hit ? [{ time: index * interval, beat: index }] : [],
  );
  const beats: { judgement: BeatOutcome['judgement']; extra: boolean }[] = exercise.beats.map(
    () => ({ judgement: null, extra: false }),
  );
  const matched = new Set<number>();
  let extra = 0;
  for (const hit of [...hits].sort((a, b) => a - b)) {
    if (!Number.isFinite(hit) || hit > elapsedMs) continue;
    const note = expected.findIndex(
      ({ time }, index) => !matched.has(index) && Math.abs(time - hit) <= exercise.toleranceMs,
    );
    if (note === -1) {
      extra++;
      // An unmatched hit belongs visually to the beat in which it occurred.
      const beat = beats[Math.min(beats.length - 1, Math.max(0, Math.floor(hit / interval)))];
      if (beat) beat.extra = true;
    } else {
      matched.add(note);
    }
  }
  let missed = 0;
  expected.forEach(({ time, beat }, index) => {
    if (matched.has(index)) beats[beat]!.judgement = 'correct';
    else if (elapsedMs > time + exercise.toleranceMs) {
      beats[beat]!.judgement = 'missed';
      missed++;
    }
  });
  return { result: { correct: matched.size, missed, extra }, beats };
}
