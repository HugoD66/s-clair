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

export type HitVerdict = 'correct' | 'extra';

/** Stateless, input-independent evaluation; every hit and note can match only once. */
export function evaluate(
  exercise: Exercise,
  hits: readonly number[],
  elapsedMs: number,
): PracticeResult {
  const interval = 60_000 / exercise.bpm;
  const expected = exercise.beats.flatMap((hit, index) => (hit ? [index * interval] : []));
  const matched = new Set<number>();
  let extra = 0;
  for (const hit of [...hits].sort((a, b) => a - b)) {
    if (!Number.isFinite(hit) || hit > elapsedMs) continue;
    const note = expected.findIndex(
      (time, index) => !matched.has(index) && Math.abs(time - hit) <= exercise.toleranceMs,
    );
    if (note === -1) extra++;
    else matched.add(note);
  }
  return {
    correct: matched.size,
    missed: expected.filter(
      (time, index) => !matched.has(index) && elapsedMs > time + exercise.toleranceMs,
    ).length,
    extra,
  };
}
